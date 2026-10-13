import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey,
    Text, Enum, JSON, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.db import Base


def gen_uuid():
    return str(uuid.uuid4())


class JobStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    filename = Column(String, nullable=False)
    file_checksum = Column(String, index=True, nullable=True)
    status = Column(Enum(JobStatus), default=JobStatus.pending, nullable=False, index=True)
    row_count_raw = Column(Integer, default=0)
    row_count_clean = Column(Integer, default=0)
    duplicate_count = Column(Integer, default=0)
    progress_pct = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    transactions = relationship("Transaction", back_populates="job", cascade="all, delete-orphan")
    summary = relationship("JobSummary", back_populates="job", uselist=False, cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (UniqueConstraint("job_id", "row_hash", name="uq_job_row_hash"),)

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    job_id = Column(UUID(as_uuid=False), ForeignKey("jobs.id"), nullable=False, index=True)
    row_hash = Column(String, nullable=False, index=True)

    txn_id = Column(String, nullable=True)
    date = Column(String, nullable=True)  # ISO 8601 string after cleaning
    merchant = Column(String, nullable=True)
    amount = Column(Float, nullable=True)
    currency = Column(String, nullable=True)
    status = Column(String, nullable=True)
    category = Column(String, nullable=True)
    account_id = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    is_anomaly = Column(Boolean, default=False)
    anomaly_reason = Column(Text, nullable=True)

    llm_category = Column(String, nullable=True)
    llm_confidence = Column(Float, nullable=True)
    llm_raw_response = Column(Text, nullable=True)
    llm_failed = Column(Boolean, default=False)
    llm_from_cache = Column(Boolean, default=False)

    job = relationship("Job", back_populates="transactions")


class JobSummary(Base):
    __tablename__ = "job_summaries"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    job_id = Column(UUID(as_uuid=False), ForeignKey("jobs.id"), nullable=False, unique=True)

    total_spend_inr = Column(Float, default=0)
    total_spend_usd = Column(Float, default=0)
    top_merchants = Column(JSON, default=list)
    category_breakdown = Column(JSON, default=dict)
    anomaly_count = Column(Integer, default=0)
    narrative = Column(Text, nullable=True)
    risk_level = Column(String, nullable=True)
    llm_calls_made = Column(Integer, default=0)
    llm_calls_saved_by_cache = Column(Integer, default=0)

    job = relationship("Job", back_populates="summary")


class MerchantCategoryCache(Base):
    """
    Differentiator: a persistent merchant -> category cache, shared ACROSS jobs.
    Most submissions will batch LLM calls per-job but still re-classify the
    same merchant (e.g. 'Swiggy') every single upload. This table means the
    LLM is only ever asked once per unique merchant, system-wide, which is
    the actual cost/latency bottleneck at scale (see README "Bottlenecks").
    """
    __tablename__ = "merchant_category_cache"

    merchant_normalized = Column(String, primary_key=True)
    category = Column(String, nullable=False)
    confidence = Column(Float, default=0.0)
    hit_count = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FinancialProfile(Base):
    """
    Central user financial profile storing income, expenses, savings,
    risk preferences, and insurance coverages.
    """
    __tablename__ = "financial_profiles"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(String, default="default_user", unique=True, index=True)

    monthly_salary = Column(Float, default=0.0)
    other_income = Column(Float, default=0.0)
    essential_expenses = Column(Float, default=0.0)
    discretionary_expenses = Column(Float, default=0.0)
    rent = Column(Float, default=0.0)
    emi_obligations = Column(Float, default=0.0)
    current_savings = Column(Float, default=0.0)
    emergency_fund = Column(Float, default=0.0)

    # Risk & Horizon
    risk_profile = Column(String, default="moderate")  # low | moderate | high
    investment_horizon = Column(String, default="medium")  # short | medium | long

    # Protections & Tax
    has_term_insurance = Column(String, default="no")  # no | yes_adequate | lic_only
    term_cover_amount = Column(Float, default=0.0)
    has_health_insurance = Column(String, default="none")  # none | employer_only | personal | both
    tax_regime_preference = Column(String, default="new")  # old | new

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    goals = relationship("FinancialGoal", back_populates="profile", cascade="all, delete-orphan")
    holdings = relationship("InvestmentHolding", back_populates="profile", cascade="all, delete-orphan")


class FinancialGoal(Base):
    """
    Financial goals with target amount, target date, and priority.
    """
    __tablename__ = "financial_goals"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    profile_id = Column(UUID(as_uuid=False), ForeignKey("financial_profiles.id"), nullable=True, index=True)

    name = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)
    target_date = Column(String, nullable=True)  # YYYY-MM or YYYY-MM-DD
    priority = Column(String, default="medium")  # high | medium | low
    category = Column(String, nullable=True)     # Emergency, Home, Education, Retirement, Travel, etc.

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    profile = relationship("FinancialProfile", back_populates="goals")


class InvestmentHolding(Base):
    """
    Investment holdings across Stocks, Mutual Funds, ETFs, PPF, NPS, Gold, Cash, etc.
    """
    __tablename__ = "investment_holdings"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    profile_id = Column(UUID(as_uuid=False), ForeignKey("financial_profiles.id"), nullable=True, index=True)

    asset_name = Column(String, nullable=False)
    asset_type = Column(String, nullable=False)  # Equity, Mutual Funds, ETFs, PPF, NPS, Gold, Debt, Cash/FD, Other
    amount_invested = Column(Float, nullable=False)
    current_value = Column(Float, nullable=False)
    quantity = Column(Float, nullable=True)
    purchase_date = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    profile = relationship("FinancialProfile", back_populates="holdings")


class KnowledgeDocument(Base):
    """
    Curated knowledge base document from authoritative Indian regulators (SEBI, RBI, Tax Dept, etc.).
    """
    __tablename__ = "knowledge_documents"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    source_name = Column(String, nullable=False)  # SEBI, RBI, Income Tax Department, AMFI, IRDAI, PFRDA
    title = Column(String, nullable=False)
    document_url = Column(String, nullable=True)
    topic = Column(String, nullable=False)  # mutual_funds, taxation, banking, retirement, insurance

    created_at = Column(DateTime, default=datetime.utcnow)

    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")


class KnowledgeChunk(Base):
    """
    Text chunks extracted from regulatory knowledge documents for lightweight RAG retrieval.
    """
    __tablename__ = "knowledge_chunks"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    document_id = Column(UUID(as_uuid=False), ForeignKey("knowledge_documents.id"), nullable=False, index=True)

    content = Column(Text, nullable=False)
    keywords = Column(Text, nullable=True)  # Space or comma-separated keywords for deterministic ranking
    metadata_info = Column(JSON, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("KnowledgeDocument", back_populates="chunks")
