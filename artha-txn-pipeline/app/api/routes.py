import hashlib
import os
import uuid
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query, Body
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.models import (
    Job, JobStatus, Transaction, JobSummary,
    FinancialProfile, FinancialGoal, InvestmentHolding,
    KnowledgeDocument, KnowledgeChunk
)
from app.api.schemas import (
    JobOut, JobStatusOut, JobResultsOut, TransactionOut,
    FinancialProfileIn, FinancialProfileOut,
    FinancialGoalIn, FinancialGoalUpdate, FinancialGoalOut,
    InvestmentHoldingIn, InvestmentHoldingUpdate, InvestmentHoldingOut,
    KnowledgeChunkOut, KnowledgeDocumentOut
)
from app.workers.tasks import process_job
from app.services.financial_math import (
    calculate_monthly_surplus,
    calculate_emergency_fund_status,
    calculate_debt_burden,
    calculate_sip_projection,
    compute_financial_health_score,
)
from app.services.portfolio_math import calculate_portfolio_summary
from app.services.rag import search_knowledge_base, seed_knowledge_base_if_empty
from app.services.context_layer import build_financial_context
from app.services.llm import ask_artha_copilot

router = APIRouter()


# ─── 1. Central Financial Profile Endpoints ────────────────────────────────────
@router.get("/profile", response_model=FinancialProfileOut)
def get_profile(user_id: str = "default_user", db: Session = Depends(get_db)):
    profile = db.query(FinancialProfile).filter(FinancialProfile.user_id == user_id).first()
    if not profile:
        profile = FinancialProfile(
            user_id=user_id,
            monthly_salary=30000.0,
            essential_expenses=15000.0,
            discretionary_expenses=5000.0,
            rent=0.0,
            emi_obligations=0.0,
            current_savings=35000.0,
            emergency_fund=35000.0,
            risk_profile="moderate",
            investment_horizon="medium",
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.put("/profile", response_model=FinancialProfileOut)
def update_profile(profile_in: FinancialProfileIn, db: Session = Depends(get_db)):
    profile = db.query(FinancialProfile).filter(FinancialProfile.user_id == profile_in.user_id).first()
    if not profile:
        profile = FinancialProfile(user_id=profile_in.user_id)
        db.add(profile)

    for field, value in profile_in.model_dump().items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


# ─── 2. Financial Goals Endpoints ──────────────────────────────────────────────
@router.get("/goals", response_model=List[FinancialGoalOut])
def list_goals(user_id: str = "default_user", db: Session = Depends(get_db)):
    profile = db.query(FinancialProfile).filter(FinancialProfile.user_id == user_id).first()
    if not profile:
        return []
    return db.query(FinancialGoal).filter(FinancialGoal.profile_id == profile.id).order_by(FinancialGoal.created_at.desc()).all()


@router.post("/goals", response_model=FinancialGoalOut, status_code=201)
def create_goal(goal_in: FinancialGoalIn, user_id: str = "default_user", db: Session = Depends(get_db)):
    profile = db.query(FinancialProfile).filter(FinancialProfile.user_id == user_id).first()
    if not profile:
        profile = FinancialProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    goal = FinancialGoal(
        profile_id=profile.id,
        name=goal_in.name,
        target_amount=goal_in.target_amount,
        current_amount=goal_in.current_amount,
        target_date=goal_in.target_date,
        priority=goal_in.priority,
        category=goal_in.category,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.put("/goals/{goal_id}", response_model=FinancialGoalOut)
def update_goal(goal_id: str, goal_in: FinancialGoalUpdate, db: Session = Depends(get_db)):
    goal = db.get(FinancialGoal, goal_id)
    if not goal:
        raise HTTPException(404, detail="Goal not found")

    for field, value in goal_in.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)

    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: str, db: Session = Depends(get_db)):
    goal = db.get(FinancialGoal, goal_id)
    if not goal:
        raise HTTPException(404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    return {"status": "deleted", "goal_id": goal_id}


# ─── 3. Investment Portfolio Endpoints ─────────────────────────────────────────
@router.get("/portfolio/holdings", response_model=List[InvestmentHoldingOut])
def list_holdings(user_id: str = "default_user", db: Session = Depends(get_db)):
    profile = db.query(FinancialProfile).filter(FinancialProfile.user_id == user_id).first()
    if not profile:
        return []
    return db.query(InvestmentHolding).filter(InvestmentHolding.profile_id == profile.id).order_by(InvestmentHolding.created_at.desc()).all()


@router.post("/portfolio/holdings", response_model=InvestmentHoldingOut, status_code=201)
def add_holding(holding_in: InvestmentHoldingIn, user_id: str = "default_user", db: Session = Depends(get_db)):
    profile = db.query(FinancialProfile).filter(FinancialProfile.user_id == user_id).first()
    if not profile:
        profile = FinancialProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    holding = InvestmentHolding(
        profile_id=profile.id,
        asset_name=holding_in.asset_name,
        asset_type=holding_in.asset_type,
        amount_invested=holding_in.amount_invested,
        current_value=holding_in.current_value,
        quantity=holding_in.quantity,
        purchase_date=holding_in.purchase_date,
        notes=holding_in.notes,
    )
    db.add(holding)
    db.commit()
    db.refresh(holding)
    return holding


@router.put("/portfolio/holdings/{holding_id}", response_model=InvestmentHoldingOut)
def update_holding(holding_id: str, holding_in: InvestmentHoldingUpdate, db: Session = Depends(get_db)):
    holding = db.get(InvestmentHolding, holding_id)
    if not holding:
        raise HTTPException(404, detail="Holding not found")

    for field, value in holding_in.model_dump(exclude_unset=True).items():
        setattr(holding, field, value)

    db.commit()
    db.refresh(holding)
    return holding


@router.delete("/portfolio/holdings/{holding_id}")
def delete_holding(holding_id: str, db: Session = Depends(get_db)):
    holding = db.get(InvestmentHolding, holding_id)
    if not holding:
        raise HTTPException(404, detail="Holding not found")
    db.delete(holding)
    db.commit()
    return {"status": "deleted", "holding_id": holding_id}


@router.get("/portfolio/summary")
def get_portfolio_summary(user_id: str = "default_user", db: Session = Depends(get_db)):
    profile = db.query(FinancialProfile).filter(FinancialProfile.user_id == user_id).first()
    if not profile:
        return calculate_portfolio_summary([])
    holdings = db.query(InvestmentHolding).filter(InvestmentHolding.profile_id == profile.id).all()
    holdings_dicts = [
        {
            "id": h.id,
            "asset_name": h.asset_name,
            "asset_type": h.asset_type,
            "amount_invested": h.amount_invested,
            "current_value": h.current_value,
            "notes": h.notes,
        }
        for h in holdings
    ]
    return calculate_portfolio_summary(holdings_dicts)


# ─── 4. High-Level Financial Snapshot / Dashboard ─────────────────────────────
@router.get("/financial-summary")
def get_financial_summary(user_id: str = "default_user", db: Session = Depends(get_db)):
    ctx = build_financial_context(user_id, db)
    return {
        "profile": ctx["profile"],
        "calculations": ctx["deterministic_calculations"],
        "portfolio": ctx["portfolio"],
        "goals": ctx["goals"],
        "latest_transaction_summary": ctx["transactions"],
    }


# ─── 5. Transaction Pipeline Integration & Spending Insights ─────────────────
@router.post("/transactions/sync-to-profile")
def sync_transactions_to_profile(user_id: str = "default_user", db: Session = Depends(get_db)):
    """
    Integrates cleaned transaction data into the user's monthly financial profile.
    Extracts total spend and category weights to keep the profile grounded in actual bank records.
    """
    profile = db.query(FinancialProfile).filter(FinancialProfile.user_id == user_id).first()
    if not profile:
        profile = FinancialProfile(user_id=user_id)
        db.add(profile)
        db.flush()

    latest_job = db.query(Job).filter(Job.status == "completed").order_by(Job.completed_at.desc()).first()
    if not latest_job or not latest_job.summary:
        raise HTTPException(400, detail="No completed transaction jobs to sync from.")

    summary = latest_job.summary
    total_spend = summary.total_spend_inr
    categories = summary.category_breakdown or {}

    # Discretionary vs Essential heuristic based on cleaned categories
    essential_cats = ["Food", "Utilities", "Transport", "Housing", "Health"]
    essential_spend = sum(val for cat, val in categories.items() if any(ec.lower() in cat.lower() for ec in essential_cats))
    discretionary_spend = max(0.0, total_spend - essential_spend)

    if essential_spend > 0:
        profile.essential_expenses = round(essential_spend, 2)
    if discretionary_spend > 0:
        profile.discretionary_expenses = round(discretionary_spend, 2)

    db.commit()
    db.refresh(profile)

    return {
        "status": "synced",
        "synced_from_file": latest_job.filename,
        "total_spend_inr": total_spend,
        "updated_essential_expenses": profile.essential_expenses,
        "updated_discretionary_expenses": profile.discretionary_expenses,
    }


@router.get("/transactions/spending-insights")
def get_spending_insights(db: Session = Depends(get_db)):
    latest_job = db.query(Job).filter(Job.status == "completed").order_by(Job.completed_at.desc()).first()
    if not latest_job or not latest_job.summary:
        return {
            "has_data": False,
            "message": "Upload a CSV in Txn Pipeline to unlock automated spending insights.",
        }

    summary = latest_job.summary
    categories = summary.category_breakdown or {}
    sorted_cats = sorted(categories.items(), key=lambda x: x[1], reverse=True)
    top_cat = sorted_cats[0] if sorted_cats else ("None", 0.0)

    insights = []
    if top_cat[1] > 0:
        pct = (top_cat[1] / summary.total_spend_inr * 100.0) if summary.total_spend_inr > 0 else 0
        insights.append(f"Highest spending category: {top_cat[0]} (₹{top_cat[1]:,.0f}, {pct:.1f}% of total).")
    if summary.anomaly_count > 0:
        insights.append(f"Audit alert: {summary.anomaly_count} transactions flagged as potential anomalies or foreign currency charges.")

    return {
        "has_data": True,
        "job_id": latest_job.id,
        "filename": latest_job.filename,
        "total_spend_inr": summary.total_spend_inr,
        "total_spend_usd": summary.total_spend_usd,
        "top_category": {"name": top_cat[0], "amount": top_cat[1]},
        "top_merchants": summary.top_merchants,
        "anomaly_count": summary.anomaly_count,
        "category_breakdown": categories,
        "insights": insights,
        "narrative": summary.narrative,
    }


# ─── 6. Regulatory Knowledge RAG Search ───────────────────────────────────────
@router.post("/knowledge/search")
def search_knowledge(query: str = Body(..., embed=True), topic: Optional[str] = None, db: Session = Depends(get_db)):
    results = search_knowledge_base(query=query, db=db, topic=topic, top_k=5)
    return {"query": query, "results_count": len(results), "results": results}


# ─── 7. Contextual "Ask Artha" Co-pilot ───────────────────────────────────────
@router.post("/copilot/chat")
def chat_copilot(
    query: str = Body(..., embed=True),
    user_id: str = Body(default="default_user", embed=True),
    db: Session = Depends(get_db),
):
    """
    Ask Artha End-to-End Co-pilot:
    User Query -> Financial Context -> Deterministic Math -> RAG Regulatory Sources -> Gemini Explanation.
    """
    if not query.strip():
        raise HTTPException(400, detail="Query cannot be empty.")

    context = build_financial_context(user_id=user_id, db=db, user_query=query)
    response = ask_artha_copilot(query=query, context=context)

    return {
        "query": query,
        "answer": response.get("answer"),
        "sources": response.get("sources", []),
        "calculations_used": response.get("calculations_used", {}),
        "assumptions": response.get("assumptions", []),
        "context_snapshot": {
            "monthly_surplus": context["deterministic_calculations"]["surplus"]["net_surplus"],
            "health_score": context["deterministic_calculations"]["health_score"]["total_score"],
            "emergency_months": context["deterministic_calculations"]["emergency_fund"]["months_covered"],
            "portfolio_value": context["portfolio"]["current_value"],
        }
    }


# ─── 8. Demo Profile Seeder ───────────────────────────────────────────────────
@router.post("/demo/populate")
def populate_demo_data(user_id: str = "default_user", db: Session = Depends(get_db)):
    """
    Populates realistic, structured demo figures so the full platform is immediately demonstrable.
    """
    # 1. Profile
    profile = db.query(FinancialProfile).filter(FinancialProfile.user_id == user_id).first()
    if not profile:
        profile = FinancialProfile(user_id=user_id)
        db.add(profile)
        db.flush()

    profile.monthly_salary = 30000.0
    profile.other_income = 0.0
    profile.essential_expenses = 16000.0
    profile.discretionary_expenses = 6000.0
    profile.rent = 0.0
    profile.emi_obligations = 0.0
    profile.current_savings = 35000.0
    profile.emergency_fund = 35000.0
    profile.risk_profile = "moderate"
    profile.investment_horizon = "medium"
    profile.has_term_insurance = "lic_only"
    profile.term_cover_amount = 500000.0
    profile.has_health_insurance = "employer_only"
    profile.tax_regime_preference = "new"

    # 2. Goals
    db.query(FinancialGoal).filter(FinancialGoal.profile_id == profile.id).delete()
    g1 = FinancialGoal(
        profile_id=profile.id,
        name="Emergency Buffer (6 Months)",
        target_amount=132000.0,
        current_amount=35000.0,
        target_date="2027-06-30",
        priority="high",
        category="Emergency",
    )
    g2 = FinancialGoal(
        profile_id=profile.id,
        name="Higher Education / Upskilling",
        target_amount=200000.0,
        current_amount=40000.0,
        target_date="2028-12-31",
        priority="medium",
        category="Education",
    )
    db.add_all([g1, g2])

    # 3. Portfolio
    db.query(InvestmentHolding).filter(InvestmentHolding.profile_id == profile.id).delete()
    h1 = InvestmentHolding(
        profile_id=profile.id,
        asset_name="UTI Nifty 50 Index Fund Direct-Growth",
        asset_type="Mutual Funds",
        amount_invested=25000.0,
        current_value=28400.0,
        purchase_date="2025-01-15",
        notes="Core passive equity allocation (0.2% TER)",
    )
    h2 = InvestmentHolding(
        profile_id=profile.id,
        asset_name="Public Provident Fund (PPF)",
        asset_type="PPF",
        amount_invested=15000.0,
        current_value=15800.0,
        purchase_date="2024-04-10",
        notes="Government backed tax-free debt allocation (7.1% interest)",
    )
    h3 = InvestmentHolding(
        profile_id=profile.id,
        asset_name="Sovereign Gold Bond (SGB)",
        asset_type="Gold",
        amount_invested=5000.0,
        current_value=5900.0,
        purchase_date="2024-06-20",
        notes="Gold hedge with 2.5% semi-annual interest",
    )
    db.add_all([h1, h2, h3])

    # Seed Knowledge Base
    seed_knowledge_base_if_empty(db)

    db.commit()
    db.refresh(profile)

    return {
        "status": "success",
        "message": "Demo profile, goals, portfolio holdings, and regulatory knowledge base seeded successfully.",
        "user_id": user_id,
    }


# ─── 9. Transaction Pipeline Batch Endpoints (Preserved) ──────────────────────
@router.post("/jobs/upload", response_model=JobOut, status_code=201)
async def upload_job(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, detail="Only .csv files are accepted")

    os.makedirs(settings.upload_dir, exist_ok=True)
    contents = await file.read()
    if len(contents) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(400, detail=f"File exceeds {settings.max_upload_mb}MB limit")
    if len(contents) == 0:
        raise HTTPException(400, detail="Empty file")

    checksum = hashlib.sha256(contents).hexdigest()
    job_id = str(uuid.uuid4())
    file_path = os.path.join(settings.upload_dir, f"{job_id}.csv")
    with open(file_path, "wb") as f:
        f.write(contents)

    job = Job(id=job_id, filename=file.filename, file_checksum=checksum, status=JobStatus.pending)
    db.add(job)
    db.commit()
    db.refresh(job)

    process_job.delay(job_id, file_path)

    return job


@router.get("/jobs/{job_id}/status", response_model=JobStatusOut)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, detail="Job not found")
    summary = None
    if job.status == JobStatus.completed and job.summary:
        summary = {
            "total_spend_inr": job.summary.total_spend_inr,
            "total_spend_usd": job.summary.total_spend_usd,
            "anomaly_count": job.summary.anomaly_count,
            "risk_level": job.summary.risk_level,
            "top_merchants": job.summary.top_merchants,
        }
    return JobStatusOut(
        id=job.id,
        filename=job.filename,
        status=job.status.value,
        row_count_raw=job.row_count_raw,
        row_count_clean=job.row_count_clean,
        duplicate_count=job.duplicate_count,
        progress_pct=job.progress_pct,
        created_at=job.created_at,
        completed_at=job.completed_at,
        error_message=job.error_message,
        summary=summary,
    )


@router.get("/jobs/{job_id}/results", response_model=JobResultsOut)
def get_job_results(job_id: str, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, detail="Job not found")
    if job.status != JobStatus.completed:
        raise HTTPException(409, detail=f"Job is {job.status.value}, results not ready yet")

    txns = db.query(Transaction).filter(Transaction.job_id == job_id).all()
    anomalies = [t for t in txns if t.is_anomaly]

    summary_dict = None
    if job.summary:
        summary_dict = {
            "total_spend_inr": job.summary.total_spend_inr,
            "total_spend_usd": job.summary.total_spend_usd,
            "top_merchants": job.summary.top_merchants,
            "anomaly_count": job.summary.anomaly_count,
            "narrative": job.summary.narrative,
            "risk_level": job.summary.risk_level,
            "llm_calls_made": job.summary.llm_calls_made,
            "llm_calls_saved_by_cache": job.summary.llm_calls_saved_by_cache,
        }

    return JobResultsOut(
        job=JobOut.model_validate(job),
        transactions=[TransactionOut.model_validate(t) for t in txns],
        anomalies=[TransactionOut.model_validate(t) for t in anomalies],
        category_breakdown=job.summary.category_breakdown if job.summary else {},
        summary=summary_dict,
    )


@router.get("/jobs", response_model=list[JobOut])
def list_jobs(status: str | None = Query(default=None), db: Session = Depends(get_db)):
    q = db.query(Job)
    if status:
        try:
            status_enum = JobStatus(status)
        except ValueError:
            raise HTTPException(400, detail=f"Invalid status '{status}'")
        q = q.filter(Job.status == status_enum)
    return q.order_by(Job.created_at.desc()).all()
