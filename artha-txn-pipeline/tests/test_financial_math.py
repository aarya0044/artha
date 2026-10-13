import pytest
from app.services.financial_math import (
    calculate_monthly_surplus,
    calculate_emergency_fund_status,
    calculate_debt_burden,
    calculate_sip_projection,
    calculate_goal_required_sip,
    compute_financial_health_score,
)


def test_monthly_surplus():
    res = calculate_monthly_surplus(
        monthly_salary=30000.0,
        other_income=5000.0,
        essential_expenses=15000.0,
        discretionary_expenses=5000.0,
        rent=0.0,
        emi_obligations=2000.0,
    )
    assert res["total_inflow"] == 35000.0
    assert res["total_outflow"] == 22000.0
    assert res["net_surplus"] == 13000.0
    assert res["savings_rate_pct"] == pytest.approx(37.14, 0.1)


def test_emergency_fund_status():
    res = calculate_emergency_fund_status(current_emergency_fund=35000.0, monthly_expenses=20000.0, target_months=6)
    assert res["current_fund"] == 35000.0
    assert res["target_fund"] == 120000.0
    assert res["months_covered"] == 1.8
    assert res["gap"] == 85000.0
    assert res["status"] == "critical"


def test_debt_burden():
    res = calculate_debt_burden(total_emi=6000.0, total_monthly_income=30000.0)
    assert res["dti_ratio_pct"] == 20.0
    assert res["status"] == "safe"

    risky = calculate_debt_burden(total_emi=15000.0, total_monthly_income=30000.0)
    assert risky["dti_ratio_pct"] == 50.0
    assert risky["status"] == "high_risk"


def test_sip_projection_assumptions():
    res = calculate_sip_projection(monthly_investment=5000.0, tenure_years=10, assumed_annual_cagr_pct=12.0)
    assert res["total_invested"] == 600000.0
    assert res["estimated_future_value"] > 1100000.0
    assert "Assumes 12.0% annualized return" in res["assumption_text"]


def test_financial_health_score():
    profile = {
        "monthly_salary": 30000.0,
        "essential_expenses": 14000.0,
        "discretionary_expenses": 4000.0,
        "current_savings": 50000.0,
        "emergency_fund": 50000.0,
        "emi_obligations": 0.0,
        "term_cover_amount": 3600000.0,
        "has_term_insurance": "yes_adequate",
        "has_health_insurance": "personal",
    }
    score_res = compute_financial_health_score(profile)
    assert score_res["total_score"] >= 60
    assert "savings_surplus" in score_res["pillars"]
    assert "emergency_fund" in score_res["pillars"]
