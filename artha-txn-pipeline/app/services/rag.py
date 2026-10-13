"""
Lightweight Regulatory Knowledge Base & Retrieval-Augmented Generation (RAG) Engine for Artha.
Contains curated guidance from SEBI, RBI, Income Tax Department, AMFI, IRDAI, and PFRDA.
"""
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models import KnowledgeDocument, KnowledgeChunk

logger = logging.getLogger(__name__)

# ─── Curated Regulatory Knowledge Seed Data ──────────────────────────────────
REGULATORY_KNOWLEDGE_BASE = [
    {
        "source_name": "Income Tax Department",
        "title": "Income Tax Slabs & Deductions (FY 2025-26)",
        "topic": "taxation",
        "document_url": "https://incometaxindia.gov.in",
        "chunks": [
            {
                "keywords": "new regime tax slabs 2025 2026 standard deduction 75000 rebate 87a",
                "content": "New Tax Regime (FY 2025-26): Standard deduction for salaried individuals is ₹75,000. Income up to ₹3 Lakhs is nil tax. Slabs: ₹3L-₹7L (5%), ₹7L-₹10L (10%), ₹10L-₹12L (15%), ₹12L-₹15L (20%), above ₹15L (30%). With Section 87A rebate, salaried employees earning up to ₹7.75 Lakhs pay zero income tax under the New Regime.",
                "metadata": {"section": "New Tax Regime Slabs", "year": "2025-26"}
            },
            {
                "keywords": "old regime 80c 80d hra section 24b home loan standard deduction",
                "content": "Old Tax Regime: Allows deductions under Section 80C (up to ₹1.5 Lakhs for EPF, PPF, ELSS, life insurance), Section 80D (up to ₹25,000 for self/family health insurance, ₹50,000 for senior citizen parents), Section 24B (up to ₹2 Lakhs home loan interest), and HRA exemptions. Standard deduction under Old Regime is ₹50,000.",
                "metadata": {"section": "Old Tax Regime Deductions", "year": "2025-26"}
            },
            {
                "keywords": "capital gains ltcg stcg equity mutual funds budget 2024 taxation",
                "content": "Equity Capital Gains (Post-July 2024 Rules): Short-Term Capital Gains (STCG) on listed equity and equity mutual funds held under 12 months is taxed at 20%. Long-Term Capital Gains (LTCG) on holdings above 12 months is taxed at 12.5% on gains exceeding the ₹1.25 Lakh annual exemption limit.",
                "metadata": {"section": "Capital Gains Tax", "year": "2024-25"}
            }
        ]
    },
    {
        "source_name": "SEBI",
        "title": "SEBI Mutual Fund Categorization & Direct Plan Guidelines",
        "topic": "mutual_funds",
        "document_url": "https://sebi.gov.in",
        "chunks": [
            {
                "keywords": "direct plan regular plan expense ratio distributor commission sebi",
                "content": "Direct vs Regular Mutual Funds: SEBI mandates that direct plans have zero distributor commission, resulting in a lower Total Expense Ratio (TER) of 0.5% to 1.5% less per year compared to regular plans. Over 15 to 20 years, investing in Direct Plans can compound to 15% to 25% higher total wealth due to savings on ongoing agent commissions.",
                "metadata": {"section": "Direct vs Regular Plans", "authority": "SEBI"}
            },
            {
                "keywords": "large cap flexi cap mid cap index fund asset allocation sebi categorization",
                "content": "SEBI Mutual Fund Categorization: Large-cap funds must invest at least 80% in top 100 companies by market cap. Flexi-cap funds can dynamically invest across large, mid, and small-cap companies (min 65% in equity). Index funds replicate a benchmark like Nifty 50 with lower management costs and zero manager bias.",
                "metadata": {"section": "Equity Categories", "authority": "SEBI"}
            }
        ]
    },
    {
        "source_name": "Reserve Bank of India (RBI)",
        "title": "RBI Household Financial Prudence & Debt Advisory",
        "topic": "banking",
        "document_url": "https://rbi.org.in",
        "chunks": [
            {
                "keywords": "emergency fund savings buffer liquidity sweep account fd rbi",
                "content": "Emergency Fund & Liquid Buffers: RBI financial literacy frameworks recommend maintaining a minimum 3 to 6 months of mandatory living expenses (rent, utilities, food, loan EMIs) in highly liquid, capital-protected avenues such as bank sweep-in fixed deposits or liquid mutual funds to withstand unexpected income loss.",
                "metadata": {"section": "Emergency Liquidity", "authority": "RBI"}
            },
            {
                "keywords": "debt emi credit card personal loan debt to income ratio rbi",
                "content": "Debt Management & EMI Thresholds: Total monthly loan EMI obligations (personal loans, auto loans, credit cards, home loans) should strictly remain below 35% to 40% of net monthly take-home income. Unsecured credit card debt with annualized interest of 36% to 42% should be eliminated before commencing market investments.",
                "metadata": {"section": "Debt Burden Guidelines", "authority": "RBI"}
            }
        ]
    },
    {
        "source_name": "IRDAI",
        "title": "IRDAI Life and Health Insurance Protection Standards",
        "topic": "insurance",
        "document_url": "https://irdai.gov.in",
        "chunks": [
            {
                "keywords": "pure term life insurance sum assured endowment ulip commission irdai",
                "content": "Life Insurance Adequacy: IRDAI guidelines emphasize that primary income earners with financial dependants require a pure term life insurance cover equivalent to 10 to 15 times their gross annual income. Traditional endowment policies and ULIPs often bundle high upfront distribution costs (15-35% in Year 1) and offer low life cover relative to premium paid.",
                "metadata": {"section": "Term Insurance vs Endowment", "authority": "IRDAI"}
            },
            {
                "keywords": "health insurance super top up deductible cashless corporate cover irdai",
                "content": "Health Insurance Protection: Corporate group health insurance ceases immediately upon employment transition or termination. Individuals should maintain an independent base health policy (₹5L to ₹10L) paired with a high-deductible Super Top-Up policy for affordable high-sum protection against critical medical inflation.",
                "metadata": {"section": "Health Insurance Strategy", "authority": "IRDAI"}
            }
        ]
    },
    {
        "source_name": "PFRDA",
        "title": "PFRDA National Pension System (NPS) Architecture",
        "topic": "retirement",
        "document_url": "https://pfrda.org.in",
        "chunks": [
            {
                "keywords": "nps tier 1 tier 2 80ccd 1b extra 50000 deduction retirement annuity pfrda",
                "content": "National Pension System (NPS): Tier-1 is a retirement account offering an exclusive tax deduction of up to ₹50,000 under Section 80CCD(1B), over and above the ₹1.5 Lakh 80C limit. At age 60, up to 60% of the accumulated corpus can be withdrawn tax-free, while remaining 40% is annuitized to provide a monthly pension.",
                "metadata": {"section": "NPS Tax Benefits", "authority": "PFRDA"}
            }
        ]
    },
    {
        "source_name": "AMFI",
        "title": "AMFI Systematic Investment Plan (SIP) & Compounding Principles",
        "topic": "mutual_funds",
        "document_url": "https://amfiindia.com",
        "chunks": [
            {
                "keywords": "sip rupee cost averaging compounding long term wealth creation amfi",
                "content": "Systematic Investment Plan (SIP) Principles: SIP enforces rupee cost averaging by automatically buying more mutual fund units when markets correct and fewer units when markets rise. Compounding demonstrates that starting early with ₹5,000/month generates higher wealth over 20 years than starting with ₹15,000/month after a 10-year delay.",
                "metadata": {"section": "SIP Wealth Principles", "authority": "AMFI"}
            }
        ]
    }
]


def seed_knowledge_base_if_empty(db: Session):
    """Seed the database with authoritative regulatory knowledge if empty."""
    doc_count = db.query(KnowledgeDocument).count()
    if doc_count > 0:
        return

    logger.info("Seeding regulatory knowledge base into PostgreSQL...")
    for doc_data in REGULATORY_KNOWLEDGE_BASE:
        doc = KnowledgeDocument(
            source_name=doc_data["source_name"],
            title=doc_data["title"],
            topic=doc_data["topic"],
            document_url=doc_data.get("document_url"),
        )
        db.add(doc)
        db.flush()

        for chunk_data in doc_data["chunks"]:
            chunk = KnowledgeChunk(
                document_id=doc.id,
                content=chunk_data["content"],
                keywords=chunk_data.get("keywords", ""),
                metadata_info=chunk_data.get("metadata", {}),
            )
            db.add(chunk)

    db.commit()
    logger.info("Seeded regulatory knowledge chunks successfully.")


def search_knowledge_base(
    query: str,
    db: Session,
    topic: Optional[str] = None,
    top_k: int = 3,
) -> List[Dict[str, Any]]:
    """
    Deterministic text/keyword scoring search across regulatory chunks.
    Ranks chunks by keyword hit density against the user query.
    """
    seed_knowledge_base_if_empty(db)

    query_tokens = [w.lower().strip() for w in query.split() if len(w) > 2]
    if not query_tokens:
        return []

    q = db.query(KnowledgeChunk).join(KnowledgeDocument)
    if topic:
        q = q.filter(KnowledgeDocument.topic == topic)

    all_chunks = q.all()
    scored_results = []

    for chunk in all_chunks:
        doc = chunk.document
        searchable_text = f"{chunk.content} {chunk.keywords or ''} {doc.title} {doc.source_name}".lower()
        score = 0

        for token in query_tokens:
            if token in searchable_text:
                score += searchable_text.count(token) * 2
                if chunk.keywords and token in chunk.keywords.lower():
                    score += 3

        if score > 0:
            scored_results.append({
                "score": score,
                "content": chunk.content,
                "source": doc.source_name,
                "title": doc.title,
                "url": doc.document_url,
                "topic": doc.topic,
                "metadata": chunk.metadata_info or {},
            })

    scored_results.sort(key=lambda x: x["score"], reverse=True)
    return scored_results[:top_k]
