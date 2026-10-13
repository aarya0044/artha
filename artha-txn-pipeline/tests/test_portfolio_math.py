import pytest
from app.services.portfolio_math import calculate_portfolio_summary


def test_portfolio_summary_calculations():
    holdings = [
        {"asset_name": "UTI Nifty 50 Index Fund", "asset_type": "Mutual Funds", "amount_invested": 25000.0, "current_value": 30000.0},
        {"asset_name": "PPF", "asset_type": "PPF", "amount_invested": 15000.0, "current_value": 16000.0},
        {"asset_name": "Sovereign Gold Bond", "asset_type": "Gold", "amount_invested": 10000.0, "current_value": 12000.0},
    ]

    summary = calculate_portfolio_summary(holdings)
    assert summary["total_invested"] == 50000.0
    assert summary["current_value"] == 58000.0
    assert summary["total_gain_loss"] == 8000.0
    assert summary["return_pct"] == 16.0
    assert "Mutual Funds" in summary["asset_allocation"]
    assert "PPF" in summary["asset_allocation"]
    assert "Gold" in summary["asset_allocation"]
    assert len(summary["insights"]) > 0


def test_empty_portfolio():
    summary = calculate_portfolio_summary([])
    assert summary["total_invested"] == 0.0
    assert summary["current_value"] == 0.0
    assert summary["holdings_count"] == 0
