"""
Central Financial Context Layer for Artha.
Aggregates Profile, Goals, Holdings, Transaction history, Deterministic Math, and RAG Chunks.
"""
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models import FinancialProfile, FinancialGoal, InvestmentHolding, Job, Transaction, JobSummary
from app.services.financial_math import (
    calculate_monthly_surplus,
    calculate_emergency_fund_status,
    calculate_debt_burden,
    calculate_sip_projection,
    compute_financial_health_score,
)
from app.services.portfolio_math import calculate_portfolio_summary
from app.services.rag import search_knowledge_base


def build_financial_context(
    user_id: str,
    db: Session,
    user_query: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Gathers all user financial data, executes deterministic calculations,
    retrieves relevant regulatory sources, and produces a unified FinancialContext payload.
    """
    profile = db.query(FinancialProfile).filter(FinancialProfile.user_id == user_id).first()
    if not profile:
        # Create default initial profile if absent
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

    # 1. Profile Data
    profile_dict = {
        "monthly_salary": profile.monthly_salary,
        "other_income": profile.other_income,
        "essential_expenses": profile.essential_expenses,
        "discretionary_expenses": profile.discretionary_expenses,
        "rent": profile.rent,
        "emi_obligations": profile.emi_obligations,
        "current_savings": profile.current_savings,
        "emergency_fund": profile.emergency_fund,
        "risk_profile": profile.risk_profile,
        "investment_horizon": profile.investment_horizon,
        "has_term_insurance": profile.has_term_insurance,
        "term_cover_amount": profile.term_cover_amount,
        "has_health_insurance": profile.has_health_insurance,
        "tax_regime_preference": profile.tax_regime_preference,
    }

    # 2. Goals
    goals = db.query(FinancialGoal).filter(FinancialGoal.profile_id == profile.id).all()
    goals_list = [
        {
            "id": g.id,
            "name": g.name,
            "target_amount": g.target_amount,
            "current_amount": g.current_amount,
            "target_date": g.target_date,
            "priority": g.priority,
            "category": g.category,
            "progress_pct": round((g.current_amount / g.target_amount * 100.0), 1) if g.target_amount > 0 else 0.0,
        }
        for g in goals
    ]

    # 3. Portfolio Holdings & Deterministic Math
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
    portfolio_summary = calculate_portfolio_summary(holdings_dicts)

    # 4. Latest Transactions & Spending Aggregation
    latest_job = db.query(Job).filter(Job.status == "completed").order_by(Job.completed_at.desc()).first()
    transaction_summary = {}
    if latest_job and latest_job.summary:
        transaction_summary = {
            "latest_file": latest_job.filename,
            "total_spend_inr": latest_job.summary.total_spend_inr,
            "total_spend_usd": latest_job.summary.total_spend_usd,
            "category_breakdown": latest_job.summary.category_breakdown or {},
            "top_merchants": latest_job.summary.top_merchants or [],
            "anomaly_count": latest_job.summary.anomaly_count,
            "narrative": latest_job.summary.narrative,
        }

    # 5. Deterministic Math Metrics
    surplus_calc = calculate_monthly_surplus(
        monthly_salary=profile.monthly_salary,
        other_income=profile.other_income,
        essential_expenses=profile.essential_expenses,
        discretionary_expenses=profile.discretionary_expenses,
        rent=profile.rent,
        emi_obligations=profile.emi_obligations,
    )
    ef_calc = calculate_emergency_fund_status(
        current_emergency_fund=profile.emergency_fund or profile.current_savings,
        monthly_expenses=(profile.essential_expenses + profile.discretionary_expenses + profile.rent + profile.emi_obligations),
    )
    debt_calc = calculate_debt_burden(
        total_emi=profile.emi_obligations,
        total_monthly_income=(profile.monthly_salary + profile.other_income),
    )
    health_score_calc = compute_financial_health_score(profile_dict, portfolio_summary)

    # Sample standard 10-year SIP projection based on available surplus
    sip_projection = calculate_sip_projection(
        monthly_investment=max(0.0, surplus_calc["net_surplus"] * 0.6),  # 60% of surplus allocated
        tenure_years=10,
        assumed_annual_cagr_pct=12.0,
    )

    # 6. RAG Knowledge Chunks (if query provided)
    rag_sources = []
    if user_query:
        rag_sources = search_knowledge_base(user_query, db, top_k=3)

    return {
        "user_id": user_id,
        "profile": profile_dict,
        "deterministic_calculations": {
            "surplus": surplus_calc,
            "emergency_fund": ef_calc,
            "debt_burden": debt_calc,
            "health_score": health_score_calc,
            "sip_projection_10yr": sip_projection,
        },
        "portfolio": portfolio_summary,
        "goals": goals_list,
        "transactions": transaction_summary,
        "regulatory_sources": rag_sources,
    }
