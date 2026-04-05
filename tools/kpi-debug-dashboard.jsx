import { useState, useEffect, useCallback } from "react";

const COLORS = {
  bg: "#0d1117",
  card: "#141b24",
  border: "rgba(201,168,76,0.15)",
  accent: "#c9a84c",
  accentDim: "rgba(201,168,76,0.12)",
  text: "#f0ece4",
  textDim: "#8a9ab0",
  green: "#4ade80",
  red: "#f87171",
  blue: "#60a5fa",
  purple: "#a78bfa",
  orange: "#fb923c",
};

const PROPERTIES = [
  { id: "spectator", label: "The Spectator", key: "sh_guest_spectator" },
  { id: "fqi", label: "French Quarter Inn", key: "sh_guest_fqi" },
];

const ALL_EVENTS = [
  { name: "portal_open", icon: "📱", desc: "QR scan / page load" },
  { name: "return_visit", icon: "🔄", desc: "Returning guest" },
  { name: "session_view", icon: "👁️", desc: "Tapped into session" },
  { name: "session_start", icon: "▶️", desc: "Began exercising" },
  { name: "exercise_engage", icon: "💪", desc: "Circuit expanded" },
  { name: "session_complete", icon: "✅", desc: "Finished session" },
  { name: "post_session_survey", icon: "😌", desc: "Survey response" },
  { name: "premium_view", icon: "🔓", desc: "Unlock screen viewed" },
  { name: "premium_screen_view", icon: "💎", desc: "Storefront viewed" },
  { name: "premium_purchase_click", icon: "💳", desc: "$29 button tapped" },
  { name: "access_code_submit", icon: "🔑", desc: "Code entered" },
  { name: "equipment_view", icon: "🏋️", desc: "Equipment screen" },
  { name: "about_view", icon: "👤", desc: "Meet Your Coach" },
];

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 12, padding: "14px 16px", flex: 1, minWidth: 100,
    }}>
      <p style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: 1.5, margin: "0 0 6px", fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ fontSize: 28, color: color || COLORS.text, margin: 0, fontWeight: 600 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: COLORS.textDim, margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

function PropertyPanel({ property }) {
  const [data, setData] = useState(null);

  const refresh = useCallback(() => {
    try {
      const raw = localStorage.getItem(property.key);
      setData(raw ? JSON.parse(raw) : null);
    } catch { setData(null); }
  }, [property.key]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (!data) {
    return (
      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.border}`,
        borderRadius: 14, padding: 24, textAlign: "center",
      }}>
        <p style={{ fontSize: 40, margin: "0 0 12px" }}>📭</p>
        <p style={{ color: COLORS.text, fontSize: 15, margin: "0 0 6px" }}>{property.label}</p>
        <p style={{ color: COLORS.textDim, fontSize: 13, margin: 0 }}>
          No guest data yet. Open the portal to start tracking.
        </p>
      </div>
    );
  }

  const daysSince = Math.floor((Date.now() - data.firstVisit) / 86400000);
  const surveyMap = {};
  (data.surveyResponses || []).forEach(s => {
    surveyMap[s.response] = (surveyMap[s.response] || 0) + 1;
  });

  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 14, overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ color: COLORS.accent, fontSize: 11, letterSpacing: 2, margin: "0 0 2px", fontWeight: 700 }}>
            {property.label.toUpperCase()}
          </p>
          <p style={{ color: COLORS.textDim, fontSize: 11, margin: 0 }}>
            Guest device ID: {property.key}
          </p>
        </div>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: COLORS.green, boxShadow: `0 0 8px ${COLORS.green}60`,
        }} />
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <StatCard label="VISITS" value={data.visitCount} sub={`${daysSince}d since first`} color={COLORS.blue} />
          <StatCard label="VIEWED" value={data.sessionsViewed?.length || 0} color={COLORS.purple} />
          <StatCard label="STARTED" value={data.sessionsStarted?.length || 0} color={COLORS.orange} />
          <StatCard label="COMPLETED" value={data.sessionsCompleted?.length || 0} color={COLORS.green} />
        </div>

        {/* Session Details */}
        {data.sessionsViewed?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ color: COLORS.textDim, fontSize: 10, letterSpacing: 2, margin: "0 0 8px", fontWeight: 600 }}>
              SESSION JOURNEY
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {data.sessionsViewed.map(id => {
                const started = data.sessionsStarted?.includes(id);
                const completed = data.sessionsCompleted?.includes(id);
                return (
                  <div key={id} style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 12,
                    background: completed ? `${COLORS.green}18` : started ? `${COLORS.orange}18` : `${COLORS.blue}18`,
                    color: completed ? COLORS.green : started ? COLORS.orange : COLORS.blue,
                    border: `1px solid ${completed ? COLORS.green : started ? COLORS.orange : COLORS.blue}30`,
                  }}>
                    {completed ? "✅" : started ? "▶️" : "👁️"} {id}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Survey Responses */}
        {data.surveyResponses?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ color: COLORS.textDim, fontSize: 10, letterSpacing: 2, margin: "0 0 8px", fontWeight: 600 }}>
              SURVEY RESPONSES
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              {Object.entries(surveyMap).map(([resp, count]) => (
                <div key={resp} style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 24 }}>
                    {resp === "refreshed" ? "😌" : resp === "neutral" ? "😐" : "😅"}
                  </span>
                  <p style={{ color: COLORS.text, fontSize: 16, margin: "4px 0 0", fontWeight: 600 }}>{count}</p>
                  <p style={{ color: COLORS.textDim, fontSize: 10, margin: 0 }}>{resp}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Premium Status */}
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{
            flex: 1, padding: "10px 14px", borderRadius: 8,
            background: data.premiumViewed ? `${COLORS.accent}12` : `${COLORS.textDim}08`,
            border: `1px solid ${data.premiumViewed ? COLORS.accent : COLORS.textDim}20`,
          }}>
            <p style={{ fontSize: 11, color: data.premiumViewed ? COLORS.accent : COLORS.textDim, margin: 0 }}>
              {data.premiumViewed ? "🔓 Premium Viewed" : "🔒 Premium Not Viewed"}
            </p>
          </div>
          <div style={{
            flex: 1, padding: "10px 14px", borderRadius: 8,
            background: data.premiumPurchased ? `${COLORS.green}12` : `${COLORS.textDim}08`,
            border: `1px solid ${data.premiumPurchased ? COLORS.green : COLORS.textDim}20`,
          }}>
            <p style={{ fontSize: 11, color: data.premiumPurchased ? COLORS.green : COLORS.textDim, margin: 0 }}>
              {data.premiumPurchased ? "💳 Purchased" : "💳 Not Purchased"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KPIDashboard() {
  const [tab, setTab] = useState("live");

  const clearData = (key) => {
    if (window.confirm(`Clear guest data for ${key}? This resets the localStorage journey.`)) {
      localStorage.removeItem(key);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: COLORS.bg, color: COLORS.text,
      fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "0 0 40px",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: `1px solid ${COLORS.border}`,
        background: `linear-gradient(180deg, ${COLORS.card}, ${COLORS.bg})`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <p style={{ fontSize: 11, letterSpacing: 3, color: COLORS.accent, margin: 0, fontWeight: 700 }}>
            STRONGHOLD KPI INTELLIGENCE
          </p>
        </div>
        <p style={{ fontSize: 22, color: COLORS.text, margin: "4px 0 0", fontWeight: 300 }}>
          Stage 1 Debug Dashboard
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, padding: "0 20px", marginTop: 16 }}>
        {[
          { id: "live", label: "Live Data" },
          { id: "events", label: "Event Reference" },
          { id: "test", label: "Test Checklist" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
              background: tab === t.id ? COLORS.card : "transparent",
              color: tab === t.id ? COLORS.accent : COLORS.textDim,
              fontSize: 12, fontWeight: 600, letterSpacing: 1,
              borderBottom: tab === t.id ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
              transition: "all 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px 20px" }}>
        {tab === "live" && (
          <div>
            <p style={{ color: COLORS.textDim, fontSize: 12, margin: "0 0 16px", lineHeight: 1.6 }}>
              This reads from localStorage in real-time. Open a portal in another tab and interact with it.
              Data refreshes every 2 seconds.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {PROPERTIES.map(p => (
                <div key={p.id}>
                  <PropertyPanel property={p} />
                  <button
                    onClick={() => clearData(p.key)}
                    style={{
                      marginTop: 8, background: "none", border: `1px solid ${COLORS.red}30`,
                      color: COLORS.red, padding: "6px 14px", borderRadius: 8,
                      fontSize: 11, cursor: "pointer", opacity: 0.7,
                    }}
                  >
                    Reset {p.label} Data
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "events" && (
          <div>
            <p style={{ color: COLORS.textDim, fontSize: 12, margin: "0 0 16px" }}>
              All 15 GA4 custom events instrumented across both portals.
            </p>
            {ALL_EVENTS.map((evt, i) => (
              <div key={evt.name} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", marginBottom: 6,
                background: COLORS.card, border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
              }}>
                <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{evt.icon}</span>
                <div style={{ flex: 1 }}>
                  <code style={{
                    color: COLORS.accent, fontSize: 13, fontFamily: "monospace",
                    background: `${COLORS.accent}10`, padding: "2px 8px", borderRadius: 4,
                  }}>
                    {evt.name}
                  </code>
                  <p style={{ color: COLORS.textDim, fontSize: 12, margin: "4px 0 0" }}>{evt.desc}</p>
                </div>
                <span style={{ fontSize: 10, color: COLORS.green }}>●</span>
              </div>
            ))}
          </div>
        )}

        {tab === "test" && (
          <div>
            <p style={{ color: COLORS.textDim, fontSize: 12, margin: "0 0 16px", lineHeight: 1.6 }}>
              Walk through this checklist to verify every event fires correctly.
              Open GA4 Realtime alongside the portal.
            </p>
            {[
              { step: "1", action: "Open the Spectator portal", expect: "portal_open fires in GA4 Realtime" },
              { step: "2", action: "Close and reopen the portal", expect: "portal_open + return_visit both fire, visit_count = 2" },
              { step: "3", action: "Tap Morning Mobility", expect: "session_view fires with session_id = morning" },
              { step: "4", action: "Scroll down into the exercises", expect: "session_start fires (stretch format detection)" },
              { step: "5", action: "Scroll all the way to Pair With section", expect: "session_complete fires" },
              { step: "6", action: "Tap an emoji on the survey", expect: "post_session_survey fires with response value" },
              { step: "7", action: "Go back home, tap The Foundation", expect: "session_view fires with session_id = foundation" },
              { step: "8", action: "Expand Circuit A", expect: "session_start + exercise_engage fire" },
              { step: "9", action: "Tap the equipment button on home", expect: "equipment_view fires" },
              { step: "10", action: "Tap Your Coach on home", expect: "about_view fires" },
              { step: "11", action: "Tap a locked premium session", expect: "premium_view fires" },
              { step: "12", action: "Tap PURCHASE ACCESS — $29", expect: "premium_purchase_click fires with price = 29" },
              { step: "13", action: "Enter a test code and tap REDEEM", expect: "access_code_submit fires" },
              { step: "14", action: "Tap Premium Programs on home", expect: "premium_screen_view fires" },
              { step: "15", action: "Check Live Data tab in this dashboard", expect: "All interactions reflected in localStorage" },
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex", gap: 12, padding: "12px 14px", marginBottom: 6,
                background: COLORS.card, border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: COLORS.accentDim, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: COLORS.accent, fontSize: 13, fontWeight: 700,
                }}>
                  {item.step}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: COLORS.text, fontSize: 13, margin: "0 0 4px", fontWeight: 500 }}>
                    {item.action}
                  </p>
                  <p style={{ color: COLORS.green, fontSize: 11, margin: 0 }}>
                    ✓ {item.expect}
                  </p>
                </div>
              </div>
            ))}

            <div style={{
              marginTop: 20, padding: 16, borderRadius: 12,
              background: `${COLORS.accent}08`, border: `1px solid ${COLORS.accent}20`,
            }}>
              <p style={{ color: COLORS.accent, fontSize: 13, margin: "0 0 8px", fontWeight: 600 }}>
                GA4 DebugView (Live Testing)
              </p>
              <p style={{ color: COLORS.textDim, fontSize: 12, margin: "0 0 10px", lineHeight: 1.6 }}>
                For real-time GA4 event verification, enable DebugView:
              </p>
              <p style={{ color: COLORS.text, fontSize: 12, margin: "0 0 4px" }}>
                1. Go to GA4 → Admin → DebugView
              </p>
              <p style={{ color: COLORS.text, fontSize: 12, margin: "0 0 4px" }}>
                2. Install the "Google Analytics Debugger" Chrome extension
              </p>
              <p style={{ color: COLORS.text, fontSize: 12, margin: "0 0 4px" }}>
                3. Enable the extension and reload the portal
              </p>
              <p style={{ color: COLORS.text, fontSize: 12, margin: 0 }}>
                4. Events appear in DebugView within seconds
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
