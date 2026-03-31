import { useState, useCallback, useRef } from "react";

const C = {
  bg: "#0d1117", card: "#161b22", cardLight: "#1c2333",
  border: "rgba(240,236,228,0.08)", borderLight: "rgba(240,236,228,0.15)",
  cream: "#f0ece4", muted: "rgba(240,236,228,0.55)",
  purple: "#9B40C2", teal: "#00788C", tealLight: "#00a3b8",
  green: "#4e7a5b", greenBright: "#4ade80",
  red: "#c25050", amber: "#c29a40",
};

const ADAPT_SYSTEM = `You are Jordan Boyer's AI coaching assistant at StrongHold Fitness. You have PhD-level expertise in exercise science, anatomy, physiology, kinesiology, and injury modification.

A client is about to start their workout but has reported the following pre-workout status. Your job is to MODIFY their planned workout to accommodate their current condition.

MODIFICATION RULES:
- Sleep 1-4: Reduce total volume by 30-40%. Drop the last 1-2 exercises. Lower intensity. Focus on movement quality.
- Sleep 5-6: Reduce intensity by 10-15%. Keep volume. Add extra warm-up time.
- Sleep 7-10: No modifications needed for sleep.
- Self-Reflection 1-4: This client is not feeling good. Prioritize feel-good movements, reduce load, add mobility. Consider making it a recovery/active day if below 3.
- Self-Reflection 5-6: Minor adjustments. Slightly lower intensity expectations.
- Self-Reflection 7-10: Full send. No modifications.
- Pre-workout nutrition "fasted": Note they may fatigue faster. Suggest they keep a sports drink or quick carbs nearby. Slightly reduce volume on heavy compounds.
- Injuries/Tightness/Stiffness reported: THIS IS CRITICAL. Swap out any exercise that loads or stresses the affected area. Replace with a safe alternative that trains the same movement pattern. Add 2-3 mobility/corrective exercises targeting the affected area to the warm-up.

OUTPUT FORMAT:
Return the modified workout in this exact format. Every exercise on its own line:
WARM-UP ADDITIONS: (only if modifications needed)
- [Exercise Name] — [Sets x Reps] — [Coaching cue]

MODIFIED EXERCISES: (list ONLY the exercises that changed)
- SWAP: [Original Exercise] → [New Exercise] — [Sets x Reps] — [Reason]

REMOVED EXERCISES: (if volume reduction needed)
- [Exercise Name] — [Reason for removal]

COACH'S NOTE: (1-2 sentences of encouragement + context for why modifications were made)

If NO modifications are needed, simply respond: "NO MODIFICATIONS NEEDED — You're good to go. Full send today."

Be direct. Be coaching. Sound like Jordan.`;

// --- Parsed Workout Data Structure ---
function parseProgram(text) {
  if (!text.trim()) return null;
  const lines = text.split("\n").filter(l => l.trim());
  const days = [];
  let currentDay = null;
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();
    // Detect day headers
    if (/^(day\s*\d|monday|tuesday|wednesday|thursday|friday|saturday|sunday|session\s*\d|workout\s*[a-d])/i.test(trimmed) ||
        /^#{1,3}\s*(day|session|workout)/i.test(trimmed)) {
      const name = trimmed.replace(/^#{1,3}\s*/, "").replace(/[*_]/g, "");
      currentDay = { name, sections: [], exercises: [] };
      days.push(currentDay);
      currentSection = null;
      continue;
    }
    // Detect sections
    if (currentDay && (/warm.?up|cool.?down|main|circuit|superset|block|core|power|phase/i.test(trimmed)) &&
        (trimmed.startsWith("**") || trimmed.startsWith("##") || trimmed.startsWith("###") || trimmed.endsWith(":"))) {
      const secName = trimmed.replace(/^[#*\s]+/, "").replace(/[*:]+$/, "").trim();
      currentSection = secName;
      continue;
    }
    // Detect exercises (lines with sets/reps patterns or bullet points)
    if (currentDay && (trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.match(/^\d+\.|^[A-Z]\d\./))) {
      const exText = trimmed.replace(/^[-•]\s*/, "").replace(/^\d+\.\s*/, "").replace(/^[A-Z]\d[./]\s*/, "");
      currentDay.exercises.push({
        raw: exText,
        section: currentSection || "Main",
        done: false,
        weight: "",
        actualReps: "",
        notes: "",
        lastWeekWeight: "",
      });
    }
  }
  // If no day headers found, treat entire text as one session
  if (days.length === 0 && lines.length > 0) {
    days.push({ name: "Today's Workout", sections: [], exercises: lines.filter(l => l.trim().startsWith("-") || l.trim().match(/^\d+\./)).map(l => ({
      raw: l.trim().replace(/^[-•]\s*/, "").replace(/^\d+\.\s*/, ""),
      section: "Main", done: false, weight: "", actualReps: "", notes: "", lastWeekWeight: "",
    })) });
  }
  return days.length > 0 ? days : null;
}

// --- Components ---

function CheckIn({ data, onChange }) {
  const update = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: "20px 18px", marginBottom: 16,
    }}>
      <p style={{ fontSize: 11, color: C.teal, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, margin: "0 0 16px" }}>
        Pre-Workout Check-In
      </p>

      {/* Self Reflection */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, color: C.cream, fontWeight: 500, display: "block", marginBottom: 8 }}>
          How are you feeling today? <span style={{ color: data.reflection > 0 ? (data.reflection <= 4 ? C.red : data.reflection <= 6 ? C.amber : C.greenBright) : C.muted }}>{data.reflection > 0 ? `${data.reflection}/10` : ""}</span>
        </label>
        <div style={{ display: "flex", gap: 4 }}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button key={n} onClick={() => update("reflection", n)} style={{
              flex: 1, padding: "8px 0", border: `1px solid ${data.reflection === n ? (n <= 4 ? C.red : n <= 6 ? C.amber : C.greenBright) : C.border}`,
              background: data.reflection === n ? (n <= 4 ? C.red : n <= 6 ? C.amber : C.greenBright) + "22" : "transparent",
              color: data.reflection === n ? C.cream : C.muted,
              borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
            }}>{n}</button>
          ))}
        </div>
      </div>

      {/* Sleep */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, color: C.cream, fontWeight: 500, display: "block", marginBottom: 8 }}>
          Sleep quality last night: <span style={{ color: C.muted }}>{data.sleep > 0 ? `${data.sleep}/10` : ""}</span>
        </label>
        <div style={{ display: "flex", gap: 4 }}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button key={n} onClick={() => update("sleep", n)} style={{
              flex: 1, padding: "8px 0", border: `1px solid ${data.sleep === n ? C.teal : C.border}`,
              background: data.sleep === n ? C.teal + "22" : "transparent",
              color: data.sleep === n ? C.cream : C.muted,
              borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
            }}>{n}</button>
          ))}
        </div>
      </div>

      {/* Nutrition */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, color: C.cream, fontWeight: 500, display: "block", marginBottom: 8 }}>Pre-workout nutrition</label>
        <div style={{ display: "flex", gap: 6 }}>
          {["Fasted", "Light Meal", "Full Meal"].map(opt => (
            <button key={opt} onClick={() => update("nutrition", opt)} style={{
              flex: 1, padding: "9px 0", border: `1px solid ${data.nutrition === opt ? C.teal : C.border}`,
              background: data.nutrition === opt ? C.teal + "22" : "transparent",
              color: data.nutrition === opt ? C.tealLight : C.muted,
              borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
            }}>{opt}</button>
          ))}
        </div>
      </div>

      {/* Injuries / Tightness */}
      <div>
        <label style={{ fontSize: 13, color: C.cream, fontWeight: 500, display: "block", marginBottom: 8 }}>
          Any injuries, stiffness, or tightness today?
        </label>
        <textarea value={data.issues} onChange={e => update("issues", e.target.value)}
          placeholder="e.g., Left shoulder feeling tight, lower back stiff from sitting all day..."
          style={{
            width: "100%", padding: "10px 12px", background: C.cardLight, color: C.cream,
            border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, resize: "vertical",
            fontFamily: "'Outfit', sans-serif", outline: "none", minHeight: 60,
          }} />
      </div>
    </div>
  );
}

function ExerciseCard({ exercise, index, onUpdate, trackingMode }) {
  return (
    <div style={{
      background: exercise.done ? C.green + "12" : C.card,
      border: `1px solid ${exercise.done ? C.green + "40" : C.border}`,
      borderRadius: 12, padding: "14px 16px", marginBottom: 8,
      transition: "all 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {trackingMode && (
          <button onClick={() => onUpdate(index, "done", !exercise.done)} style={{
            width: 24, height: 24, borderRadius: 6, border: `2px solid ${exercise.done ? C.greenBright : C.borderLight}`,
            background: exercise.done ? C.greenBright : "transparent",
            cursor: "pointer", flexShrink: 0, marginTop: 2,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 14,
          }}>
            {exercise.done ? "✓" : ""}
          </button>
        )}
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: 14, color: exercise.done ? C.greenBright : C.cream, fontWeight: 500,
            margin: 0, lineHeight: 1.5,
            textDecoration: exercise.done ? "line-through" : "none",
            opacity: exercise.done ? 0.7 : 1,
          }}>
            {exercise.raw}
          </p>
        </div>
      </div>

      {trackingMode && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, paddingLeft: trackingMode ? 36 : 0 }}>
          <input value={exercise.lastWeekWeight} onChange={e => onUpdate(index, "lastWeekWeight", e.target.value)}
            placeholder="Last wk" style={{
              width: "22%", padding: "6px 8px", background: C.cardLight, color: C.amber,
              border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11,
              fontFamily: "'Outfit', sans-serif", outline: "none", textAlign: "center",
            }} />
          <input value={exercise.weight} onChange={e => onUpdate(index, "weight", e.target.value)}
            placeholder="Weight" style={{
              width: "22%", padding: "6px 8px", background: C.cardLight, color: C.tealLight,
              border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11,
              fontFamily: "'Outfit', sans-serif", outline: "none", textAlign: "center",
            }} />
          <input value={exercise.actualReps} onChange={e => onUpdate(index, "actualReps", e.target.value)}
            placeholder="Reps" style={{
              width: "22%", padding: "6px 8px", background: C.cardLight, color: C.tealLight,
              border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11,
              fontFamily: "'Outfit', sans-serif", outline: "none", textAlign: "center",
            }} />
          <input value={exercise.notes} onChange={e => onUpdate(index, "notes", e.target.value)}
            placeholder="Notes" style={{
              flex: 1, padding: "6px 8px", background: C.cardLight, color: C.muted,
              border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11,
              fontFamily: "'Outfit', sans-serif", outline: "none",
            }} />
        </div>
      )}
    </div>
  );
}

function ProgressBar({ exercises }) {
  const total = exercises.length;
  const done = exercises.filter(e => e.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: C.muted }}>{done} of {total} exercises</span>
        <span style={{ fontSize: 12, color: pct === 100 ? C.greenBright : C.teal, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: pct + "%",
          background: pct === 100 ? `linear-gradient(90deg, ${C.green}, ${C.greenBright})` : `linear-gradient(90deg, ${C.teal}, ${C.tealLight})`,
          borderRadius: 3, transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

function PostWorkout({ rpe, onRpeChange }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: "20px 18px", marginTop: 16,
    }}>
      <p style={{ fontSize: 11, color: C.purple, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, margin: "0 0 12px" }}>
        Post-Workout RPE
      </p>
      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px" }}>How hard was the overall session?</p>
      <div style={{ display: "flex", gap: 4 }}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button key={n} onClick={() => onRpeChange(n)} style={{
            flex: 1, padding: "8px 0",
            border: `1px solid ${rpe === n ? C.purple : C.border}`,
            background: rpe === n ? C.purple + "22" : "transparent",
            color: rpe === n ? C.cream : C.muted,
            borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "'Outfit', sans-serif",
          }}>{n}</button>
        ))}
      </div>
    </div>
  );
}

function PrintView({ day, checkIn, postRpe, clientName, weekLabel }) {
  return (
    <div id="print-area" style={{ display: "none" }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; font-size: 11px; }
          .print-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1D1160; padding-bottom: 12px; margin-bottom: 16px; }
          .print-header h1 { font-size: 18px; font-weight: 700; color: #1D1160; margin: 0; }
          .print-header p { font-size: 11px; color: #666; margin: 0; }
          .print-checkin { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
          .print-checkin-item { font-size: 10px; }
          .print-checkin-item strong { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #1D1160; margin-bottom: 2px; }
          .print-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          .print-table th { background: #1D1160; color: white; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }
          .print-table td { padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; vertical-align: top; }
          .print-table .fill-in { border-bottom: 1px dashed #ccc; min-width: 50px; display: inline-block; height: 16px; }
          .print-issues { border: 1px solid #ddd; border-radius: 6px; padding: 10px; margin-bottom: 16px; min-height: 50px; }
          .print-issues strong { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #1D1160; }
          .print-rpe { border: 1px solid #ddd; border-radius: 6px; padding: 10px; }
          .print-rpe strong { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #1D1160; }
          .print-footer { margin-top: 16px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
        }
      `}</style>

      <div className="print-header">
        <div>
          <h1>StrongHold Fitness</h1>
          <p>{day?.name || "Training Session"}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p><strong>Client:</strong> {clientName || "________________"}</p>
          <p><strong>Date:</strong> ________________ <strong>Week:</strong> {weekLabel || "____"}</p>
        </div>
      </div>

      <div className="print-checkin">
        <div className="print-checkin-item">
          <strong>Self-Reflection (1-10)</strong>
          <span className="fill-in"></span>
        </div>
        <div className="print-checkin-item">
          <strong>Sleep Quality (1-10)</strong>
          <span className="fill-in"></span>
        </div>
        <div className="print-checkin-item">
          <strong>Pre-Workout Nutrition</strong>
          Fasted / Light Meal / Full Meal
        </div>
        <div className="print-checkin-item">
          <strong>Bodyweight</strong>
          <span className="fill-in"></span>
        </div>
      </div>

      <div className="print-issues">
        <strong>Injuries / Stiffness / Tightness Notes:</strong>
        <br /><br />
        <div style={{ borderBottom: "1px dashed #ccc", height: 18 }}></div>
        <div style={{ borderBottom: "1px dashed #ccc", height: 18 }}></div>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: "5%" }}>#</th>
            <th style={{ width: "35%" }}>Exercise</th>
            <th style={{ width: "12%" }}>Last Wk</th>
            <th style={{ width: "12%" }}>Weight</th>
            <th style={{ width: "12%" }}>Reps</th>
            <th style={{ width: "5%" }}>✓</th>
            <th style={{ width: "19%" }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {(day?.exercises || []).map((ex, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{ex.raw}</td>
              <td><span className="fill-in"></span></td>
              <td><span className="fill-in"></span></td>
              <td><span className="fill-in"></span></td>
              <td style={{ textAlign: "center" }}>☐</td>
              <td><span className="fill-in" style={{ width: "100%" }}></span></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-rpe">
        <strong>Post-Workout Session RPE (1-10):</strong> <span className="fill-in" style={{ width: 40 }}></span>
        <br /><br />
        <strong>Session Notes / How did it go?</strong>
        <br />
        <div style={{ borderBottom: "1px dashed #ccc", height: 18 }}></div>
        <div style={{ borderBottom: "1px dashed #ccc", height: 18 }}></div>
        <div style={{ borderBottom: "1px dashed #ccc", height: 18 }}></div>
      </div>

      <div className="print-footer">
        STRONGHOLD FITNESS · Jordan Boyer · NSCA Certified · TPI Golf Fitness Specialist · strongholdfitness.co
      </div>
    </div>
  );
}

// --- Main App ---
export default function ProgramFormatter() {
  const [rawProgram, setRawProgram] = useState("");
  const [days, setDays] = useState(null);
  const [activeDay, setActiveDay] = useState(0);
  const [trackingMode, setTrackingMode] = useState(true);
  const [checkIn, setCheckIn] = useState({ reflection: 0, sleep: 0, nutrition: "", issues: "" });
  const [postRpe, setPostRpe] = useState(0);
  const [clientName, setClientName] = useState("");
  const [weekLabel, setWeekLabel] = useState("1");
  const [adaptations, setAdaptations] = useState("");
  const [adapting, setAdapting] = useState(false);
  const [parsed, setParsed] = useState(false);

  const loadProgram = () => {
    const p = parseProgram(rawProgram);
    if (p) {
      setDays(p);
      setActiveDay(0);
      setParsed(true);
    }
  };

  const updateExercise = (dayIdx, exIdx, field, value) => {
    setDays(prev => {
      const updated = [...prev];
      updated[dayIdx] = { ...updated[dayIdx], exercises: [...updated[dayIdx].exercises] };
      updated[dayIdx].exercises[exIdx] = { ...updated[dayIdx].exercises[exIdx], [field]: value };
      return updated;
    });
  };

  const adaptWorkout = useCallback(async () => {
    if (!days || !days[activeDay]) return;
    const needsAdaptation = checkIn.reflection <= 6 || checkIn.sleep <= 5 || checkIn.issues.trim() || checkIn.nutrition === "Fasted";
    if (!needsAdaptation) {
      setAdaptations("NO MODIFICATIONS NEEDED — You're good to go. Full send today.");
      return;
    }

    setAdapting(true);
    const exerciseList = days[activeDay].exercises.map((e, i) => `${i + 1}. ${e.raw}`).join("\n");
    const prompt = `CLIENT CHECK-IN:
- Self-Reflection: ${checkIn.reflection}/10
- Sleep Quality: ${checkIn.sleep}/10
- Pre-Workout Nutrition: ${checkIn.nutrition || "Not specified"}
- Injuries/Stiffness/Tightness: ${checkIn.issues || "None reported"}

TODAY'S PLANNED WORKOUT (${days[activeDay].name}):
${exerciseList}

Based on this check-in, what modifications should be made?`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: ADAPT_SYSTEM,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "Unable to generate adaptations.";
      setAdaptations(text);
    } catch {
      setAdaptations("Connection error. Proceed with the planned workout and listen to your body.");
    }
    setAdapting(false);
  }, [days, activeDay, checkIn]);

  const handlePrint = () => {
    const printArea = document.getElementById("print-area");
    if (printArea) {
      printArea.style.display = "block";
      window.print();
      setTimeout(() => { printArea.style.display = "none"; }, 500);
    }
  };

  const currentDay = days ? days[activeDay] : null;
  const doneCount = currentDay ? currentDay.exercises.filter(e => e.done).length : 0;
  const totalCount = currentDay ? currentDay.exercises.length : 0;

  return (
    <div style={{
      minHeight: "100vh", width: "100%", background: C.bg,
      fontFamily: "'Outfit', sans-serif", padding: "24px 16px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');
        @keyframes dotPulse { 0%,100% { opacity:.3; transform:scale(.8); } 50% { opacity:1; transform:scale(1.15); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      <div className="no-print" style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: C.cream, margin: 0 }}>
            StrongHold Workout Portal
          </h1>
          <p style={{ color: C.teal, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginTop: 6 }}>
            AI-Adaptive · Live Tracking · Printable
          </p>
        </div>

        {!parsed ? (
          /* --- Input Screen --- */
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: C.teal, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, display: "block", marginBottom: 5 }}>Client Name</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g., John Smith"
                  style={{ width: "100%", padding: "10px 12px", background: C.card, color: C.cream, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "'Outfit', sans-serif", outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.teal, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, display: "block", marginBottom: 5 }}>Week #</label>
                <input value={weekLabel} onChange={e => setWeekLabel(e.target.value)} placeholder="1"
                  style={{ width: "100%", padding: "10px 12px", background: C.card, color: C.cream, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "'Outfit', sans-serif", outline: "none" }} />
              </div>
            </div>

            <label style={{ fontSize: 11, color: C.teal, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, display: "block", marginBottom: 5 }}>
              Paste Program from Builder
            </label>
            <textarea value={rawProgram} onChange={e => setRawProgram(e.target.value)}
              placeholder="Paste the full training program output from the StrongHold Program Builder here..."
              style={{
                width: "100%", minHeight: 300, padding: "14px 16px", background: C.card, color: C.cream,
                border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 13, lineHeight: 1.6,
                fontFamily: "'Outfit', sans-serif", outline: "none", resize: "vertical",
              }} />
            <button onClick={loadProgram} disabled={!rawProgram.trim()} style={{
              width: "100%", padding: "14px", border: "none", borderRadius: 10, marginTop: 12,
              background: rawProgram.trim() ? `linear-gradient(135deg, ${C.teal}, ${C.tealLight})` : C.border,
              color: "#fff", fontSize: 15, fontWeight: 600, cursor: rawProgram.trim() ? "pointer" : "default",
              fontFamily: "'Outfit', sans-serif",
            }}>
              Load Program
            </button>
          </div>
        ) : (
          /* --- Workout Portal View --- */
          <div>
            {/* Day Selector */}
            <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
              {days.map((d, i) => (
                <button key={i} onClick={() => { setActiveDay(i); setAdaptations(""); setCheckIn({ reflection: 0, sleep: 0, nutrition: "", issues: "" }); setPostRpe(0); }}
                  style={{
                    padding: "10px 18px", border: `1px solid ${activeDay === i ? C.teal : C.border}`,
                    background: activeDay === i ? C.teal + "22" : "transparent",
                    color: activeDay === i ? C.cream : C.muted,
                    borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'Outfit', sans-serif", whiteSpace: "nowrap", flexShrink: 0,
                  }}>
                  {d.name}
                </button>
              ))}
            </div>

            {/* Session Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: C.cream, margin: 0 }}>
                {currentDay?.name}
              </h2>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setTrackingMode(!trackingMode)} style={{
                  padding: "6px 14px", border: `1px solid ${C.border}`, background: "transparent",
                  color: C.muted, borderRadius: 8, fontSize: 11, cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  {trackingMode ? "View Only" : "Track Mode"}
                </button>
                <button onClick={handlePrint} style={{
                  padding: "6px 14px", border: `1px solid ${C.border}`, background: "transparent",
                  color: C.muted, borderRadius: 8, fontSize: 11, cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  Print
                </button>
                <button onClick={() => { setParsed(false); setDays(null); setAdaptations(""); }} style={{
                  padding: "6px 14px", border: `1px solid ${C.border}`, background: "transparent",
                  color: C.muted, borderRadius: 8, fontSize: 11, cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  New Program
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {trackingMode && <ProgressBar exercises={currentDay?.exercises || []} />}

            {/* Pre-Workout Check-In */}
            <CheckIn data={checkIn} onChange={setCheckIn} />

            {/* Adapt Button */}
            {(checkIn.reflection > 0 || checkIn.sleep > 0 || checkIn.issues.trim()) && !adaptations && (
              <button onClick={adaptWorkout} disabled={adapting} style={{
                width: "100%", padding: "12px", border: `1px solid ${C.amber}40`,
                background: C.amber + "12", color: C.amber,
                borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                fontFamily: "'Outfit', sans-serif", marginBottom: 16,
                opacity: adapting ? 0.7 : 1,
              }}>
                {adapting ? "Analyzing your check-in..." : "Adapt Today's Workout Based on Check-In"}
              </button>
            )}

            {/* Adaptations */}
            {adaptations && (
              <div style={{
                background: adaptations.includes("NO MODIFICATIONS") ? C.green + "12" : C.amber + "12",
                border: `1px solid ${adaptations.includes("NO MODIFICATIONS") ? C.green + "40" : C.amber + "40"}`,
                borderRadius: 12, padding: "16px 18px", marginBottom: 16,
                color: C.cream, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap",
                fontFamily: "'Outfit', sans-serif",
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, color: adaptations.includes("NO MODIFICATIONS") ? C.greenBright : C.amber, margin: "0 0 8px" }}>
                  {adaptations.includes("NO MODIFICATIONS") ? "All Clear" : "Coach's Adaptations"}
                </p>
                {adaptations}
              </div>
            )}

            {/* Tracking Labels */}
            {trackingMode && currentDay?.exercises.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 6, paddingLeft: 36, fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
                <span style={{ width: "22%" }}>Last Wk</span>
                <span style={{ width: "22%" }}>Weight</span>
                <span style={{ width: "22%" }}>Reps</span>
                <span style={{ flex: 1 }}>Notes</span>
              </div>
            )}

            {/* Exercises */}
            {currentDay?.exercises.map((ex, i) => (
              <ExerciseCard key={i} exercise={ex} index={i} trackingMode={trackingMode}
                onUpdate={(idx, field, val) => updateExercise(activeDay, idx, field, val)} />
            ))}

            {/* Completion */}
            {trackingMode && doneCount === totalCount && totalCount > 0 && (
              <div style={{
                textAlign: "center", padding: "24px", margin: "16px 0",
                background: C.green + "15", border: `1px solid ${C.green}40`,
                borderRadius: 14,
              }}>
                <p style={{ fontSize: 24, margin: "0 0 8px" }}>💪</p>
                <p style={{ fontSize: 16, color: C.greenBright, fontWeight: 600, margin: 0 }}>Workout Complete</p>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Strong work. Log your RPE below.</p>
              </div>
            )}

            {/* Post-Workout RPE */}
            {trackingMode && <PostWorkout rpe={postRpe} onRpeChange={setPostRpe} />}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 28, padding: "16px 0" }}>
          <p style={{ fontSize: 10, color: C.muted, letterSpacing: 1 }}>
            STRONGHOLD FITNESS · AI WORKOUT PORTAL · NSCA + TPI CERTIFIED
          </p>
        </div>
      </div>

      {/* Hidden Print View */}
      <PrintView day={currentDay} checkIn={checkIn} postRpe={postRpe} clientName={clientName} weekLabel={weekLabel} />
    </div>
  );
}
