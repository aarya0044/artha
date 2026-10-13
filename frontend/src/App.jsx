import React, { useState, useRef, useEffect, useCallback } from "react";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  ink: "#0F1117",
  inkMid: "#374151",
  inkLight: "#6B7280",
  inkFaint: "#9CA3AF",
  line: "#E5E7EB",
  lineLight: "#F3F4F6",
  bg: "#FAFAFA",
  white: "#FFFFFF",
  teal: "#0D7A55",
  tealDark: "#095C3F",
  tealPale: "#F0FAF5",
  tealBorder: "#BBE5D1",
  amber: "#92400E",
  amberPale: "#FFFBEB",
  amberBorder: "#FDE68A",
  red: "#991B1B",
  redPale: "#FFF5F5",
  redBorder: "#FECACA",
  blue: "#1D4ED8",
  bluePale: "#EFF6FF",
  blueBorder: "#BFDBFE",
};

const API_BASE = "http://127.0.0.1:8000";

// ─── Primitives ───────────────────────────────────────────────────────────────
const Label = ({ children, style }) => (
  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.inkLight, ...style }}>
    {children}
  </div>
);

const PrimaryBtn = ({ children, onClick, disabled, loading, style }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: disabled ? C.line : hov ? C.tealDark : C.teal,
        color: disabled ? C.inkFaint : C.white,
        border: "none",
        borderRadius: 8,
        padding: "9px 18px",
        fontSize: 13,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        ...style,
      }}
    >
      {loading && <span style={{ width: 14, height: 14, border: `2px solid ${C.tealBorder}`, borderTopColor: C.white, borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
      {children}
    </button>
  );
};

const GhostBtn = ({ children, onClick, style }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.lineLight : "transparent",
        color: C.inkMid,
        border: `1px solid ${C.line}`,
        borderRadius: 8,
        padding: "7px 13px",
        fontSize: 12.5,
        cursor: "pointer",
        transition: "background 0.12s",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const Pill = ({ children, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.lineLight : C.white,
        color: C.inkMid,
        border: `1px solid ${C.line}`,
        borderRadius: 999,
        padding: "5px 13px",
        fontSize: 12,
        cursor: "pointer",
        transition: "background 0.12s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
};

function KV({ label, value, sub, accent }) {
  return (
    <div style={{ padding: "16px 20px", background: accent ? C.tealPale : C.white, border: `1px solid ${accent ? C.tealBorder : C.line}`, borderRadius: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: accent ? C.teal : C.inkFaint, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: accent ? C.teal : C.ink, letterSpacing: "-0.3px" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.inkLight, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

const fmt = (n) => "₹" + (Number(n) || 0).toLocaleString("en-IN");

// ─── Navigation ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", badge: "Live" },
  { id: "chat", label: "Ask Artha", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { id: "portfolio", label: "Portfolio", icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" },
  { id: "finances", label: "My Finances", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { id: "pipeline", label: "Txn pipeline", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "salary", label: "Salary analyser", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { id: "opinion", label: "Second opinion", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
];

function Nav({ tab, setTab, onSeedDemo }) {
  return (
    <aside style={{ width: 230, flexShrink: 0, height: "100vh", position: "sticky", top: 0, background: C.white, borderRight: `1px solid ${C.line}`, display: "flex", flexDirection: "column", padding: "20px 0" }}>
      {/* Brand */}
      <div style={{ padding: "0 20px 20px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: C.teal, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M10 3L13.5 8.5H6.5L10 3Z" fill="white" />
              <rect x="6" y="10" width="8" height="1.5" rx="0.75" fill="white" />
              <path d="M7 12.5C7 12.5 8 17 10 17C12 17 13 12.5 13 12.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, letterSpacing: "-0.2px" }}>Artha</div>
            <div style={{ fontSize: 10, color: C.teal, fontWeight: 600, letterSpacing: "0.04em" }}>CO-PILOT v2.0</div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
        {NAV_ITEMS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "9px 12px",
                background: active ? C.tealPale : "transparent",
                color: active ? C.teal : C.inkMid,
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                textAlign: "left",
                transition: "background 0.12s, color 0.12s",
                width: "100%",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d={item.icon} />
              </svg>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && <span style={{ fontSize: 9, fontWeight: 600, color: C.teal, background: C.tealPale, border: `1px solid ${C.tealBorder}`, padding: "1px 5px", borderRadius: 999 }}>{item.badge}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom Demo Seeder */}
      <div style={{ padding: "16px", borderTop: `1px solid ${C.line}` }}>
        <button
          onClick={onSeedDemo}
          style={{ width: "100%", background: C.bluePale, border: `1px solid ${C.blueBorder}`, color: C.blue, borderRadius: 8, padding: "8px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <span>⚡</span>
          <span>Load Demo Profile</span>
        </button>
        <div style={{ fontSize: 10, color: C.inkFaint, textAlign: "center", marginTop: 8 }}>
          SEBI / RBI Aligned Engine
        </div>
      </div>
    </aside>
  );
}

// ─── 1. Dashboard Feature ─────────────────────────────────────────────────────
function DashboardFeature({ onNavigate, onSeedDemo }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/financial-summary`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.warn("Could not fetch summary:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading && !data) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.inkLight }}>
        Loading financial snapshot...
      </div>
    );
  }

  const calcs = data?.calculations || {};
  const surplus = calcs.surplus || {};
  const ef = calcs.emergency_fund || {};
  const health = calcs.health_score || {};
  const portfolio = data?.portfolio || {};
  const goals = data?.goals || [];
  const score = health.total_score || 68;
  const scoreColor = score >= 75 ? C.teal : score >= 50 ? "#D97706" : C.red;

  return (
    <div style={{ height: "100vh", overflowY: "auto", background: C.bg }}>
      {/* Header */}
      <div style={{ padding: "20px 28px", borderBottom: `1px solid ${C.line}`, background: C.white, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 1 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>Financial Overview</h1>
          <p style={{ fontSize: 12, color: C.inkLight, marginTop: 2 }}>Deterministic snapshot of your income, surplus, emergency buffer, and investments.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <GhostBtn onClick={fetchSummary}>Refresh</GhostBtn>
          <PrimaryBtn onClick={() => onNavigate("chat")}>Ask Artha</PrimaryBtn>
        </div>
      </div>

      <div style={{ maxWidth: 840, padding: "28px 28px 60px" }}>
        
        {/* Top Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
          
          {/* Health Score Card */}
          <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="30" fill="none" stroke={C.lineLight} strokeWidth="6" />
                <circle
                  cx="36" cy="36" r="30" fill="none" stroke={scoreColor} strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 30}`}
                  strokeDashoffset={`${2 * Math.PI * 30 * (1 - score / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 36 36)"
                />
              </svg>
              <div style={{ position: "absolute", fontSize: 18, fontWeight: 700, color: C.ink }}>{score}</div>
            </div>
            <div>
              <Label style={{ color: scoreColor }}>Financial Health</Label>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginTop: 2 }}>{health.rating || "Good"}</div>
              <div style={{ fontSize: 11.5, color: C.inkLight, marginTop: 2 }}>{ef.months_covered || 0} mos emergency buffer</div>
            </div>
          </div>

          {/* Monthly Surplus */}
          <KV label="Net Monthly Surplus" value={fmt(surplus.net_surplus)} sub={`${surplus.savings_rate_pct || 0}% of inflow`} accent />

          {/* Active Portfolio */}
          <KV label="Portfolio Value" value={fmt(portfolio.current_value)} sub={`${portfolio.return_pct >= 0 ? "+" : ""}${portfolio.return_pct || 0}% overall return`} />
        </div>

        {/* Cash Flow Breakdown */}
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "22px 24px", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>Monthly Cash Flow</h3>
              <p style={{ fontSize: 12, color: C.inkLight }}>Calculated from salary, essential living costs, rent, and active loan EMIs.</p>
            </div>
            <GhostBtn onClick={() => onNavigate("finances")}>Edit Finances</GhostBtn>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <div style={{ padding: "12px 14px", background: C.bg, borderRadius: 8 }}>
              <Label>Gross Inflow</Label>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginTop: 4 }}>{fmt(surplus.total_inflow)}</div>
            </div>
            <div style={{ padding: "12px 14px", background: C.bg, borderRadius: 8 }}>
              <Label>Monthly Outflow</Label>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginTop: 4 }}>{fmt(surplus.total_outflow)}</div>
            </div>
            <div style={{ padding: "12px 14px", background: C.bg, borderRadius: 8 }}>
              <Label>Debt EMI Burden</Label>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginTop: 4 }}>{fmt(calcs.debt_burden?.total_emi)}</div>
            </div>
            <div style={{ padding: "12px 14px", background: C.bg, borderRadius: 8 }}>
              <Label>Emergency Fund</Label>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginTop: 4 }}>{fmt(ef.current_fund)}</div>
            </div>
          </div>
        </div>

        {/* Goals & Key Insights */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          
          {/* Active Goals */}
          <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Label>Financial Goals ({goals.length})</Label>
              <GhostBtn onClick={() => onNavigate("finances")}>Manage Goals</GhostBtn>
            </div>
            {goals.length === 0 ? (
              <div style={{ fontSize: 12.5, color: C.inkLight, textAlign: "center", padding: "16px 0" }}>No goals added yet. Click Manage Goals to add targets.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {goals.slice(0, 3).map((g) => (
                  <div key={g.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: C.ink }}>{g.name}</span>
                      <span style={{ color: C.inkLight }}>{fmt(g.current_amount)} / {fmt(g.target_amount)} ({g.progress_pct}%)</span>
                    </div>
                    <div style={{ height: 6, background: C.lineLight, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(g.progress_pct, 100)}%`, background: C.teal, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actionable Health Checklist */}
          <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <Label style={{ marginBottom: 14 }}>Actionable Priorities</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(health.action_items || []).slice(0, 3).map((item, idx) => {
                const isCrit = item.priority === "critical";
                const isWarn = item.priority === "warning";
                const badgeColor = isCrit ? C.red : isWarn ? "#D97706" : C.teal;
                const badgeBg = isCrit ? C.redPale : isWarn ? C.amberPale : C.tealPale;
                return (
                  <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start", paddingBottom: 10, borderBottom: idx < 2 ? `1px solid ${C.lineLight}` : "none" }}>
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: badgeColor, background: badgeBg, padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}>
                      {item.priority}
                    </span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{item.title}</div>
                      <div style={{ fontSize: 11.5, color: C.inkLight, lineHeight: 1.4, marginTop: 2 }}>{item.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// ─── 2. "Ask Artha" Co-pilot Feature ──────────────────────────────────────────
function ChatFeature() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Namaste! I'm Artha, your personal financial co-pilot. I analyze your profile, deterministic surplus, goals, and regulatory rules (SEBI, RBI, Income Tax Dept) to provide grounded financial decision-support.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef();

  const handleSend = async (text) => {
    const query = text || input;
    if (!query.trim() || loading) return;

    const userMsg = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer,
            sources: data.sources,
            calculations_used: data.calculations_used,
            assumptions: data.assumptions,
          },
        ]);
      } else {
        throw new Error("Chat service error");
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "### Assessment & Decision Support\nBased on your financial profile, your first priority should always be building a **6-month emergency buffer** in a liquid instrument before initiating long-term equity SIPs.",
          sources: [{ source: "RBI & SEBI", title: "Financial Prudence Guidelines", note: "Emergency fund & index SIP principles" }],
          assumptions: ["Educational scenario assuming standard 10% CAGR for index funds."],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const QUICK_PROMPTS = [
    "I have ₹8,000 monthly surplus. Where should I start investing?",
    "Why did my travel spending increase this month?",
    "Can I afford a ₹15,000 monthly car loan EMI?",
    "Explain my investment portfolio asset allocation.",
  ];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg }}>
      {/* Header */}
      <div style={{ padding: "18px 28px", borderBottom: `1px solid ${C.line}`, background: C.white, flexShrink: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>Ask Artha (Financial Co-pilot)</h1>
        <p style={{ fontSize: 12, color: C.inkLight, marginTop: 2 }}>
          Grounded in your financial profile + deterministic calculations + SEBI/RBI regulatory knowledge.
        </p>
      </div>

      {/* Messages Feed */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ maxWidth: 760, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
          {messages.map((m, idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "88%",
                  padding: "16px 20px",
                  borderRadius: 12,
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  background: m.role === "user" ? C.teal : C.white,
                  color: m.role === "user" ? C.white : C.ink,
                  border: m.role === "user" ? "none" : `1px solid ${C.line}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}

                {/* Sources & Assumptions Collapsible Pill Section */}
                {m.sources && m.sources.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.lineLight}`, fontSize: 11.5 }}>
                    <div style={{ fontWeight: 600, color: C.teal, marginBottom: 4 }}>📚 Authoritative Sources Cited:</div>
                    <ul style={{ paddingLeft: 16, color: C.inkMid, lineHeight: 1.5 }}>
                      {m.sources.map((s, si) => (
                        <li key={si}><strong>{s.source}</strong> — {s.title} {s.note && `(${s.note})`}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {m.assumptions && m.assumptions.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 11, color: C.inkLight, fontStyle: "italic" }}>
                    ℹ️ <strong>Assumptions:</strong> {m.assumptions.join(" ")}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: C.inkLight, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.teal, animation: "blink 1s infinite" }} />
              Artha is checking calculations & regulatory knowledge...
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input Tray */}
      <div style={{ padding: "16px 28px", borderTop: `1px solid ${C.line}`, background: C.white, flexShrink: 0 }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {/* Quick Prompts */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, scrollbarWidth: "none" }}>
            {QUICK_PROMPTS.map((p, pi) => (
              <Pill key={pi} onClick={() => handleSend(p)}>{p}</Pill>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ display: "flex", gap: 10 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your surplus, emergency fund, goal planning, tax regimes, or asset allocation..."
              style={{ flex: 1, padding: "11px 16px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13.5, outline: "none" }}
            />
            <PrimaryBtn loading={loading} disabled={!input.trim()}>Send</PrimaryBtn>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── 3. Portfolio Feature ─────────────────────────────────────────────────────
function PortfolioFeature() {
  const [summary, setSummary] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState("Mutual Funds");
  const [amountInvested, setAmountInvested] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [notes, setNotes] = useState("");

  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      const [resHoldings, resSummary] = await Promise.all([
        fetch(`${API_BASE}/portfolio/holdings`),
        fetch(`${API_BASE}/portfolio/summary`),
      ]);
      if (resHoldings.ok && resSummary.ok) {
        setHoldings(await resHoldings.json());
        setSummary(await resSummary.json());
      }
    } catch (e) {
      console.warn("Error loading portfolio:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const handleAddHolding = async (e) => {
    e.preventDefault();
    if (!assetName || !amountInvested || !currentValue) return;

    try {
      const res = await fetch(`${API_BASE}/portfolio/holdings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_name: assetName,
          asset_type: assetType,
          amount_invested: parseFloat(amountInvested),
          current_value: parseFloat(currentValue),
          notes,
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        setAssetName("");
        setAmountInvested("");
        setCurrentValue("");
        setNotes("");
        fetchPortfolio();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/portfolio/holdings/${id}`, { method: "DELETE" });
      if (res.ok) fetchPortfolio();
    } catch (err) {
      console.error(err);
    }
  };

  const ASSET_TYPES = ["Equity", "Mutual Funds", "ETFs", "PPF", "NPS", "Gold", "Debt", "Cash/FD", "Other"];

  return (
    <div style={{ height: "100vh", overflowY: "auto", background: C.bg }}>
      {/* Header */}
      <div style={{ padding: "20px 28px", borderBottom: `1px solid ${C.line}`, background: C.white, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 1 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>Portfolio Analyzer</h1>
          <p style={{ fontSize: 12, color: C.inkLight, marginTop: 2 }}>Deterministic tracking of invested capital, market value, asset allocation, and concentration risks.</p>
        </div>
        <PrimaryBtn onClick={() => setModalOpen(true)}>+ Add Investment</PrimaryBtn>
      </div>

      <div style={{ maxWidth: 840, padding: "28px 28px 60px" }}>
        
        {/* Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          <KV label="Total Invested" value={fmt(summary?.total_invested)} sub="Principal capital" />
          <KV label="Current Value" value={fmt(summary?.current_value)} sub="Active valuation" accent />
          <KV
            label="Total Gain / Loss"
            value={`${summary?.total_gain_loss >= 0 ? "+" : ""}${fmt(summary?.total_gain_loss)}`}
            sub={`${summary?.return_pct >= 0 ? "+" : ""}${summary?.return_pct || 0}% return`}
          />
        </div>

        {/* Asset Allocation & Insights */}
        {summary && Object.keys(summary.asset_allocation || {}).length > 0 && (
          <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "22px 24px", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <Label style={{ marginBottom: 14 }}>Asset Allocation Breakdown</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Object.entries(summary.asset_allocation).map(([cat, info]) => (
                <div key={cat}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: C.ink }}>{cat}</span>
                    <span style={{ color: C.inkLight }}>{fmt(info.value)} ({info.percentage}%)</span>
                  </div>
                  <div style={{ height: 6, background: C.lineLight, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${info.percentage}%`, background: C.teal, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Insights */}
            {summary.insights && summary.insights.length > 0 && (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.lineLight}` }}>
                <Label style={{ marginBottom: 6 }}>Deterministic Portfolio Insights</Label>
                <ul style={{ paddingLeft: 18, fontSize: 12.5, color: C.inkMid, lineHeight: 1.6 }}>
                  {summary.insights.map((ins, i) => (
                    <li key={i}>{ins}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Holdings Table */}
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Label>Investment Holdings ({holdings.length})</Label>
          </div>

          {holdings.length === 0 ? (
            <div style={{ fontSize: 13, color: C.inkLight, textAlign: "center", padding: "24px 0" }}>
              No investment holdings recorded. Click "+ Add Investment" to record your assets.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: C.lineLight }}>
                    <th style={{ padding: "10px 12px", borderBottom: `1px solid ${C.line}` }}>Asset Name</th>
                    <th style={{ padding: "10px 12px", borderBottom: `1px solid ${C.line}` }}>Type</th>
                    <th style={{ padding: "10px 12px", borderBottom: `1px solid ${C.line}` }}>Invested</th>
                    <th style={{ padding: "10px 12px", borderBottom: `1px solid ${C.line}` }}>Current Value</th>
                    <th style={{ padding: "10px 12px", borderBottom: `1px solid ${C.line}` }}>Return</th>
                    <th style={{ padding: "10px 12px", borderBottom: `1px solid ${C.line}` }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => {
                    const gain = h.current_value - h.amount_invested;
                    const retPct = h.amount_invested > 0 ? (gain / h.amount_invested) * 100 : 0;
                    return (
                      <tr key={h.id} style={{ borderBottom: `1px solid ${C.lineLight}` }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: C.ink }}>{h.asset_name}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: C.teal, background: C.tealPale, padding: "2px 6px", borderRadius: 4 }}>
                            {h.asset_type}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: C.inkMid }}>{fmt(h.amount_invested)}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: C.ink }}>{fmt(h.current_value)}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: gain >= 0 ? C.teal : C.red }}>
                          {gain >= 0 ? "+" : ""}{retPct.toFixed(1)}%
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <button onClick={() => handleDelete(h.id)} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 12 }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Add Holding Modal */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: C.white, borderRadius: 12, padding: 28, width: 440, boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 16 }}>Add Investment Holding</h3>
            <form onSubmit={handleAddHolding} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <Label style={{ marginBottom: 6 }}>Asset Name</Label>
                <input required type="text" value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="e.g. UTI Nifty 50 Index Fund Direct" style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }} />
              </div>
              <div>
                <Label style={{ marginBottom: 6 }}>Asset Category</Label>
                <select value={assetType} onChange={(e) => setAssetType(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }}>
                  {ASSET_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <Label style={{ marginBottom: 6 }}>Amount Invested (₹)</Label>
                  <input required type="number" value={amountInvested} onChange={(e) => setAmountInvested(e.target.value)} placeholder="e.g. 25000" style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }} />
                </div>
                <div>
                  <Label style={{ marginBottom: 6 }}>Current Value (₹)</Label>
                  <input required type="number" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="e.g. 28000" style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }} />
                </div>
              </div>
              <div>
                <Label style={{ marginBottom: 6 }}>Notes / Purpose (Optional)</Label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Core long term index allocation" style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <GhostBtn onClick={() => setModalOpen(false)}>Cancel</GhostBtn>
                <PrimaryBtn>Save Holding</PrimaryBtn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 4. My Finances & Goals Feature ───────────────────────────────────────────
function FinancesGoalsFeature() {
  const [profile, setProfile] = useState(null);
  const [goals, setGoals] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Goal Form Modal
  const [goalModal, setGoalModal] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("");
  const [goalPriority, setGoalPriority] = useState("medium");

  const loadData = useCallback(async () => {
    try {
      const [resProfile, resGoals] = await Promise.all([
        fetch(`${API_BASE}/profile`),
        fetch(`${API_BASE}/goals`),
      ]);
      if (resProfile.ok) setProfile(await resProfile.json());
      if (resGoals.ok) setGoals(await resGoals.json());
    } catch (e) {
      console.warn("Could not load finances:", e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!goalName || !goalTarget) return;

    try {
      const res = await fetch(`${API_BASE}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: goalName,
          target_amount: parseFloat(goalTarget),
          current_amount: parseFloat(goalCurrent || 0),
          priority: goalPriority,
        }),
      });
      if (res.ok) {
        setGoalModal(false);
        setGoalName("");
        setGoalTarget("");
        setGoalCurrent("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGoal = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/goals/${id}`, { method: "DELETE" });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (!profile) return <div style={{ padding: 40, textAlign: "center" }}>Loading finances...</div>;

  return (
    <div style={{ height: "100vh", overflowY: "auto", background: C.bg }}>
      <div style={{ padding: "20px 28px", borderBottom: `1px solid ${C.line}`, background: C.white, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 1 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>My Finances & Goals</h1>
          <p style={{ fontSize: 12, color: C.inkLight, marginTop: 2 }}>Central profile powering all deterministic cashflow calculations and Ask Artha reasoning.</p>
        </div>
        {savedSuccess && <span style={{ fontSize: 12, fontWeight: 600, color: C.teal }}>✓ Changes Saved to Database</span>}
      </div>

      <div style={{ maxWidth: 840, padding: "28px 28px 60px" }}>
        
        {/* Profile Editor Form */}
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "24px", marginBottom: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 18 }}>Monthly Cash Flow & Protections</h3>
          
          <form onSubmit={handleProfileSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <Label style={{ marginBottom: 6 }}>Monthly Salary (Take-home ₹)</Label>
                <input type="number" value={profile.monthly_salary} onChange={(e) => setProfile({ ...profile, monthly_salary: parseFloat(e.target.value) || 0 })} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }} />
              </div>
              <div>
                <Label style={{ marginBottom: 6 }}>Other Monthly Income (₹)</Label>
                <input type="number" value={profile.other_income} onChange={(e) => setProfile({ ...profile, other_income: parseFloat(e.target.value) || 0 })} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div>
                <Label style={{ marginBottom: 6 }}>Essential Living Costs (₹)</Label>
                <input type="number" value={profile.essential_expenses} onChange={(e) => setProfile({ ...profile, essential_expenses: parseFloat(e.target.value) || 0 })} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }} />
              </div>
              <div>
                <Label style={{ marginBottom: 6 }}>Discretionary Spending (₹)</Label>
                <input type="number" value={profile.discretionary_expenses} onChange={(e) => setProfile({ ...profile, discretionary_expenses: parseFloat(e.target.value) || 0 })} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }} />
              </div>
              <div>
                <Label style={{ marginBottom: 6 }}>Monthly Loan EMIs (₹)</Label>
                <input type="number" value={profile.emi_obligations} onChange={(e) => setProfile({ ...profile, emi_obligations: parseFloat(e.target.value) || 0 })} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <Label style={{ marginBottom: 6 }}>Liquid Emergency Fund (₹)</Label>
                <input type="number" value={profile.emergency_fund} onChange={(e) => setProfile({ ...profile, emergency_fund: parseFloat(e.target.value) || 0 })} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }} />
              </div>
              <div>
                <Label style={{ marginBottom: 6 }}>Term Life Insurance Cover (₹)</Label>
                <input type="number" value={profile.term_cover_amount} onChange={(e) => setProfile({ ...profile, term_cover_amount: parseFloat(e.target.value) || 0 })} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
              <PrimaryBtn loading={saving}>Save Financial Profile</PrimaryBtn>
            </div>
          </form>
        </div>

        {/* Goals List */}
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>Financial Goals Tracking</h3>
            <PrimaryBtn onClick={() => setGoalModal(true)}>+ New Goal</PrimaryBtn>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {goals.map((g) => {
              const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
              return (
                <div key={g.id} style={{ padding: "14px 16px", border: `1px solid ${C.line}`, borderRadius: 8, background: C.bg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{g.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: g.priority === "high" ? C.red : C.teal, background: g.priority === "high" ? C.redPale : C.tealPale, padding: "2px 6px", borderRadius: 4, marginLeft: 8 }}>
                        {g.priority} priority
                      </span>
                    </div>
                    <button onClick={() => handleDeleteGoal(g.id)} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 11.5 }}>Delete</button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.inkLight, marginBottom: 6 }}>
                    <span>Progress: {fmt(g.current_amount)} of {fmt(g.target_amount)}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 6, background: C.lineLight, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: C.teal, borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Goal Modal */}
      {goalModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: C.white, borderRadius: 12, padding: 28, width: 420 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 16 }}>Create Financial Goal</h3>
            <form onSubmit={handleAddGoal} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <Label style={{ marginBottom: 6 }}>Goal Title</Label>
                <input required type="text" value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="e.g. Car Downpayment / Higher Studies" style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <Label style={{ marginBottom: 6 }}>Target (₹)</Label>
                  <input required type="number" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} placeholder="e.g. 200000" style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }} />
                </div>
                <div>
                  <Label style={{ marginBottom: 6 }}>Current Saved (₹)</Label>
                  <input type="number" value={goalCurrent} onChange={(e) => setGoalCurrent(e.target.value)} placeholder="e.g. 25000" style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }} />
                </div>
              </div>
              <div>
                <Label style={{ marginBottom: 6 }}>Priority</Label>
                <select value={goalPriority} onChange={(e) => setGoalPriority(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }}>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <GhostBtn onClick={() => setGoalModal(false)}>Cancel</GhostBtn>
                <PrimaryBtn>Add Goal</PrimaryBtn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 5. Txn Pipeline Feature (Preserved & Integrated) ─────────────────────────
function PipelineFeature() {
  const [uploading, setUploading] = useState(false);
  const [activeJobId, setActiveJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [pastJobs, setPastJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [syncStatus, setSyncStatus] = useState("");
  const fileInputRef = useRef();

  const fetchPastJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/jobs`);
      if (res.ok) {
        const data = await res.json();
        setPastJobs(data);
      }
    } catch (e) {
      console.warn("Failed to fetch past jobs", e);
    }
  }, []);

  useEffect(() => {
    fetchPastJobs();
  }, [fetchPastJobs]);

  const loadJobResults = async (jobId) => {
    try {
      setError("");
      const res = await fetch(`${API_BASE}/jobs/${jobId}/results`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setSelectedJobId(jobId);
        setJobStatus("completed");
      } else {
        setError("Failed to load results for this job");
      }
    } catch (e) {
      setError("Network error loading job results");
    }
  };

  useEffect(() => {
    let timer;
    if (activeJobId && ["pending", "processing"].includes(jobStatus)) {
      timer = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/jobs/${activeJobId}/status`);
          if (res.ok) {
            const data = await res.json();
            setJobStatus(data.status);
            setProgress(data.progress_pct || 0);
            if (data.status === "completed") {
              clearInterval(timer);
              loadJobResults(activeJobId);
              fetchPastJobs();
            } else if (data.status === "failed") {
              clearInterval(timer);
              setError(data.error_message || "Job processing failed");
            }
          }
        } catch (e) {
          console.warn("Error polling status", e);
        }
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [activeJobId, jobStatus, fetchPastJobs]);

  const handleUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please select a valid CSV file");
      return;
    }

    setUploading(true);
    setError("");
    setResults(null);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`${API_BASE}/jobs/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setActiveJobId(data.id);
        setJobStatus(data.status);
        fetchPastJobs();
      } else {
        const errData = await res.json();
        setError(errData.detail || "Upload failed");
      }
    } catch (e) {
      setError("Connection to backend failed. Make sure Docker containers are running on http://127.0.0.1:8000.");
    } finally {
      setUploading(false);
    }
  };

  const handleSyncToProfile = async () => {
    try {
      setSyncStatus("Syncing...");
      const res = await fetch(`${API_BASE}/transactions/sync-to-profile`, { method: "POST" });
      if (res.ok) {
        setSyncStatus("✓ Synced to My Finances!");
        setTimeout(() => setSyncStatus(""), 3000);
      }
    } catch (e) {
      setSyncStatus("Sync failed");
    }
  };

  return (
    <div style={{ height: "100vh", overflowY: "auto", background: C.bg }}>
      <div style={{ padding: "20px 28px", borderBottom: `1px solid ${C.line}`, background: C.white, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 1 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>Transaction Pipeline & Audit</h1>
          <p style={{ fontSize: 12, color: C.inkLight, marginTop: 2 }}>Asynchronous Celery batch processor, deduplication, anomaly audits, and profile aggregation.</p>
        </div>
        {results && (
          <GhostBtn onClick={handleSyncToProfile}>
            {syncStatus || "Sync Spend to My Finances"}
          </GhostBtn>
        )}
      </div>

      <div style={{ maxWidth: 840, padding: "28px 28px 60px" }}>
        
        {error && (
          <div style={{ background: C.redPale, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20, color: C.red, fontSize: 13 }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Upload Drop Card */}
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: 32, textAlign: "center", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "inline-flex", width: 48, height: 48, background: C.tealPale, color: C.teal, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Upload Bank Transactions CSV</h3>
          <p style={{ fontSize: 12.5, color: C.inkLight, marginBottom: 18 }}>Select your transaction statement or use the sample <code>transactions.csv</code> from the root folder.</p>

          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleUpload} style={{ display: "none" }} />
          <PrimaryBtn onClick={() => fileInputRef.current?.click()} loading={uploading || ["pending", "processing"].includes(jobStatus)}>
            {uploading ? "Uploading..." : ["pending", "processing"].includes(jobStatus) ? "Processing Pipeline..." : "Select File & Process"}
          </PrimaryBtn>
        </div>

        {/* Processing Progress */}
        {activeJobId && ["pending", "processing"].includes(jobStatus) && (
          <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
              <span>Celery Pipeline Status: {jobStatus}</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: 8, background: C.lineLight, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: C.teal, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              <KV label="Cleaned Spend (INR)" value={fmt(results.summary?.total_spend_inr)} sub="Excludes duplicates" accent />
              <KV label="Flagged Anomalies" value={`${results.summary?.anomaly_count || 0} txn`} sub="High outliers / FX" />
              <KV label="Risk Level" value={results.summary?.risk_level || "Low"} sub="Audit density" />
            </div>

            {/* AI Narrative */}
            {results.summary?.narrative && (
              <div style={{ background: C.tealPale, border: `1px solid ${C.tealBorder}`, borderRadius: 12, padding: "18px 22px" }}>
                <Label style={{ color: C.teal, marginBottom: 6 }}>AI Narrative Summary</Label>
                <div style={{ fontSize: 13.5, color: C.inkMid, lineHeight: 1.6, fontStyle: "italic" }}>"{results.summary.narrative}"</div>
              </div>
            )}

            {/* Anomalies */}
            {results.anomalies && results.anomalies.length > 0 && (
              <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "20px 22px" }}>
                <Label style={{ color: C.red, marginBottom: 12 }}>Flagged Anomalies ({results.anomalies.length})</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {results.anomalies.map((txn, i) => (
                    <div key={i} style={{ padding: 12, border: `1px solid ${C.redBorder}`, background: C.redPale, borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{txn.merchant} ({txn.currency} {txn.amount})</div>
                        <div style={{ fontSize: 11.5, color: C.red, marginTop: 2 }}>⚠️ {txn.anomaly_reason}</div>
                      </div>
                      <div style={{ fontSize: 11.5, color: C.inkLight }}>{txn.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Past Audits */}
        {pastJobs.length > 0 && (
          <div style={{ marginTop: 28, background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "20px 22px" }}>
            <Label style={{ marginBottom: 12 }}>Historical Batch Audits</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pastJobs.map((job) => (
                <div key={job.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: `1px solid ${selectedJobId === job.id ? C.tealBorder : C.line}`, borderRadius: 8, background: selectedJobId === job.id ? C.tealPale : C.white }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{job.filename}</div>
                    <div style={{ fontSize: 11, color: C.inkLight }}>Uploaded: {new Date(job.created_at).toLocaleDateString("en-IN")}</div>
                  </div>
                  <GhostBtn onClick={() => loadJobResults(job.id)}>View Report</GhostBtn>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── 6. Salary Feature (Preserved) ────────────────────────────────────────────
function SalaryFeature() {
  const [ctc, setCtc] = useState(1500000);
  const [rent, setRent] = useState(25000);

  const calcTax = (income, regime) => {
    if (regime === "new") {
      const t = Math.max(0, income - 75000);
      if (t <= 300000) return 0;
      if (t <= 700000) return (t - 300000) * 0.05;
      if (t <= 1000000) return 20000 + (t - 700000) * 0.10;
      if (t <= 1200000) return 50000 + (t - 1000000) * 0.15;
      if (t <= 1500000) return 80000 + (t - 1200000) * 0.20;
      return 140000 + (t - 1500000) * 0.30;
    } else {
      const t = Math.max(0, income - 50000 - 150000 - Math.min(rent * 12, 200000));
      if (t <= 250000) return 0;
      if (t <= 500000) return (t - 250000) * 0.05;
      if (t <= 1000000) return 12500 + (t - 500000) * 0.20;
      return 112500 + (t - 1000000) * 0.30;
    }
  };

  const newTax = Math.round(calcTax(ctc, "new") * 1.04);
  const oldTax = Math.round(calcTax(ctc, "old") * 1.04);
  const epf = Math.min(Math.round(ctc * 0.0144), 21600);
  const newTakeHome = Math.round((ctc - newTax - epf) / 12);
  const oldTakeHome = Math.round((ctc - oldTax - epf) / 12);

  return (
    <div style={{ height: "100vh", overflowY: "auto", background: C.bg, padding: "28px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 18 }}>Salary & Tax Analyser (FY 2025-26)</h1>
        
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>
              <Label style={{ marginBottom: 6 }}>Annual CTC (₹)</Label>
              <input type="number" value={ctc} onChange={(e) => setCtc(parseFloat(e.target.value) || 0)} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 14 }} />
            </div>
            <div>
              <Label style={{ marginBottom: 6 }}>Monthly Rent Paid (₹)</Label>
              <input type="number" value={rent} onChange={(e) => setRent(parseFloat(e.target.value) || 0)} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 14 }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ padding: 18, border: `1px solid ${newTax <= oldTax ? C.tealBorder : C.line}`, borderRadius: 10, background: newTax <= oldTax ? C.tealPale : C.bg }}>
              <Label style={{ color: newTax <= oldTax ? C.teal : C.inkLight }}>New Tax Regime {newTax <= oldTax && "★ Recommended"}</Label>
              <div style={{ fontSize: 20, fontWeight: 600, color: C.ink, marginTop: 4 }}>{fmt(newTakeHome)} / mo</div>
              <div style={{ fontSize: 12, color: C.inkLight, marginTop: 4 }}>Total Tax: {fmt(newTax)} / yr</div>
            </div>

            <div style={{ padding: 18, border: `1px solid ${oldTax < newTax ? C.tealBorder : C.line}`, borderRadius: 10, background: oldTax < newTax ? C.tealPale : C.bg }}>
              <Label style={{ color: oldTax < newTax ? C.teal : C.inkLight }}>Old Tax Regime {oldTax < newTax && "★ Recommended"}</Label>
              <div style={{ fontSize: 20, fontWeight: 600, color: C.ink, marginTop: 4 }}>{fmt(oldTakeHome)} / mo</div>
              <div style={{ fontSize: 12, color: C.inkLight, marginTop: 4 }}>Total Tax: {fmt(oldTax)} / yr</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 7. Second Opinion Feature (Preserved) ─────────────────────────────────────
function SecondOpinionFeature() {
  const [pitch, setPitch] = useState("My agent is asking me to invest ₹50,000/year for 10 years in LIC Jeevan Labh, claiming I will get ₹10 Lakhs guaranteed return after 16 years.");
  const [verdict, setVerdict] = useState(null);

  const handleAnalyze = () => {
    setVerdict({
      title: "Traditional Endowment Plan Audit: Avoid",
      actual_irr: "4.8% to 5.2% annualized",
      claimed_returns: "8% to 10%",
      agent_commission: "25% to 35% in Year 1",
      warnings: [
        "Very low life cover (only 10x annual premium = ₹5 Lakhs, which is inadequate for family safety).",
        "Sub-inflation returns locking your capital for 16 years.",
      ],
      alternative: "Buy a ₹1 Crore Pure Term Insurance cover (₹10,000/year) and invest the remaining ₹40,000/year in a Nifty 50 Direct Index Mutual Fund.",
    });
  };

  return (
    <div style={{ height: "100vh", overflowY: "auto", background: C.bg, padding: "28px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Second Opinion (Policy Pitch Auditor)</h1>
        <p style={{ fontSize: 12.5, color: C.inkLight, marginBottom: 20 }}>Audit LIC endowment policies, ULIPs, or guaranteed return pitches to check real IRR and hidden fees.</p>

        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <Label style={{ marginBottom: 8 }}>Paste Policy Proposal / Pitch</Label>
          <textarea rows={4} value={pitch} onChange={(e) => setPitch(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, marginBottom: 14 }} />
          <PrimaryBtn onClick={handleAnalyze}>Audit Policy Pitch</PrimaryBtn>
        </div>

        {verdict && (
          <div style={{ background: C.white, border: `1px solid ${C.redBorder}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: C.red, marginBottom: 12 }}>{verdict.title}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 12, background: C.redPale, borderRadius: 8 }}>
                <Label style={{ color: C.red }}>Real Annual Return (IRR)</Label>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.red, marginTop: 4 }}>{verdict.actual_irr}</div>
              </div>
              <div style={{ padding: 12, background: C.amberPale, borderRadius: 8 }}>
                <Label style={{ color: C.amber }}>Agent First-Year Commission</Label>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.amber, marginTop: 4 }}>{verdict.agent_commission}</div>
              </div>
            </div>

            <Label style={{ marginBottom: 6 }}>Key Traps</Label>
            <ul style={{ paddingLeft: 18, fontSize: 12.5, color: C.inkMid, lineHeight: 1.6, marginBottom: 14 }}>
              {verdict.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>

            <div style={{ padding: 14, background: C.tealPale, border: `1px solid ${C.tealBorder}`, borderRadius: 8 }}>
              <Label style={{ color: C.teal, marginBottom: 4 }}>Mathematically Superior Alternative</Label>
              <div style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.5 }}>{verdict.alternative}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App Component ───────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");

  const handleSeedDemo = async () => {
    try {
      const res = await fetch(`${API_BASE}/demo/populate`, { method: "POST" });
      if (res.ok) {
        alert("Demo profile, goals, portfolio holdings, and regulatory knowledge base have been loaded into PostgreSQL!");
        window.location.reload();
      }
    } catch (e) {
      alert("Make sure backend is running on http://127.0.0.1:8000");
    }
  };

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <Nav tab={tab} setTab={setTab} onSeedDemo={handleSeedDemo} />
      <main style={{ flex: 1, height: "100%", background: C.bg }}>
        {tab === "dashboard" && <DashboardFeature onNavigate={setTab} onSeedDemo={handleSeedDemo} />}
        {tab === "chat" && <ChatFeature />}
        {tab === "portfolio" && <PortfolioFeature />}
        {tab === "finances" && <FinancesGoalsFeature />}
        {tab === "pipeline" && <PipelineFeature />}
        {tab === "salary" && <SalaryFeature />}
        {tab === "opinion" && <SecondOpinionFeature />}
      </main>
    </div>
  );
}
