"""
Pure Python deterministic financial calculation engine for Artha.
No LLMs are used for math to ensure 100% accuracy, reproducibility, and auditability.
"""
from typing import Dict, Any, List, Optional
import math


def calculate_monthly_surplus(
    monthly_salary: float,
    other_income: float = 0.0,
    essential_expenses: float = 0.0,
    discretionary_expenses: float = 0.0,
    rent: float = 0.0,
    emi_obligations: float = 0.0,
) -> Dict[str, float]:
    """Calculate total monthly inflow, outflow, and net investable surplus."""
    total_inflow = float(monthly_salary + other_income)
    total_outflow = float(essential_expenses + discretionary_expenses + rent + emi_obligations)
    net_surplus = float(total_inflow - total_outflow)
    savings_rate = (net_surplus / total_inflow * 100.0) if total_inflow > 0 else 0.0

    return {
        "total_inflow": round(total_inflow, 2),
        "total_outflow": round(total_outflow, 2),
        "net_surplus": round(net_surplus, 2),
        "savings_rate_pct": round(savings_rate, 2),
    }


def calculate_emergency_fund_status(
    current_emergency_fund: float,
    monthly_expenses: float,
    target_months: int = 6,
) -> Dict[str, Any]:
    """Evaluate emergency buffer coverage against 6-month standard."""
    target_fund = float(monthly_expenses * target_months)
    months_covered = (current_emergency_fund / monthly_expenses) if monthly_expenses > 0 else 0.0
    gap = max(0.0, target_fund - current_emergency_fund)
    status = "adequate" if months_covered >= target_months else "moderate" if months_covered >= 3 else "critical"

    return {
        "current_fund": round(current_emergency_fund, 2),
        "target_fund": round(target_fund, 2),
        "months_covered": round(months_covered, 1),
        "target_months": target_months,
        "gap": round(gap, 2),
        "status": status,
    }


def calculate_debt_burden(
    total_emi: float,
    total_monthly_income: float,
) -> Dict[str, Any]:
    """Calculate debt-to-income (DTI) ratio based on monthly income."""
    dti_ratio = (total_emi / total_monthly_income * 100.0) if total_monthly_income > 0 else 0.0
    status = "safe" if dti_ratio <= 30.0 else "moderate" if dti_ratio <= 45.0 else "high_risk"

    return {
        "total_emi": round(total_emi, 2),
        "dti_ratio_pct": round(dti_ratio, 2),
        "status": status,
    }


def calculate_sip_projection(
    monthly_investment: float,
    tenure_years: int = 10,
    assumed_annual_cagr_pct: float = 12.0,
) -> Dict[str, Any]:
    """
    Project future value of a Systematic Investment Plan (SIP) using standard monthly compounding.
    Explicitly tags the assumed return rate as an assumption, not a guaranteed return.
    Formula: FV = P * [ ( (1 + i)^n - 1 ) / i ] * (1 + i)
    """
    if monthly_investment <= 0 or tenure_years <= 0:
        return {
            "monthly_investment": monthly_investment,
            "tenure_years": tenure_years,
            "total_invested": 0.0,
            "estimated_future_value": 0.0,
            "estimated_wealth_gain": 0.0,
            "assumption_text": f"Assumed {assumed_annual_cagr_pct}% annual CAGR (educational scenario, not guaranteed)",
        }

    monthly_rate = (assumed_annual_cagr_pct / 100.0) / 12.0
    total_months = tenure_years * 12

    fv = monthly_investment * (((math.pow(1.0 + monthly_rate, total_months) - 1.0) / monthly_rate) * (1.0 + monthly_rate))
    total_invested = monthly_investment * total_months
    wealth_gain = max(0.0, fv - total_invested)

    return {
        "monthly_investment": round(monthly_investment, 2),
        "tenure_years": tenure_years,
        "total_invested": round(total_invested, 2),
        "estimated_future_value": round(fv, 2),
        "estimated_wealth_gain": round(wealth_gain, 2),
        "assumed_annual_cagr_pct": assumed_annual_cagr_pct,
        "assumption_text": f"Assumes {assumed_annual_cagr_pct}% annualized return compounded monthly over {tenure_years} years. Actual market returns will fluctuate.",
    }


def calculate_goal_required_sip(
    target_amount: float,
    current_amount: float = 0.0,
    target_months: int = 36,
    assumed_annual_cagr_pct: float = 10.0,
) -> Dict[str, Any]:
    """Calculate the required monthly SIP to bridge a goal shortfall."""
    shortfall = max(0.0, target_amount - current_amount)
    if shortfall <= 0 or target_months <= 0:
        return {
            "target_amount": target_amount,
            "current_amount": current_amount,
            "shortfall": 0.0,
            "required_monthly_sip": 0.0,
            "target_months": target_months,
            "assumption_text": "Goal already achieved or invalid timeline",
        }

    monthly_rate = (assumed_annual_cagr_pct / 100.0) / 12.0
    # PMT formula for future value of annuity
    if monthly_rate > 0:
        compound_factor = ((math.pow(1.0 + monthly_rate, target_months) - 1.0) / monthly_rate) * (1.0 + monthly_rate)
        required_sip = shortfall / compound_factor
    else:
        required_sip = shortfall / target_months

    return {
        "target_amount": round(target_amount, 2),
        "current_amount": round(current_amount, 2),
        "shortfall": round(shortfall, 2),
        "required_monthly_sip": round(required_sip, 2),
        "target_months": target_months,
        "assumed_annual_cagr_pct": assumed_annual_cagr_pct,
        "assumption_text": f"Calculated under an assumed {assumed_annual_cagr_pct}% CAGR over {target_months} months.",
    }


def compute_financial_health_score(
    profile: Dict[str, Any],
    portfolio_summary: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Transparent, deterministic 100-point Financial Health Score based on 5 pillars:
    1. Savings Surplus (25 pts): Savings rate >= 30% -> 25pts, >= 20% -> 18pts, >= 10% -> 10pts, else 4pts.
    2. Emergency Fund (25 pts): >= 6 months -> 25pts, >= 3 months -> 15pts, else 5pts.
    3. Debt Burden (20 pts): EMI <= 20% -> 20pts, <= 40% -> 12pts, else 4pts.
    4. Protection Level (15 pts): Term + Health insurance adequacy.
    5. Investment Footprint (15 pts): Active portfolio allocation / goals tracking.
    """
    salary = float(profile.get("monthly_salary", 0) + profile.get("other_income", 0))
    expenses = float(
        profile.get("essential_expenses", 0)
        + profile.get("discretionary_expenses", 0)
        + profile.get("rent", 0)
    )
    emi = float(profile.get("emi_obligations", 0))
    savings = float(profile.get("current_savings", 0))
    emergency_fund = float(profile.get("emergency_fund", 0) or savings)
    term_cover = float(profile.get("term_cover_amount", 0))
    has_term = profile.get("has_term_insurance", "no")
    has_health = profile.get("has_health_insurance", "none")

    # 1. Savings Rate Score
    surplus_calc = calculate_monthly_surplus(salary, essential_expenses=expenses, emi_obligations=emi)
    sr = surplus_calc["savings_rate_pct"]
    if sr >= 30.0:
        savings_score = 25
        savings_verdict = "Excellent"
    elif sr >= 20.0:
        savings_score = 18
        savings_verdict = "Good"
    elif sr >= 10.0:
        savings_score = 10
        savings_verdict = "Fair"
    else:
        savings_score = 4
        savings_verdict = "Needs Attention"

    # 2. Emergency Fund Score
    ef_calc = calculate_emergency_fund_status(emergency_fund, expenses + emi)
    ef_months = ef_calc["months_covered"]
    if ef_months >= 6.0:
        ef_score = 25
        ef_verdict = "Adequate (6+ months)"
    elif ef_months >= 3.0:
        ef_score = 15
        ef_verdict = "Moderate (3-5 months)"
    else:
        ef_score = 5
        ef_verdict = "Critical (< 3 months)"

    # 3. Debt Burden Score
    dti_calc = calculate_debt_burden(emi, salary)
    dti = dti_calc["dti_ratio_pct"]
    if dti <= 20.0:
        debt_score = 20
        debt_verdict = "Low / Safe"
    elif dti <= 40.0:
        debt_score = 12
        debt_verdict = "Moderate"
    else:
        debt_score = 4
        debt_verdict = "High EMI Burden"

    # 4. Protection Score (Term + Health)
    protection_score = 0
    annual_income = salary * 12.0
    term_ratio = (term_cover / annual_income) if annual_income > 0 else 0.0
    if has_term == "yes_adequate" or term_ratio >= 10.0:
        protection_score += 8
        term_verdict = "Adequate pure term cover (10x+ income)"
    elif term_cover > 0:
        protection_score += 4
        term_verdict = "Partial term cover"
    else:
        term_verdict = "No pure term insurance"

    if has_health in ["personal", "both"]:
        protection_score += 7
        health_verdict = "Independent personal health insurance"
    elif has_health == "employer_only":
        protection_score += 4
        health_verdict = "Corporate-only health cover (at risk if switching jobs)"
    else:
        health_verdict = "No health cover"

    # 5. Investment Score
    investments_val = portfolio_summary.get("current_value", 0.0) if portfolio_summary else 0.0
    if investments_val >= (annual_income * 0.5) and annual_income > 0:
        investment_score = 15
        inv_verdict = "Strong wealth accumulation"
    elif investments_val > 0:
        investment_score = 10
        inv_verdict = "Active investments"
    else:
        investment_score = 3
        inv_verdict = "No active investments yet"

    total_score = savings_score + ef_score + debt_score + protection_score + investment_score

    # Checklists
    action_items = []
    if ef_months < 6.0:
        action_items.append({
            "priority": "critical" if ef_months < 3.0 else "warning",
            "title": "Build 6-Month Emergency Buffer",
            "detail": f"Target ₹{ef_calc['target_fund']:,.0f} in a liquid mutual fund or sweep FD. Current gap: ₹{ef_calc['gap']:,.0f}."
        })
    if has_term not in ["yes_adequate"] and term_ratio < 10.0:
        action_items.append({
            "priority": "critical",
            "title": "Secure Pure Term Life Cover",
            "detail": f"Obtain a pure term cover of at least ₹{annual_income * 10:,.0f} (10x annual income) to protect dependants."
        })
    if has_health in ["none", "employer_only"]:
        action_items.append({
            "priority": "warning",
            "title": "Get Personal Health Insurance",
            "detail": "Do not rely exclusively on employer insurance. Get a dedicated ₹5L-10L base or super top-up policy."
        })
    if dti > 35.0:
        action_items.append({
            "priority": "critical",
            "title": "Reduce High-Cost Debt",
            "detail": f"EMIs consume {dti:.1f}% of your monthly income. Prioritize paying down loans with interest > 10%."
        })
    if sr >= 20.0:
        action_items.append({
            "priority": "passed",
            "title": "Healthy Monthly Surplus",
            "detail": f"You save ₹{surplus_calc['net_surplus']:,.0f}/month ({sr:.1f}% savings rate). Channel this into disciplined index fund SIPs."
        })

    return {
        "total_score": total_score,
        "rating": "Excellent" if total_score >= 80 else "Good" if total_score >= 60 else "Moderate" if total_score >= 40 else "Needs Urgent Attention",
        "pillars": {
            "savings_surplus": {"score": savings_score, "max": 25, "verdict": savings_verdict},
            "emergency_fund": {"score": ef_score, "max": 25, "verdict": ef_verdict},
            "debt_burden": {"score": debt_score, "max": 20, "verdict": debt_verdict},
            "protection": {"score": protection_score, "max": 15, "term": term_verdict, "health": health_verdict},
            "investments": {"score": investment_score, "max": 15, "verdict": inv_verdict},
        },
        "action_items": action_items,
    }
