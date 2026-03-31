import { useState, useCallback } from "react";

const C = {
  bg: "#0d1117", card: "#161b22", cardLight: "#1c2333",
  border: "rgba(240,236,228,0.08)", borderLight: "rgba(240,236,228,0.15)",
  cream: "#f0ece4", muted: "rgba(240,236,228,0.55)",
  purple: "#9B40C2", deepPurple: "#1D1160",
  teal: "#00788C", tealLight: "#00a3b8",
  green: "#4e7a5b", greenBright: "#4ade80",
  red: "#c25050", amber: "#c29a40",
};

/* ══════════════════════════════════════════════════════════
   SYSTEM PROMPTS
   ══════════════════════════════════════════════════════════ */

const GEN_POP_SYSTEM = `You are an elite certified personal trainer (NSCA) with expertise in anatomy, physiology, kinesiology, biomechanics. You design programs for StrongHold Fitness (Jordan Boyer, 10+ years).

OUTPUT FORMAT — Return ONLY a valid JSON array. No markdown fences. No explanation. No text before or after the JSON.

Generate ONE WEEK of training days (the training split). Include a "progression" field on each day explaining how to progress across 4 weeks. Keep it concise but complete.

JSON structure:
[{"name":"Day 1 — Full Body Strength","warmup":[{"name":"Foam Roll Quads","prescription":"60s each","cue":"Pause on tender spots."}],"exercises":[{"name":"Barbell Back Squat","sets":4,"reps":"6-8","rest":"2-3 min","rpe":"7-8","cue":"Chest proud, drive through heels."}],"cooldown":[{"name":"Hip Flexor Stretch","prescription":"45s each side"}],"progression":"Wk2: +5lbs compounds. Wk3: +1 rep all sets. Wk4: Deload 60%."}]

RULES:
- Beginners: 2-3 days, full-body, linear progression
- Intermediate: 3-4 days, upper/lower or PPL, undulating periodization
- Advanced: 4-6 days, specialized splits
- Strength: 3-6 sets x 1-6 reps, 2-5min rest. Hypertrophy: 3-5 x 8-12, 60-90s. Endurance: 2-3 x 12-20, 30-60s
- Include warmup and cooldown each day
- Account for injuries with safe alternatives
- Coaching cues: direct, confident, encouraging ("Drive through your heels" not "Please try to push")
- Keep each exercise cue to ONE sentence max
- 5-8 exercises per day in the main block, 3-4 warmup items, 2-3 cooldown items

RETURN ONLY THE JSON ARRAY.`;

const TPI_SYSTEM = `You are a TPI Certified Fitness Professional with expertise in golf biomechanics and corrective exercise. You design programs for StrongHold Fitness (Jordan Boyer, TPI + NSCA Certified).

OUTPUT FORMAT — Return ONLY a valid JSON array. No markdown fences. No explanation. No text before or after.

Generate a corrective week (3 days) AND a performance week (3 days) plus a pre-round warm-up. Total: 7 items in the array. Keep exercise cues to ONE sentence.

JSON structure:
[{"name":"Corrective Day 1 — Mobility","warmup":[{"name":"Foam Roll T-Spine","prescription":"90s","cue":"Pause and extend over roller at tight spots."}],"exercises":[{"name":"Open Books","sets":2,"reps":"8 each","rest":"30s","rpe":"3","cue":"Rotation from mid-back, not hips."}],"cooldown":[{"name":"Child's Pose","prescription":"60s"}],"progression":"Wk2: Add 5s holds. Wk3: Add band resistance."}]

TPI SCREEN-TO-FAULT MAP:
Pelvic Tilt FAIL → S-Posture, Early Extension | Torso Rotation FAIL → Loss of Posture, Flat Shoulder | Overhead Deep Squat FAIL → Early Extension | 90/90 FAIL → Chicken Wing, Flat Shoulder | Single Leg Balance FAIL → Sway, Slide | Lat Length FAIL → Loss of Posture | Bridge w/ Leg Extension FAIL → Early Extension, Sway | Lower Quarter Rotation FAIL → Sway, Slide

CORRECTIVE HIERARCHY: Mobility → Stability → Motor Control → Strength → Power
Address failed screens. 5-7 exercises per corrective day. 6-8 per performance day.

RETURN ONLY THE JSON ARRAY.`;

const ADAPT_SYSTEM = `You are Jordan Boyer's AI coaching assistant at StrongHold Fitness. A client reported their pre-workout status. Modify their workout.

RULES:
- Sleep 1-4 or Reflection 1-4: Reduce volume 30-40%, drop last 1-2 exercises, lower intensity
- Sleep 5-6 or Reflection 5-6: Reduce intensity 10-15%, keep volume
- Fasted: Note potential early fatigue, slightly reduce compound volume
- Injuries/Tightness: SWAP any exercise loading that area. Add 2-3 mobility drills for it to warm-up.

OUTPUT FORMAT — JSON:
{
  "needed": true,
  "warmupAdditions": [
    { "name": "Banded Hip Circles", "prescription": "10 each direction", "cue": "Reason for addition" }
  ],
  "swaps": [
    { "original": "Barbell Back Squat", "replacement": "Goblet Squat", "prescription": "3x10", "reason": "Low back tightness — reduce axial loading" }
  ],
  "removals": [
    { "name": "Barbell Deadlift", "reason": "Volume reduction for poor sleep" }
  ],
  "coachNote": "Your body is talking today. We adjusted the plan so you still get quality work in without grinding through pain. Smart training beats hard training."
}

If no modifications needed: { "needed": false, "coachNote": "You're good to go. Full send today." }
RETURN ONLY JSON.`;

/* ══════════════════════════════════════════════════════════
   TPI SCREENS DATA
   ══════════════════════════════════════════════════════════ */
const TPI_SCREENS = [
  "Pelvic Tilt","Pelvic Rotation","Torso Rotation","Overhead Deep Squat",
  "Toe Touch","90/90 (Shoulder)","Single Leg Balance","Lat Length",
  "Lower Quarter Rotation","Seated Trunk Rotation","Bridge w/ Leg Extension",
  "Reach, Roll & Lift","Cervical Rotation","Wrist Flexion","Wrist Extension","Forearm Rotation",
];

/* ══════════════════════════════════════════════════════════
   HELPER: Call AI
   ══════════════════════════════════════════════════════════ */
async function callAI(system, prompt, maxTokens = 8192) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, system, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) {
      console.error("API HTTP error:", res.status);
      return { error: "API returned status " + res.status };
    }
    const data = await res.json();
    if (data.error) {
      console.error("API error:", data.error);
      return { error: data.error.message || "API error" };
    }
    const text = (data.content || []).map(b => b.text || "").join("");
    if (!text) return { error: "Empty response from AI" };
    
    // Strip markdown code fences
    let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    
    // Try parsing the full cleaned text
    try { return JSON.parse(cleaned); } catch(e1) {
      // Try extracting array
      const arrMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        try { return JSON.parse(arrMatch[0]); } catch(e2) {
          // Try repairing truncated JSON by closing open brackets
          let repaired = arrMatch[0];
          const openBrackets = (repaired.match(/\[/g) || []).length;
          const closeBrackets = (repaired.match(/\]/g) || []).length;
          const openBraces = (repaired.match(/\{/g) || []).length;
          const closeBraces = (repaired.match(/\}/g) || []).length;
          // Remove trailing comma or incomplete value
          repaired = repaired.replace(/,\s*$/, "");
          repaired = repaired.replace(/,\s*"[^"]*$/, "");
          repaired = repaired.replace(/:\s*"[^"]*$/, ': ""');
          repaired = repaired.replace(/:\s*$/, ': ""');
          // Close open structures
          for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";
          for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += "]";
          try { return JSON.parse(repaired); } catch(e3) {
            console.error("JSON repair failed:", e3.message);
            return { error: "Failed to parse program JSON", rawText: text.substring(0, 500) };
          }
        }
      }
      // Try extracting object
      const objMatch = cleaned.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try { const obj = JSON.parse(objMatch[0]); return [obj]; } catch(e3) {}
      }
      return { error: "No valid JSON found in response", rawText: text.substring(0, 500) };
    }
  } catch(err) {
    console.error("Fetch error:", err);
    return { error: "Network error: " + err.message };
  }
}

/* ══════════════════════════════════════════════════════════
   REUSABLE UI COMPONENTS
   ══════════════════════════════════════════════════════════ */
const Label = ({ children }) => (
  <label style={{ fontSize: 11, color: C.teal, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, display: "block", marginBottom: 5 }}>{children}</label>
);

function Sel({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: "100%", padding: "10px 12px", background: C.card, color: C.cream,
        border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14,
        fontFamily: "'Outfit', sans-serif", outline: "none", appearance: "auto",
      }}>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function Inp({ label, value, onChange, placeholder, multi }) {
  const s = { width: "100%", padding: "10px 12px", background: C.card, color: C.cream, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "'Outfit', sans-serif", outline: "none" };
  return (
    <div style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      {multi ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...s, resize: "vertical" }} /> :
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s} />}
    </div>
  );
}

function Tags({ label, options, selected, onChange }) {
  const toggle = v => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  return (
    <div style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map(o => {
          const on = selected.includes(o);
          return <button key={o} onClick={() => toggle(o)} style={{
            padding: "7px 14px", border: `1px solid ${on ? C.teal : C.border}`,
            background: on ? C.teal + "22" : "transparent", color: on ? C.tealLight : C.muted,
            borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
          }}>{o}</button>;
        })}
      </div>
    </div>
  );
}

function TriButton({ label, value, onChange }) {
  const opts = [{ v: "pass", l: "Pass", c: C.green }, { v: "fail", l: "Fail", c: C.red }, { v: "pain", l: "Pain", c: C.amber }];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.cream, fontWeight: 500, flex: 1 }}>{label}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {opts.map(o => (
          <button key={o.v} onClick={() => onChange(o.v)} style={{
            padding: "5px 12px", border: `1px solid ${value === o.v ? o.c : C.border}`,
            background: value === o.v ? o.c + "22" : "transparent",
            color: value === o.v ? o.c : C.muted, borderRadius: 6, fontSize: 11, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Outfit', sans-serif",
          }}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}

function Btn({ children, onClick, disabled, color = C.teal }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "14px", border: "none", borderRadius: 10, marginTop: 8,
      background: disabled ? C.border : `linear-gradient(135deg, ${color}, ${color}cc)`,
      color: "#fff", fontSize: 15, fontWeight: 600, cursor: disabled ? "default" : "pointer",
      fontFamily: "'Outfit', sans-serif", opacity: disabled ? 0.6 : 1, transition: "all 0.2s",
    }}>{children}</button>
  );
}

/* ══════════════════════════════════════════════════════════
   PHASE 1: CLIENT INTAKE
   ══════════════════════════════════════════════════════════ */
function IntakeForm({ onGenerate, loading }) {
  const [mode, setMode] = useState("gen"); // gen | tpi
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [goals, setGoals] = useState([]);
  const [experience, setExperience] = useState("beginner");
  const [daysPerWeek, setDaysPerWeek] = useState("3");
  const [sessionLen, setSessionLen] = useState("45");
  const [equipment, setEquipment] = useState("full_gym");
  const [injuries, setInjuries] = useState([]);
  const [notes, setNotes] = useState("");
  // TPI fields
  const [handicap, setHandicap] = useState("");
  const [golfGoals, setGolfGoals] = useState("");
  const [screens, setScreens] = useState({});
  const [swingFaults, setSwingFaults] = useState([]);

  const failCount = Object.values(screens).filter(v => v === "fail" || v === "pain").length;

  const handleGenerate = () => {
    if (mode === "gen") {
      const prompt = `Design a 1-week training split for this client. Include progression notes for weeks 2-4 on each day.\n\nName: ${name}\nAge: ${age || "N/A"}\nGender: ${gender}\nExperience: ${experience}\nGoals: ${goals.join(", ")}\nDays/Week: ${daysPerWeek}\nSession Length: ${sessionLen} min\nEquipment: ${equipment.replace(/_/g, " ")}\nInjuries: ${injuries.length ? injuries.join(", ") : "None"}\nNotes: ${notes || "None"}\n\nReturn ONLY the JSON array.`;
      onGenerate(GEN_POP_SYSTEM, prompt, name);
    } else {
      const screenResults = TPI_SCREENS.map(s => `${s}: ${(screens[s] || "not tested").toUpperCase()}`).join("\n");
      const prompt = `Design a TPI corrective week (3 days) + performance week (3 days) + pre-round warm-up for this golfer.\n\nName: ${name}\nAge: ${age || "N/A"}\nHandicap: ${handicap || "N/A"}\nGoals: ${golfGoals || "Improve swing consistency"}\nEquipment: ${equipment.replace(/_/g, " ")}\nSwing Faults: ${swingFaults.length ? swingFaults.join(", ") : "Determine from screens"}\n\nTPI SCREEN RESULTS:\n${screenResults}\n\nReturn ONLY the JSON array.`;
      onGenerate(TPI_SYSTEM, prompt, name);
    }
  };

  const canGenerate = name && (mode === "gen" ? goals.length > 0 : failCount > 0);

  return (
    <div>
      {/* Mode Toggle */}
      <div style={{ display: "flex", gap: 4, background: C.card, borderRadius: 12, padding: 4, marginBottom: 20, border: `1px solid ${C.border}` }}>
        {[{ id: "gen", l: "💪 General Population" }, { id: "tpi", l: "⛳ TPI Golf Fitness" }].map(t => (
          <button key={t.id} onClick={() => setMode(t.id)} style={{
            flex: 1, padding: "12px", border: "none", borderRadius: 10,
            background: mode === t.id ? (t.id === "gen" ? C.teal + "20" : C.green + "20") : "transparent",
            color: mode === t.id ? C.cream : C.muted, fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Outfit', sans-serif",
          }}>{t.l}</button>
        ))}
      </div>

      {/* Common Fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Inp label="Client Name" value={name} onChange={setName} placeholder="John Smith" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Inp label="Age" value={age} onChange={setAge} placeholder="35" />
          {mode === "gen" ?
            <Sel label="Gender" value={gender} onChange={setGender} options={[{ v: "male", l: "Male" }, { v: "female", l: "Female" }, { v: "other", l: "Other" }]} /> :
            <Inp label="Handicap" value={handicap} onChange={setHandicap} placeholder="14" />
          }
        </div>
      </div>

      {mode === "gen" ? (
        <>
          <Tags label="Goals" options={["Build Strength", "Fat Loss", "Muscle Gain", "Mobility", "Injury Rehab", "General Fitness", "Athletic Performance", "Endurance"]} selected={goals} onChange={setGoals} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Sel label="Experience" value={experience} onChange={setExperience} options={[{ v: "beginner", l: "Beginner (0-12 mo)" }, { v: "intermediate", l: "Intermediate (1-3 yr)" }, { v: "advanced", l: "Advanced (3+ yr)" }]} />
            <Sel label="Days / Week" value={daysPerWeek} onChange={setDaysPerWeek} options={[2,3,4,5,6].map(n => ({ v: String(n), l: n + " days" }))} />
            <Sel label="Session Length" value={sessionLen} onChange={setSessionLen} options={[30,45,60,75,90].map(n => ({ v: String(n), l: n + " min" }))} />
          </div>
          <Tags label="Injuries / Limitations" options={["Low Back", "Shoulder", "Knee", "Hip", "Neck", "Wrist", "Ankle", "Post-Surgery"]} selected={injuries} onChange={setInjuries} />
        </>
      ) : (
        <>
          <Inp label="Golf / Performance Goals" value={golfGoals} onChange={setGolfGoals} placeholder="More distance, less back pain, better consistency..." multi />
          <Tags label="Observed Swing Characteristics" options={["S-Posture","C-Posture","Loss of Posture","Flat Shoulder","Early Extension","Sway","Slide","Reverse Spine","Hanging Back","Casting","Chicken Wing","Over the Top"]} selected={swingFaults} onChange={setSwingFaults} />
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Label>TPI Movement Screen</Label>
              <span style={{ fontSize: 12, color: failCount > 0 ? C.red : C.muted }}>{failCount} limitation{failCount !== 1 ? "s" : ""}</span>
            </div>
            {TPI_SCREENS.map(s => <TriButton key={s} label={s} value={screens[s] || ""} onChange={v => setScreens(p => ({ ...p, [s]: v }))} />)}
          </div>
        </>
      )}

      <Sel label="Equipment" value={equipment} onChange={setEquipment} options={[
        { v: "full_gym", l: "Full Gym" }, { v: "home_gym", l: "Home Gym" }, { v: "dumbbells_only", l: "Dumbbells Only" },
        { v: "bands_bodyweight", l: "Bands + Bodyweight" }, { v: "bodyweight_only", l: "Bodyweight Only" }, { v: "hotel_gym", l: "Hotel Gym" },
      ]} />
      <Inp label="Additional Notes" value={notes} onChange={setNotes} placeholder="Medical conditions, preferences, history..." multi />

      <Btn onClick={handleGenerate} disabled={!canGenerate || loading} color={mode === "gen" ? C.teal : C.green}>
        {loading ? "Building Your Program..." : "Generate Program"}
      </Btn>

      {loading && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <div style={{ display: "inline-flex", gap: 6 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: C.teal, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
          </div>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 12 }}>Analyzing client profile and building a periodized program...</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PHASE 2: WORKOUT PORTAL
   ══════════════════════════════════════════════════════════ */
function WorkoutPortal({ program, clientName, onBack }) {
  const [activeDay, setActiveDay] = useState(0);
  const [tracking, setTracking] = useState(true);
  const [weekLabel, setWeekLabel] = useState("1");
  const [checkIn, setCheckIn] = useState({ reflection: 0, sleep: 0, nutrition: "", issues: "" });
  const [postRpe, setPostRpe] = useState(0);
  const [exerciseState, setExerciseState] = useState(() =>
    program.map(day => (day.exercises || []).map(() => ({ done: false, weight: "", actualReps: "", notes: "", lastWk: "" })))
  );
  const [adaptations, setAdaptations] = useState(null);
  const [adapting, setAdapting] = useState(false);

  const day = program[activeDay];
  const exState = exerciseState[activeDay] || [];
  const doneCount = exState.filter(e => e.done).length;
  const totalCount = exState.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const updateEx = (idx, field, val) => {
    setExerciseState(prev => {
      const updated = prev.map(d => [...d]);
      updated[activeDay] = [...updated[activeDay]];
      updated[activeDay][idx] = { ...updated[activeDay][idx], [field]: val };
      return updated;
    });
  };

  const adaptWorkout = useCallback(async () => {
    const needs = checkIn.reflection <= 6 || checkIn.sleep <= 5 || checkIn.issues.trim() || checkIn.nutrition === "Fasted";
    if (!needs) { setAdaptations({ needed: false, coachNote: "You're good to go. Full send today." }); return; }
    setAdapting(true);
    const exList = (day.exercises || []).map((e, i) => `${i + 1}. ${e.name} — ${e.sets}x${e.reps}, ${e.rest} rest`).join("\n");
    const prompt = `Self-Reflection: ${checkIn.reflection}/10\nSleep: ${checkIn.sleep}/10\nNutrition: ${checkIn.nutrition || "N/A"}\nIssues: ${checkIn.issues || "None"}\n\nPlanned Workout (${day.name}):\n${exList}`;
    const result = await callAI(ADAPT_SYSTEM, prompt, 2000);
    if (result && !result.error) {
      setAdaptations(result);
    } else {
      setAdaptations({ needed: false, coachNote: "Couldn't analyze check-in. Proceed with the planned workout and listen to your body." });
    }
    setAdapting(false);
  }, [day, checkIn]);

  const handlePrint = () => {
    const w = window.open("", "_blank");
    const exRows = (day.exercises || []).map((e, i) =>
      `<tr><td>${i+1}</td><td><strong>${e.name}</strong><br><span style="color:#666;font-size:10px">${e.cue || ""}</span></td><td>${e.sets}×${e.reps}</td><td></td><td></td><td></td><td>☐</td><td></td></tr>`
    ).join("");
    w.document.write(`<!DOCTYPE html><html><head><style>
      body{font-family:'Helvetica Neue',Arial,sans-serif;padding:24px;color:#111;font-size:11px}
      h1{font-size:18px;color:#1D1160;margin:0}
      .header{display:flex;justify-content:space-between;border-bottom:2px solid #1D1160;padding-bottom:12px;margin-bottom:16px}
      .checkin{display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:8px;margin-bottom:16px;padding:10px;border:1px solid #ddd;border-radius:6px}
      .checkin strong{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#1D1160;display:block;margin-bottom:2px}
      .issues{border:1px solid #ddd;border-radius:6px;padding:10px;margin-bottom:16px;min-height:50px}
      .issues strong{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#1D1160}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{background:#1D1160;color:white;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:1px}
      td{padding:8px;border-bottom:1px solid #eee;font-size:11px;vertical-align:top}
      .fill{border-bottom:1px dashed #ccc;min-width:40px;display:inline-block;height:16px}
      .rpe{border:1px solid #ddd;border-radius:6px;padding:10px}
      .rpe strong{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#1D1160}
      .footer{margin-top:16px;text-align:center;font-size:9px;color:#999;border-top:1px solid #ddd;padding-top:8px}
    </style></head><body>
      <div class="header"><div><h1>StrongHold Fitness</h1><p>${day.name}</p></div><div style="text-align:right"><p><strong>Client:</strong> ${clientName}</p><p><strong>Date:</strong> ______________ <strong>Week:</strong> ${weekLabel}</p></div></div>
      <div class="checkin"><div><strong>Self-Reflection (1-10)</strong><span class="fill"></span></div><div><strong>Sleep Quality (1-10)</strong><span class="fill"></span></div><div><strong>Pre-Workout Nutrition</strong>Fasted / Light / Full</div><div><strong>Bodyweight</strong><span class="fill"></span></div><div><strong>Hydration</strong>Good / Fair / Poor</div></div>
      <div class="issues"><strong>Injuries / Stiffness / Tightness Notes:</strong><br><br><div style="border-bottom:1px dashed #ccc;height:18px"></div><div style="border-bottom:1px dashed #ccc;height:18px"></div></div>
      <table><thead><tr><th>#</th><th>Exercise</th><th>Rx</th><th>Last Wk</th><th>Weight</th><th>Reps</th><th>✓</th><th>Notes</th></tr></thead><tbody>${exRows}</tbody></table>
      <div class="rpe"><strong>Post-Workout Session RPE (1-10):</strong> <span class="fill" style="width:40px"></span><br><br><strong>Session Notes:</strong><br><div style="border-bottom:1px dashed #ccc;height:18px"></div><div style="border-bottom:1px dashed #ccc;height:18px"></div><div style="border-bottom:1px dashed #ccc;height:18px"></div></div>
      <div class="footer">STRONGHOLD FITNESS · Jordan Boyer · NSCA Certified · TPI Golf Fitness · strongholdfitness.co</div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const scaleRow = (n, current, onChange, color = C.teal) => (
    <div style={{ display: "flex", gap: 3 }}>
      {[1,2,3,4,5,6,7,8,9,10].map(v => (
        <button key={v} onClick={() => onChange(v)} style={{
          flex: 1, padding: "7px 0", border: `1px solid ${current === v ? color : C.border}`,
          background: current === v ? color + "22" : "transparent",
          color: current === v ? C.cream : C.muted, borderRadius: 5, fontSize: 11, fontWeight: 600,
          cursor: "pointer", fontFamily: "'Outfit', sans-serif",
        }}>{v}</button>
      ))}
    </div>
  );

  return (
    <div>
      {/* Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>← New Client</button>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ fontSize: 13, color: C.cream, fontWeight: 500 }}>{clientName}</span>
          <span style={{ fontSize: 13, color: C.muted }}>· Week</span>
          <input value={weekLabel} onChange={e => setWeekLabel(e.target.value)} style={{ width: 28, background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, color: C.tealLight, fontSize: 13, fontFamily: "'Outfit', sans-serif", outline: "none", textAlign: "center" }} />
        </div>
      </div>

      {/* Day Tabs */}
      <div style={{ display: "flex", gap: 5, overflowX: "auto", marginBottom: 14, paddingBottom: 4 }}>
        {program.map((d, i) => (
          <button key={i} onClick={() => { setActiveDay(i); setAdaptations(null); setCheckIn({ reflection: 0, sleep: 0, nutrition: "", issues: "" }); setPostRpe(0); }}
            style={{
              padding: "9px 16px", border: `1px solid ${activeDay === i ? C.teal : C.border}`,
              background: activeDay === i ? C.teal + "22" : "transparent",
              color: activeDay === i ? C.cream : C.muted, borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Outfit', sans-serif", whiteSpace: "nowrap", flexShrink: 0,
            }}>{d.name?.replace(/—.*/, "").trim() || `Day ${i + 1}`}</button>
        ))}
      </div>

      {/* Session Title + Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: C.cream, margin: 0 }}>{day?.name}</h2>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setTracking(!tracking)} style={{ padding: "5px 12px", border: `1px solid ${C.border}`, background: "transparent", color: C.muted, borderRadius: 6, fontSize: 10, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>
            {tracking ? "View" : "Track"}
          </button>
          <button onClick={handlePrint} style={{ padding: "5px 12px", border: `1px solid ${C.border}`, background: "transparent", color: C.muted, borderRadius: 6, fontSize: 10, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>Print</button>
        </div>
      </div>

      {/* Progress Bar */}
      {tracking && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: C.muted }}>{doneCount}/{totalCount}</span>
            <span style={{ fontSize: 11, color: pct === 100 ? C.greenBright : C.teal, fontWeight: 600 }}>{pct}%</span>
          </div>
          <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: pct + "%", background: pct === 100 ? C.greenBright : C.teal, borderRadius: 3, transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      {/* Pre-Workout Check-In */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 14px", marginBottom: 14 }}>
        <p style={{ fontSize: 10, color: C.teal, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, margin: "0 0 12px" }}>Pre-Workout Check-In</p>

        <p style={{ fontSize: 12, color: C.cream, marginBottom: 6 }}>How are you feeling? {checkIn.reflection > 0 && <span style={{ color: checkIn.reflection <= 4 ? C.red : checkIn.reflection <= 6 ? C.amber : C.greenBright }}>{checkIn.reflection}/10</span>}</p>
        {scaleRow(10, checkIn.reflection, v => setCheckIn(p => ({ ...p, reflection: v })), checkIn.reflection <= 4 ? C.red : checkIn.reflection <= 6 ? C.amber : C.greenBright)}

        <p style={{ fontSize: 12, color: C.cream, margin: "12px 0 6px" }}>Sleep quality {checkIn.sleep > 0 && <span style={{ color: C.muted }}>{checkIn.sleep}/10</span>}</p>
        {scaleRow(10, checkIn.sleep, v => setCheckIn(p => ({ ...p, sleep: v })))}

        <p style={{ fontSize: 12, color: C.cream, margin: "12px 0 6px" }}>Pre-workout nutrition</p>
        <div style={{ display: "flex", gap: 6 }}>
          {["Fasted", "Light Meal", "Full Meal"].map(o => (
            <button key={o} onClick={() => setCheckIn(p => ({ ...p, nutrition: o }))} style={{
              flex: 1, padding: "8px", border: `1px solid ${checkIn.nutrition === o ? C.teal : C.border}`,
              background: checkIn.nutrition === o ? C.teal + "22" : "transparent",
              color: checkIn.nutrition === o ? C.tealLight : C.muted,
              borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
            }}>{o}</button>
          ))}
        </div>

        <p style={{ fontSize: 12, color: C.cream, margin: "12px 0 6px" }}>Injuries / stiffness / tightness</p>
        <textarea value={checkIn.issues} onChange={e => setCheckIn(p => ({ ...p, issues: e.target.value }))}
          placeholder="Left shoulder tight, lower back stiff..."
          style={{ width: "100%", padding: "8px 10px", background: C.cardLight, color: C.cream, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: "'Outfit', sans-serif", outline: "none", resize: "vertical", minHeight: 48 }} />
      </div>

      {/* Adapt Button */}
      {(checkIn.reflection > 0 || checkIn.sleep > 0 || checkIn.issues.trim()) && !adaptations && (
        <Btn onClick={adaptWorkout} disabled={adapting} color={C.amber}>
          {adapting ? "Analyzing..." : "Adapt Workout Based on Check-In"}
        </Btn>
      )}

      {/* Adaptations */}
      {adaptations && (
        <div style={{
          background: !adaptations.needed ? C.green + "12" : C.amber + "12",
          border: `1px solid ${!adaptations.needed ? C.green + "40" : C.amber + "40"}`,
          borderRadius: 10, padding: "14px 16px", margin: "12px 0 14px",
        }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, color: !adaptations.needed ? C.greenBright : C.amber, margin: "0 0 6px" }}>
            {!adaptations.needed ? "All Clear" : "Coach's Modifications"}
          </p>
          <p style={{ fontSize: 13, color: C.cream, margin: 0, lineHeight: 1.6 }}>{adaptations.coachNote}</p>
          {adaptations.warmupAdditions?.map((w, i) => (
            <p key={i} style={{ fontSize: 12, color: C.tealLight, margin: "6px 0 0" }}>+ Warm-Up: {w.name} — {w.prescription}</p>
          ))}
          {adaptations.swaps?.map((s, i) => (
            <p key={i} style={{ fontSize: 12, color: C.amber, margin: "6px 0 0" }}>↻ {s.original} → {s.replacement} ({s.reason})</p>
          ))}
          {adaptations.removals?.map((r, i) => (
            <p key={i} style={{ fontSize: 12, color: C.red, margin: "6px 0 0" }}>✕ Remove: {r.name} ({r.reason})</p>
          ))}
        </div>
      )}

      {/* Warm-Up */}
      {day?.warmup?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10, color: C.purple, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, margin: "0 0 8px" }}>Warm-Up</p>
          {day.warmup.map((w, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 6 }}>
              <p style={{ fontSize: 13, color: C.cream, fontWeight: 500, margin: 0 }}>{w.name} <span style={{ color: C.muted, fontWeight: 400 }}>— {w.prescription || `${w.sets}×${w.reps}`}</span></p>
              {w.cue && <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 0", lineHeight: 1.5 }}>{w.cue}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Exercises */}
      {tracking && totalCount > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 6, paddingLeft: 36, fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
          <span style={{ width: "20%" }}>Last Wk</span>
          <span style={{ width: "20%" }}>Weight</span>
          <span style={{ width: "20%" }}>Reps</span>
          <span style={{ flex: 1 }}>Notes</span>
        </div>
      )}

      {(day?.exercises || []).map((ex, i) => {
        const st = exState[i] || {};
        return (
          <div key={i} style={{
            background: st.done ? C.green + "12" : C.card,
            border: `1px solid ${st.done ? C.green + "40" : C.border}`,
            borderRadius: 10, padding: "12px 14px", marginBottom: 6, transition: "all 0.2s",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              {tracking && (
                <button onClick={() => updateEx(i, "done", !st.done)} style={{
                  width: 22, height: 22, borderRadius: 5, border: `2px solid ${st.done ? C.greenBright : C.borderLight}`,
                  background: st.done ? C.greenBright : "transparent", cursor: "pointer", flexShrink: 0, marginTop: 1,
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12,
                }}>{st.done ? "✓" : ""}</button>
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: st.done ? C.greenBright : C.cream, fontWeight: 500, margin: 0, opacity: st.done ? 0.7 : 1 }}>
                  {ex.name} <span style={{ color: C.muted, fontWeight: 400 }}>— {ex.sets}×{ex.reps}, {ex.rest} rest {ex.rpe ? `(RPE ${ex.rpe})` : ""}</span>
                </p>
                {ex.cue && <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 0", lineHeight: 1.4 }}>{ex.cue}</p>}
              </div>
            </div>
            {tracking && (
              <div style={{ display: "flex", gap: 6, marginTop: 8, paddingLeft: tracking ? 32 : 0 }}>
                {[["lastWk", "Last wk", C.amber], ["weight", "Weight", C.tealLight], ["actualReps", "Reps", C.tealLight]].map(([f, ph, cl]) => (
                  <input key={f} value={st[f] || ""} onChange={e => updateEx(i, f, e.target.value)} placeholder={ph}
                    style={{ width: "20%", padding: "5px 7px", background: C.cardLight, color: cl, border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 11, fontFamily: "'Outfit', sans-serif", outline: "none", textAlign: "center" }} />
                ))}
                <input value={st.notes || ""} onChange={e => updateEx(i, "notes", e.target.value)} placeholder="Notes"
                  style={{ flex: 1, padding: "5px 7px", background: C.cardLight, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 11, fontFamily: "'Outfit', sans-serif", outline: "none" }} />
              </div>
            )}
          </div>
        );
      })}

      {/* Cooldown */}
      {day?.cooldown?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 10, color: C.purple, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, margin: "0 0 8px" }}>Cooldown</p>
          {day.cooldown.map((w, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 6 }}>
              <p style={{ fontSize: 13, color: C.cream, fontWeight: 500, margin: 0 }}>{w.name} <span style={{ color: C.muted, fontWeight: 400 }}>— {w.prescription || ""}</span></p>
            </div>
          ))}
        </div>
      )}

      {/* Progression */}
      {day?.progression && (
        <div style={{ background: C.teal + "10", border: `1px solid ${C.teal}30`, borderRadius: 10, padding: "12px 14px", marginTop: 12 }}>
          <p style={{ fontSize: 10, color: C.teal, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, margin: "0 0 4px" }}>Weekly Progression</p>
          <p style={{ fontSize: 12, color: C.cream, margin: 0, lineHeight: 1.5 }}>{day.progression}</p>
        </div>
      )}

      {/* Completion */}
      {tracking && doneCount === totalCount && totalCount > 0 && (
        <div style={{ textAlign: "center", padding: 20, margin: "14px 0", background: C.green + "15", border: `1px solid ${C.green}40`, borderRadius: 12 }}>
          <p style={{ fontSize: 20, margin: "0 0 6px" }}>💪</p>
          <p style={{ fontSize: 15, color: C.greenBright, fontWeight: 600, margin: 0 }}>Workout Complete</p>
        </div>
      )}

      {/* Post-Workout RPE */}
      {tracking && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px", marginTop: 14 }}>
          <p style={{ fontSize: 10, color: C.purple, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, margin: "0 0 8px" }}>Post-Workout RPE</p>
          {scaleRow(10, postRpe, setPostRpe, C.purple)}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════════════════════ */
export default function StrongHoldProgramSystem() {
  const [phase, setPhase] = useState("intake"); // intake | portal | error
  const [program, setProgram] = useState(null);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleGenerate = useCallback(async (system, prompt, name) => {
    setLoading(true);
    setErrorMsg("");
    setClientName(name);
    const result = await callAI(system, prompt, 8192);
    setLoading(false);
    
    if (!result) {
      setErrorMsg("No response received from AI. Please try again.");
      return;
    }
    if (result.error) {
      setErrorMsg("Error: " + result.error + (result.rawText ? "\n\nRaw response preview: " + result.rawText : ""));
      return;
    }
    
    // Handle array result
    if (Array.isArray(result) && result.length > 0) {
      setProgram(result);
      setPhase("portal");
      return;
    }
    // Handle single object (wrap in array)
    if (result && typeof result === "object" && result.name) {
      setProgram([result]);
      setPhase("portal");
      return;
    }
    
    setErrorMsg("Program generated but couldn't be parsed into training days. Please try again.");
  }, []);

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: C.bg, fontFamily: "'Outfit', sans-serif", padding: "24px 16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');
        @keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
      `}</style>

      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: C.cream, margin: 0, letterSpacing: 1 }}>
            StrongHold Program System
          </h1>
          <p style={{ color: C.teal, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginTop: 6 }}>
            {phase === "intake" ? "Client Intake → AI Program Generation" : "Live Workout Portal · Adaptive Coaching"}
          </p>
        </div>

        {phase === "intake" ? (
          <>
            <IntakeForm onGenerate={handleGenerate} loading={loading} />
            {errorMsg && (
              <div style={{
                marginTop: 16, padding: "16px 18px", borderRadius: 12,
                background: C.red + "15", border: `1px solid ${C.red}40`,
              }}>
                <p style={{ fontSize: 12, color: C.red, fontWeight: 600, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1 }}>Generation Failed</p>
                <p style={{ fontSize: 13, color: C.cream, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{errorMsg}</p>
                <button onClick={() => setErrorMsg("")} style={{
                  marginTop: 10, padding: "8px 16px", border: `1px solid ${C.border}`,
                  background: "transparent", color: C.muted, borderRadius: 6, fontSize: 12,
                  cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                }}>Dismiss</button>
              </div>
            )}
          </>
        ) : (
          <WorkoutPortal program={program} clientName={clientName} onBack={() => { setPhase("intake"); setProgram(null); }} />
        )}

        <div style={{ textAlign: "center", marginTop: 28, padding: "16px 0" }}>
          <p style={{ fontSize: 10, color: C.muted, letterSpacing: 1 }}>STRONGHOLD FITNESS · NSCA + TPI CERTIFIED · AI-POWERED PROGRAMMING</p>
        </div>
      </div>
    </div>
  );
}
