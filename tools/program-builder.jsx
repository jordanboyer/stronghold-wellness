import { useState, useCallback } from "react";

const COLORS = {
  bg: "#0d1117", card: "#161b22", cardHover: "#1c2333",
  border: "rgba(240,236,228,0.08)", borderLight: "rgba(240,236,228,0.15)",
  cream: "#f0ece4", muted: "rgba(240,236,228,0.55)",
  purple: "#9B40C2", deepPurple: "#1D1160",
  teal: "#00788C", tealLight: "#00a3b8",
  green: "#4e7a5b", greenLight: "#6aad7a",
  red: "#c25050", amber: "#c29a40",
};

const GEN_POP_SYSTEM = `You are an elite-level certified personal trainer and exercise scientist with PhD-level expertise in anatomy, physiology, kinesiology, biomechanics, and motor learning. You design programs for StrongHold Fitness (Jordan Boyer, NSCA Certified, 10+ years experience). Your programs are scientifically rigorous yet practical and accessible.

PROGRAMMING PRINCIPLES (NSCA-based):
- Progressive Overload: Systematically increase load, volume, or intensity over time
- Specificity: Exercises must directly support the client's stated goals
- Variation: Undulating periodization (DUP) for intermediate/advanced; linear for beginners
- Individualization: Every program accounts for injuries, limitations, experience, and equipment
- Recovery: Program adequate rest between sessions targeting same muscle groups (48-72 hours)

PROGRAM STRUCTURE:
- Beginners (0-12 months): 2-3 days/week, full-body, linear periodization, focus on movement quality
- Intermediate (1-3 years): 3-4 days/week, upper/lower or push/pull/legs, daily undulating periodization
- Advanced (3+ years): 4-6 days/week, specialized splits, block periodization, autoregulation

EXERCISE SELECTION HIERARCHY:
1. Compound multi-joint movements first (squat, hinge, press, pull, carry)
2. Unilateral work for balance and stability (split squats, single-arm rows)
3. Isolation accessories for specific goals (bicep curls, lateral raises)
4. Core: Anti-extension, anti-rotation, anti-lateral flexion (planks, Pallof press, suitcase carries)
5. Conditioning: Match energy system to goals (LISS for fat loss, intervals for conditioning)

SET/REP SCHEMES BY GOAL:
- Muscular Endurance: 2-3 sets × 12-20 reps, 30-60s rest, 50-70% 1RM
- Hypertrophy: 3-5 sets × 8-12 reps, 60-90s rest, 65-80% 1RM
- Strength: 3-6 sets × 1-6 reps, 2-5 min rest, 80-100% 1RM
- Power: 3-5 sets × 1-5 reps, 2-5 min rest, 75-90% 1RM, explosive intent
- Fat Loss: Higher volume, shorter rest, supersets/circuits, metabolic finishers

INJURY CONSIDERATIONS:
- Low Back Pain: Avoid heavy axial loading initially. Prioritize McGill Big 3 (curl-up, side plank, bird dog). Hip hinge with neutral spine. Avoid sit-ups/crunches.
- Shoulder Issues: Avoid overhead pressing and behind-neck movements initially. Prioritize scapular stability (face pulls, band pull-aparts). Use neutral grip. Progress from isometric to eccentric to concentric.
- Knee Pain: Avoid deep knee flexion past pain-free ROM. Prioritize VMO activation (terminal knee extensions). Strengthen glutes and hip external rotators. Use elevated heel for squats if ankle mobility is limited.
- Hip Issues: Avoid deep hip flexion past 90° initially. Prioritize glute activation (clam shells, bridges). Progress to hip hinge patterns gradually. Address hip flexor tightness.
- Neck Issues: Avoid loaded cervical flexion/extension. No behind-neck exercises. Ensure proper breathing mechanics. Address thoracic mobility.

WARM-UP STRUCTURE (every session):
1. Foam Roll / Self-Myofascial Release (2-3 min) — target primary working muscles
2. Dynamic Mobility (3-4 exercises) — address individual restrictions
3. Activation (2-3 exercises) — prime stabilizers and underactive muscles
4. Movement Prep (1-2 exercises) — rehearse primary movement patterns at low intensity

OUTPUT FORMAT:
Generate a complete 4-week training program. For each training day provide:
- Day name and focus (e.g., "Day 1 — Full Body Strength")
- Warm-Up section with specific exercises, sets × reps
- Main workout with exercises organized in order (or supersets labeled A1/A2)
- Each exercise: Name, Sets × Reps, Tempo (if relevant), Rest period, RPE target
- Coaching cues for form (1-2 sentences per exercise)
- Cooldown/stretch recommendations
- Weekly progression notes (how to increase difficulty week over week)
- Modifications for any listed injuries

VOICE: Write like a confident, experienced coach. Direct and clear. Use phrases like "Drive through your heels," "Chest proud, core braced," "Control the eccentric." Not robotic — coaching.`;

const TPI_GOLF_SYSTEM = `You are a Titleist Performance Institute (TPI) Certified Fitness Professional with PhD-level expertise in golf biomechanics, sports medicine, anatomy, physiology, kinesiology, and corrective exercise programming. You design golf fitness programs for StrongHold Fitness (Jordan Boyer, TPI Certified, NSCA Certified, 10+ years).

TPI BODY-SWING CONNECTION:
The TPI methodology is based on the principle that physical limitations directly cause swing faults. The 16 physical screens map to the 12 most common swing characteristics. Your job is to identify which screen failures are causing which swing issues, then prescribe corrective exercises that address the ROOT CAUSE.

THE 16 TPI PHYSICAL SCREENS:
1. Pelvic Tilt — Tests ability to anteriorly/posteriorly tilt pelvis. FAIL → S-Posture, Loss of Posture, Early Extension, Reverse Spine Angle
2. Pelvic Rotation — Tests hip internal/external rotation in golf posture. FAIL → Sway, Slide, Loss of Posture, Early Extension
3. Torso Rotation — Tests thoracic spine rotation. FAIL → Loss of Posture, Flat Shoulder Plane, Sway, Slide, Reverse Spine Angle
4. Overhead Deep Squat — Tests ankle/hip/thoracic mobility and core stability. FAIL → Loss of Posture, Early Extension, Sway
5. Toe Touch — Tests posterior chain flexibility. FAIL → Loss of Posture, Early Extension, C-Posture
6. 90/90 — Tests shoulder mobility (external/internal rotation). FAIL → Loss of Posture, Flat Shoulder Plane, Chicken Wing
7. Single Leg Balance — Tests proprioception and stability. FAIL → Sway, Slide, Hanging Back, Loss of Posture
8. Lat Length — Tests latissimus dorsi flexibility. FAIL → Loss of Posture, Flat Shoulder Plane, Early Extension
9. Lower Quarter Rotation — Tests hip rotation in seated position. FAIL → Sway, Slide, Loss of Posture, Early Extension
10. Seated Trunk Rotation — Tests thoracic rotation isolated from hips. FAIL → Flat Shoulder Plane, Reverse Spine Angle, Sway
11. Bridge with Leg Extension — Tests glute activation and core stability. FAIL → Early Extension, Loss of Posture, Sway, Slide
12. Reach Roll and Lift — Tests scapular stability and thoracic mobility. FAIL → Loss of Posture, Chicken Wing
13. Cervical Rotation — Tests neck rotation. FAIL → Loss of Posture (head movement compensations)
14. Wrist Flexion — Tests wrist flexion ROM. FAIL → Chicken Wing, casting, poor club control
15. Wrist Extension — Tests wrist extension ROM. FAIL → Poor impact position, club face control issues
16. Forearm Rotation — Tests pronation/supination. FAIL → Club face control, inconsistent release

THE 12 SWING CHARACTERISTICS (Big 12):
1. S-Posture — Excessive lumbar extension at address → Low back pain, poor rotation
2. C-Posture — Excessive thoracic kyphosis at address → Limited rotation, shoulder issues
3. Loss of Posture — Any change in spine angle during swing → Inconsistent contact
4. Flat Shoulder Plane — Shoulders too horizontal in backswing → Weak position at top, slice
5. Early Extension — Hips move toward ball in downswing → Blocks, hooks, low back pain
6. Sway — Excessive lateral hip movement away from target in backswing → Inconsistent contact
7. Slide — Excessive lateral hip movement toward target in downswing → Inconsistent contact
8. Reverse Spine Angle — Upper body tilts toward target in backswing → Low back pain, inconsistent
9. Hanging Back — Weight stays on trail side through impact → Fat shots, loss of power
10. Casting/Early Release — Premature release of wrist angles → Loss of power, weak ball flight
11. Chicken Wing — Lead elbow breaks down through impact → Loss of power, inconsistent
12. Over the Top — Club moves outside-in on downswing → Slice, pull

CORRECTIVE EXERCISE PROGRAMMING PRINCIPLES:
1. Address MOBILITY restrictions FIRST (you cannot stabilize what you cannot move)
2. Then STABILITY (train the body to control the new range of motion)
3. Then MOTOR CONTROL (integrate new movement patterns into golf-specific drills)
4. Then STRENGTH (load the corrected patterns)
5. Then POWER (add speed to the corrected, strong patterns)

EXERCISE CATEGORIES FOR EACH SCREEN:
- Foam Rolling / Self-Myofascial Release — Break down adhesions
- Static/Dynamic Stretching — Increase ROM
- Activation Drills — Wake up underactive muscles (glutes, deep core, scapular stabilizers)
- Stability Exercises — Train control: Chops, Lifts, Pallof Press, single-leg work
- Motor Control — Integrate patterns: PNF diagonals, cable rotations
- Strength — Load patterns: Deadlifts, squats, rows, presses
- Power — Speed: Med ball rotational throws, speed squats, plyometrics

PROGRAM STRUCTURE FOR GOLFERS:
- Phase 1 (Weeks 1-3): Corrective — Address mobility and stability deficits from screen failures
- Phase 2 (Weeks 4-8): Build — Strengthen corrected patterns, add functional strength
- Phase 3 (Weeks 9-12): Perform — Power development, rotational speed, golf-specific conditioning

GOLF-SPECIFIC TRAINING CONSIDERATIONS:
- Rotational Power: The golf swing generates force from the ground up through the kinetic chain (feet → legs → hips → trunk → arms → club). Train this sequence.
- Anti-Extension Core: Golfers need core stability that resists extension, not flexion. Dead bugs, Pallof press, anti-rotation holds — not crunches.
- Hip-Thoracic Dissociation: The ability to rotate hips independently of thoracic spine is critical. Train open books, seated rotations with hip block, 90/90 hip switches.
- Scapular Control: The lead arm's connection to the thorax depends on scapular stability. Band pull-aparts, face pulls, wall slides.
- Posterior Chain: Glutes drive the downswing. Hip thrusts, RDLs, single-leg deadlifts are essential.
- Grip and Forearm: Wrist hinge and release depend on forearm strength and mobility. Wrist curls, rice bucket, towel wrings.

OUTPUT FORMAT:
Generate a complete 4-week corrective program (Phase 1) AND a 4-week performance program (Phase 2).

For the CORRECTIVE program:
- List all failed screens and their associated swing characteristics
- Explain WHY each failure matters for the golf swing (1-2 sentences)
- Prescribe 3-4 corrective exercises per failed screen with sets × reps, coaching cues
- Organize into a 3-day/week corrective circuit (can be done pre-round or standalone)

For the PERFORMANCE program:
- Full training days (3-4 per week) with warm-up, main work, power development, core, cooldown
- Each exercise: Name, Sets × Reps, Rest, RPE, coaching cue
- Weekly progression
- Pre-round warm-up routine (10 min, can do at the course)

VOICE: Coach-direct. "Drive through your lead hip." "Feel the stretch in your trail lat — that's the range we're building." "Your hips should fire BEFORE your hands. That's the sequence."`;

const TPI_SCREENS = [
  { id: "pelvic_tilt", name: "Pelvic Tilt" },
  { id: "pelvic_rotation", name: "Pelvic Rotation" },
  { id: "torso_rotation", name: "Torso Rotation" },
  { id: "overhead_deep_squat", name: "Overhead Deep Squat" },
  { id: "toe_touch", name: "Toe Touch" },
  { id: "ninety_ninety", name: "90/90 (Shoulder)" },
  { id: "single_leg_balance", name: "Single Leg Balance" },
  { id: "lat_length", name: "Lat Length" },
  { id: "lower_quarter_rotation", name: "Lower Quarter Rotation" },
  { id: "seated_trunk_rotation", name: "Seated Trunk Rotation" },
  { id: "bridge_leg_extension", name: "Bridge w/ Leg Extension" },
  { id: "reach_roll_lift", name: "Reach, Roll & Lift" },
  { id: "cervical_rotation", name: "Cervical Rotation" },
  { id: "wrist_flexion", name: "Wrist Flexion" },
  { id: "wrist_extension", name: "Wrist Extension" },
  { id: "forearm_rotation", name: "Forearm Rotation" },
];

function ScreenButton({ label, value, onChange }) {
  const opts = [
    { val: "pass", label: "Pass", color: COLORS.green },
    { val: "fail", label: "Fail", color: COLORS.red },
    { val: "pain", label: "Pain", color: COLORS.amber },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
      <span style={{ fontSize: 13, color: COLORS.cream, fontWeight: 500 }}>{label}</span>
      <div style={{ display: "flex", gap: 6 }}>
        {opts.map(o => (
          <button key={o.val} onClick={() => onChange(o.val)} style={{
            flex: 1, padding: "7px 0", border: `1px solid ${value === o.val ? o.color : COLORS.border}`,
            background: value === o.val ? o.color + "22" : "transparent",
            color: value === o.val ? o.color : COLORS.muted,
            borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "'Outfit', sans-serif", transition: "all 0.15s",
          }}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: COLORS.teal, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, display: "block", marginBottom: 5 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: "100%", padding: "10px 12px", background: COLORS.card, color: COLORS.cream,
        border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 14,
        fontFamily: "'Outfit', sans-serif", outline: "none", cursor: "pointer",
        appearance: "auto",
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, multiline }) {
  const shared = {
    width: "100%", padding: "10px 12px", background: COLORS.card, color: COLORS.cream,
    border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 14,
    fontFamily: "'Outfit', sans-serif", outline: "none",
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: COLORS.teal, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, display: "block", marginBottom: 5 }}>{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...shared, resize: "vertical" }} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={shared} />
      )}
    </div>
  );
}

function MultiSelect({ label, options, selected, onChange }) {
  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: COLORS.teal, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, display: "block", marginBottom: 8 }}>{label}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map(o => {
          const active = selected.includes(o.value);
          return (
            <button key={o.value} onClick={() => toggle(o.value)} style={{
              padding: "7px 14px", border: `1px solid ${active ? COLORS.teal : COLORS.border}`,
              background: active ? COLORS.teal + "22" : "transparent",
              color: active ? COLORS.tealLight : COLORS.muted,
              borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer",
              fontFamily: "'Outfit', sans-serif", transition: "all 0.15s",
            }}>{o.label}</button>
          );
        })}
      </div>
    </div>
  );
}

function ProgramOutput({ text, loading }) {
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ display: "inline-flex", gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%", background: COLORS.teal,
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <p style={{ color: COLORS.muted, fontSize: 14, marginTop: 16 }}>Generating your scientifically-backed program...</p>
        <p style={{ color: COLORS.muted, fontSize: 12, marginTop: 4 }}>This takes 30-60 seconds for a complete program.</p>
      </div>
    );
  }
  if (!text) return null;
  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 14, padding: "24px 20px", marginTop: 20,
      whiteSpace: "pre-wrap", color: COLORS.cream, fontSize: 14,
      fontFamily: "'Outfit', sans-serif", lineHeight: 1.75,
      maxHeight: "70vh", overflowY: "auto",
    }}>
      {text}
    </div>
  );
}

function GenPopBuilder() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [goals, setGoals] = useState([]);
  const [experience, setExperience] = useState("beginner");
  const [daysPerWeek, setDaysPerWeek] = useState("3");
  const [sessionLength, setSessionLength] = useState("45");
  const [equipment, setEquipment] = useState("full_gym");
  const [injuries, setInjuries] = useState([]);
  const [notes, setNotes] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    if (!name || goals.length === 0) return;
    setLoading(true);
    setOutput("");

    const prompt = `Design a complete 4-week training program for this client:

CLIENT PROFILE:
- Name: ${name}
- Age: ${age || "Not specified"}
- Gender: ${gender}
- Training Experience: ${experience}
- Primary Goals: ${goals.join(", ")}
- Training Days/Week: ${daysPerWeek}
- Session Length: ${sessionLength} minutes
- Equipment Available: ${equipment.replace(/_/g, " ")}
- Injuries/Limitations: ${injuries.length > 0 ? injuries.join(", ") : "None reported"}
- Additional Notes: ${notes || "None"}

Generate the COMPLETE program now. Include every exercise, set, rep, rest period, tempo, RPE, and coaching cue. Include warm-up for each day. Include weekly progression notes.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: GEN_POP_SYSTEM,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "Error generating program.";
      setOutput(text);
    } catch {
      setOutput("Error connecting to AI. Please try again.");
    }
    setLoading(false);
  }, [name, age, gender, goals, experience, daysPerWeek, sessionLength, equipment, injuries, notes]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input label="Client Name" value={name} onChange={setName} placeholder="e.g., John Smith" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Age" value={age} onChange={setAge} placeholder="35" />
          <Select label="Gender" value={gender} onChange={setGender} options={[
            { value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" },
          ]} />
        </div>
      </div>

      <MultiSelect label="Goals" selected={goals} onChange={setGoals} options={[
        { value: "Build Strength", label: "Build Strength" },
        { value: "Fat Loss", label: "Fat Loss" },
        { value: "Muscle Gain / Hypertrophy", label: "Muscle Gain" },
        { value: "Improve Mobility & Flexibility", label: "Mobility" },
        { value: "Injury Rehabilitation", label: "Injury Rehab" },
        { value: "General Health & Fitness", label: "General Fitness" },
        { value: "Athletic Performance", label: "Athletic Performance" },
        { value: "Endurance & Conditioning", label: "Endurance" },
      ]} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Select label="Experience" value={experience} onChange={setExperience} options={[
          { value: "beginner", label: "Beginner (0-12 mo)" },
          { value: "intermediate", label: "Intermediate (1-3 yr)" },
          { value: "advanced", label: "Advanced (3+ yr)" },
        ]} />
        <Select label="Days / Week" value={daysPerWeek} onChange={setDaysPerWeek} options={[
          { value: "2", label: "2 days" }, { value: "3", label: "3 days" },
          { value: "4", label: "4 days" }, { value: "5", label: "5 days" }, { value: "6", label: "6 days" },
        ]} />
        <Select label="Session Length" value={sessionLength} onChange={setSessionLength} options={[
          { value: "30", label: "30 min" }, { value: "45", label: "45 min" },
          { value: "60", label: "60 min" }, { value: "75", label: "75 min" }, { value: "90", label: "90 min" },
        ]} />
      </div>

      <Select label="Equipment Available" value={equipment} onChange={setEquipment} options={[
        { value: "full_gym", label: "Full Gym (barbells, dumbbells, cables, machines)" },
        { value: "home_gym", label: "Home Gym (dumbbells, bench, pull-up bar)" },
        { value: "dumbbells_only", label: "Dumbbells Only" },
        { value: "bands_bodyweight", label: "Resistance Bands + Bodyweight" },
        { value: "bodyweight_only", label: "Bodyweight Only" },
        { value: "hotel_gym", label: "Hotel Gym (limited equipment)" },
      ]} />

      <MultiSelect label="Injuries / Limitations" selected={injuries} onChange={setInjuries} options={[
        { value: "Low Back Pain", label: "Low Back" }, { value: "Shoulder Impingement", label: "Shoulder" },
        { value: "Knee Pain", label: "Knee" }, { value: "Hip Tightness/Pain", label: "Hip" },
        { value: "Neck/Cervical Issues", label: "Neck" }, { value: "Wrist/Hand Issues", label: "Wrist" },
        { value: "Ankle Instability", label: "Ankle" }, { value: "Post-Surgery (specify in notes)", label: "Post-Surgery" },
      ]} />

      <Input label="Additional Notes" value={notes} onChange={setNotes} placeholder="Any other info — medical conditions, preferences, previous training history..." multiline />

      <button onClick={generate} disabled={loading || !name || goals.length === 0} style={{
        width: "100%", padding: "14px 24px", border: "none", borderRadius: 10,
        background: !name || goals.length === 0 ? COLORS.border : `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.tealLight})`,
        color: "#fff", fontSize: 15, fontWeight: 600, cursor: loading ? "wait" : "pointer",
        fontFamily: "'Outfit', sans-serif", transition: "all 0.2s", marginTop: 8,
        opacity: loading ? 0.7 : 1,
      }}>
        {loading ? "Generating Program..." : "Generate Training Program"}
      </button>

      <ProgramOutput text={output} loading={loading} />
    </div>
  );
}

function TPIBuilder() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [handicap, setHandicap] = useState("");
  const [screens, setScreens] = useState({});
  const [swingFaults, setSwingFaults] = useState([]);
  const [goals, setGoals] = useState("");
  const [equipment, setEquipment] = useState("full_gym");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const updateScreen = (id, val) => setScreens(prev => ({ ...prev, [id]: val }));

  const failCount = Object.values(screens).filter(v => v === "fail" || v === "pain").length;

  const generate = useCallback(async () => {
    if (!name || failCount === 0) return;
    setLoading(true);
    setOutput("");

    const screenResults = TPI_SCREENS.map(s => {
      const result = screens[s.id] || "not tested";
      return `${s.name}: ${result.toUpperCase()}`;
    }).join("\n");

    const prompt = `Design a complete TPI-based corrective and performance program for this golfer:

GOLFER PROFILE:
- Name: ${name}
- Age: ${age || "Not specified"}
- Handicap: ${handicap || "Not specified"}
- Golf Goals: ${goals || "Improve swing consistency and prevent injury"}
- Equipment: ${equipment.replace(/_/g, " ")}

TPI MOVEMENT SCREEN RESULTS:
${screenResults}

OBSERVED SWING CHARACTERISTICS: ${swingFaults.length > 0 ? swingFaults.join(", ") : "To be determined from screen results"}

Generate BOTH programs:
1. CORRECTIVE PROGRAM (Phase 1, 4 weeks) — Address all failed/painful screens
2. PERFORMANCE PROGRAM (Phase 2, 4 weeks) — Build golf-specific strength and power

Also include a 10-minute PRE-ROUND WARM-UP routine they can do at the course.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: TPI_GOLF_SYSTEM,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "Error generating program.";
      setOutput(text);
    } catch {
      setOutput("Error connecting to AI. Please try again.");
    }
    setLoading(false);
  }, [name, age, handicap, screens, swingFaults, goals, equipment, failCount]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Input label="Golfer Name" value={name} onChange={setName} placeholder="e.g., Mike R." />
        <Input label="Age" value={age} onChange={setAge} placeholder="52" />
        <Input label="Handicap" value={handicap} onChange={setHandicap} placeholder="14" />
      </div>

      <Input label="Golf / Performance Goals" value={goals} onChange={setGoals} placeholder="e.g., More distance off the tee, reduce low back pain, improve consistency..." multiline />

      <Select label="Equipment Available" value={equipment} onChange={setEquipment} options={[
        { value: "full_gym", label: "Full Gym" },
        { value: "home_gym", label: "Home Gym (dumbbells, bands, bench)" },
        { value: "minimal", label: "Minimal (bands, golf club, bodyweight)" },
      ]} />

      <MultiSelect label="Observed Swing Characteristics (if known)" selected={swingFaults} onChange={setSwingFaults} options={[
        { value: "S-Posture", label: "S-Posture" }, { value: "C-Posture", label: "C-Posture" },
        { value: "Loss of Posture", label: "Loss of Posture" }, { value: "Flat Shoulder Plane", label: "Flat Shoulder" },
        { value: "Early Extension", label: "Early Extension" }, { value: "Sway", label: "Sway" },
        { value: "Slide", label: "Slide" }, { value: "Reverse Spine Angle", label: "Reverse Spine" },
        { value: "Hanging Back", label: "Hanging Back" }, { value: "Casting/Early Release", label: "Casting" },
        { value: "Chicken Wing", label: "Chicken Wing" }, { value: "Over the Top", label: "Over the Top" },
      ]} />

      <div style={{
        marginTop: 8, marginBottom: 16, padding: "12px 16px",
        background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: COLORS.teal, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>TPI Movement Screen Results</span>
          <span style={{ fontSize: 12, color: failCount > 0 ? COLORS.red : COLORS.muted }}>
            {failCount} limitation{failCount !== 1 ? "s" : ""} found
          </span>
        </div>
        {TPI_SCREENS.map(s => (
          <ScreenButton key={s.id} label={s.name} value={screens[s.id] || ""} onChange={val => updateScreen(s.id, val)} />
        ))}
      </div>

      <button onClick={generate} disabled={loading || !name || failCount === 0} style={{
        width: "100%", padding: "14px 24px", border: "none", borderRadius: 10,
        background: !name || failCount === 0 ? COLORS.border : `linear-gradient(135deg, ${COLORS.green}, ${COLORS.greenLight})`,
        color: "#fff", fontSize: 15, fontWeight: 600, cursor: loading ? "wait" : "pointer",
        fontFamily: "'Outfit', sans-serif", transition: "all 0.2s", marginTop: 8,
        opacity: loading ? 0.7 : 1,
      }}>
        {loading ? "Generating Golf Program..." : "Generate TPI Program"}
      </button>

      <ProgramOutput text={output} loading={loading} />
    </div>
  );
}

export default function StrongHoldProgramBuilder() {
  const [tab, setTab] = useState("gen");

  return (
    <div style={{
      minHeight: "100vh", width: "100%", background: COLORS.bg,
      fontFamily: "'Outfit', sans-serif", padding: "24px 16px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');
        @keyframes pulse { 0%,100% { opacity:.3; transform:scale(.8); } 50% { opacity:1; transform:scale(1.15); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
      `}</style>

      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 28,
            fontWeight: 700, color: COLORS.cream, margin: 0, letterSpacing: 1,
          }}>StrongHold Program Builder</h1>
          <p style={{ color: COLORS.teal, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginTop: 6 }}>
            AI-Powered · Scientifically-Backed · NSCA + TPI Certified
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: "flex", gap: 4, background: COLORS.card,
          borderRadius: 12, padding: 4, marginBottom: 24,
          border: `1px solid ${COLORS.border}`,
        }}>
          {[
            { id: "gen", label: "General Population", icon: "💪" },
            { id: "tpi", label: "TPI Golf Fitness", icon: "⛳" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "12px 16px", border: "none", borderRadius: 10,
              background: tab === t.id ? (t.id === "gen" ? COLORS.teal + "20" : COLORS.green + "20") : "transparent",
              color: tab === t.id ? COLORS.cream : COLORS.muted,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Outfit', sans-serif", transition: "all 0.2s",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Builder */}
        {tab === "gen" ? <GenPopBuilder /> : <TPIBuilder />}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 28, padding: "16px 0" }}>
          <p style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 1 }}>
            STRONGHOLD FITNESS · AI PROGRAM BUILDER · NSCA + TPI CERTIFIED METHODOLOGY
          </p>
        </div>
      </div>
    </div>
  );
}
