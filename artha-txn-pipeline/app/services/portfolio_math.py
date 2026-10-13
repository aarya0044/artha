"""
Deterministic Portfolio Math Engine and Market Data Service Adapter for Artha.
Calculates invested totals, current valuation, returns, asset allocation, and concentration risks.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime


class MarketDataService:
    """
    Adapter interface for fetching market prices.
    Designed so live NSE/BSE/AMFI APIs can be plugged in later without rewriting the app.
    Defaults to manual entries or deterministic mock feeds.
    """

    @staticmethod
    def get_latest_price(asset_name: str, asset_type: str, fallback_price: float) -> Dict[str, Any]:
        return {
            "asset_name": asset_name,
            "asset_type": asset_type,
            "price": fallback_price,
            "source": "Manual / Demo Provider",
            "as_of": datetime.utcnow().isoformat(),
            "is_live_market_data": False,
        }


def calculate_portfolio_summary(holdings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes deterministic portfolio metrics:
    - Total invested amount
    - Current market value
    - Absolute gain / loss (₹)
    - Percentage return (%)
    - Asset allocation breakdown (% per asset class)
    - Concentration analysis (flagging holdings > 30% of total portfolio)
    - Objective observations / insights
    """
    if not holdings:
        return {
            "total_invested": 0.0,
            "current_value": 0.0,
            "total_gain_loss": 0.0,
            "return_pct": 0.0,
            "holdings_count": 0,
            "asset_allocation": {},
            "concentration_risks": [],
            "insights": ["No investment holdings recorded. Add your stocks, mutual funds, PPF, or gold to track your wealth."],
        }

    total_invested = 0.0
    current_value = 0.0
    allocation_map: Dict[str, float] = {}
    enriched_holdings = []

    for h in holdings:
        inv = float(h.get("amount_invested", 0.0))
        cur = float(h.get("current_value", inv))
        asset_type = str(h.get("asset_type", "Other")).strip()
        asset_name = str(h.get("asset_name", "Unknown")).strip()

        gain_loss = cur - inv
        ret_pct = ((cur - inv) / inv * 100.0) if inv > 0 else 0.0

        total_invested += inv
        current_value += cur
        allocation_map[asset_type] = allocation_map.get(asset_type, 0.0) + cur

        enriched_holdings.append({
            "id": h.get("id"),
            "asset_name": asset_name,
            "asset_type": asset_type,
            "amount_invested": round(inv, 2),
            "current_value": round(cur, 2),
            "gain_loss": round(gain_loss, 2),
            "return_pct": round(ret_pct, 2),
            "notes": h.get("notes"),
        })

    total_gain_loss = current_value - total_invested
    total_return_pct = (total_gain_loss / total_invested * 100.0) if total_invested > 0 else 0.0

    # Calculate percentage allocation per asset category
    asset_allocation: Dict[str, Dict[str, Any]] = {}
    for cat, val in allocation_map.items():
        pct = (val / current_value * 100.0) if current_value > 0 else 0.0
        asset_allocation[cat] = {
            "value": round(val, 2),
            "percentage": round(pct, 1),
        }

    # Concentration check: flag any single holding > 30% of total portfolio value
    concentration_risks = []
    insights = []

    for eh in enriched_holdings:
        weight = (eh["current_value"] / current_value * 100.0) if current_value > 0 else 0.0
        eh["portfolio_weight_pct"] = round(weight, 1)
        if weight > 30.0 and len(enriched_holdings) > 1:
            concentration_risks.append({
                "asset_name": eh["asset_name"],
                "weight_pct": round(weight, 1),
                "warning": f"Concentration alert: '{eh['asset_name']}' represents {weight:.1f}% of your total portfolio.",
            })

    # Generate explainable factual insights
    equity_weight = sum(
        asset_allocation.get(cat, {}).get("percentage", 0.0)
        for cat in ["Equity", "Mutual Funds", "ETFs", "Stocks"]
    )
    debt_weight = sum(
        asset_allocation.get(cat, {}).get("percentage", 0.0)
        for cat in ["Debt", "PPF", "NPS", "Cash/FD", "Bonds"]
    )

    if total_gain_loss >= 0:
        insights.append(f"Your portfolio is in profit by ₹{total_gain_loss:,.0f} (+{total_return_pct:.1f}% overall return).")
    else:
        insights.append(f"Your portfolio is down by ₹{abs(total_gain_loss):,.0f} ({total_return_pct:.1f}% return).")

    if equity_weight > 70.0:
        insights.append(f"High growth tilt: {equity_weight:.1f}% allocated to equity-oriented assets. Ensure you have a 5+ year investment horizon.")
    elif equity_weight < 30.0 and debt_weight > 50.0:
        insights.append(f"Conservative tilt: {debt_weight:.1f}% allocated to fixed income / debt. Low volatility, but may lag long-term inflation.")

    if concentration_risks:
        insights.append(concentration_risks[0]["warning"])

    return {
        "total_invested": round(total_invested, 2),
        "current_value": round(current_value, 2),
        "total_gain_loss": round(total_gain_loss, 2),
        "return_pct": round(total_return_pct, 2),
        "holdings_count": len(enriched_holdings),
        "asset_allocation": asset_allocation,
        "concentration_risks": concentration_risks,
        "insights": insights,
        "holdings": enriched_holdings,
    }
