from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class JobOut(BaseModel):
    id: str
    filename: str
    status: str
    row_count_raw: int
    row_count_clean: int
    duplicate_count: int
    progress_pct: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class JobStatusOut(JobOut):
    summary: Optional[Dict[str, Any]] = None


class TransactionOut(BaseModel):
    txn_id: Optional[str]
    date: Optional[str]
    merchant: Optional[str]
    amount: Optional[float]
    currency: Optional[str]
    status: Optional[str]
    category: Optional[str]
    account_id: Optional[str]
    notes: Optional[str]
    is_anomaly: bool
    anomaly_reason: Optional[str]
    llm_category: Optional[str]
    llm_failed: bool
    llm_from_cache: bool

    class Config:
        from_attributes = True


class JobResultsOut(BaseModel):
    job: JobOut
    transactions: List[TransactionOut]
    anomalies: List[TransactionOut]
    category_breakdown: Dict[str, float]
    summary: Optional[Dict[str, Any]] = None


# ─── Financial Profile & Goals Schemas ─────────────────────────────────────────
class FinancialGoalIn(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0.0
    target_date: Optional[str] = None
    priority: str = "medium"
    category: Optional[str] = None


class FinancialGoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None


class FinancialGoalOut(FinancialGoalIn):
    id: str
    profile_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FinancialProfileIn(BaseModel):
    user_id: str = "default_user"
    monthly_salary: float = 0.0
    other_income: float = 0.0
    essential_expenses: float = 0.0
    discretionary_expenses: float = 0.0
    rent: float = 0.0
    emi_obligations: float = 0.0
    current_savings: float = 0.0
    emergency_fund: float = 0.0
    risk_profile: str = "moderate"
    investment_horizon: str = "medium"
    has_term_insurance: str = "no"
    term_cover_amount: float = 0.0
    has_health_insurance: str = "none"
    tax_regime_preference: str = "new"


class FinancialProfileOut(FinancialProfileIn):
    id: str
    created_at: datetime
    updated_at: datetime
    goals: List[FinancialGoalOut] = []

    class Config:
        from_attributes = True


# ─── Investment Holdings Schemas ──────────────────────────────────────────────
class InvestmentHoldingIn(BaseModel):
    asset_name: str
    asset_type: str  # Equity, Mutual Funds, ETFs, PPF, NPS, Gold, Debt, Cash/FD, Other
    amount_invested: float
    current_value: float
    quantity: Optional[float] = None
    purchase_date: Optional[str] = None
    notes: Optional[str] = None


class InvestmentHoldingUpdate(BaseModel):
    asset_name: Optional[str] = None
    asset_type: Optional[str] = None
    amount_invested: Optional[float] = None
    current_value: Optional[float] = None
    quantity: Optional[float] = None
    purchase_date: Optional[str] = None
    notes: Optional[str] = None


class InvestmentHoldingOut(InvestmentHoldingIn):
    id: str
    profile_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Knowledge RAG Schemas ────────────────────────────────────────────────────
class KnowledgeChunkOut(BaseModel):
    id: str
    document_id: str
    content: str
    keywords: Optional[str] = None
    metadata_info: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class KnowledgeDocumentOut(BaseModel):
    id: str
    source_name: str
    title: str
    document_url: Optional[str] = None
    topic: str
    created_at: datetime
    chunks: List[KnowledgeChunkOut] = []

    class Config:
        from_attributes = True

