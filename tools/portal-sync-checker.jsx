import { useState, useEffect, useCallback, useRef } from "react";

const BRAND = {
  deepPurple: "#1D1160",
  teal: "#00788C",
  dark: "#0a0b10",
  card: "#11131a",
  cardBorder: "#1e2230",
  text: "#e8e6f0",
  muted: "#6b7190",
  green: "#34d399",
  red: "#f87171",
  amber: "#fbbf24",
  blue: "#60a5fa",
};

// ─── GitHub Config ───────────────────────────────────────────────
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/jordanboyer/stronghold-wellness/main";
const FILES = {
  spectatorRoot: { label: "spectator-wellness.html", path: `${GITHUB_RAW_BASE}/spectator-wellness.html`, type: "root" },
  fqiRoot: { label: "fqi-wellness.html", path: `${GITHUB_RAW_BASE}/fqi-wellness.html`, type: "root" },
  spectatorLive: { label: "spectator/index.html", path: `${GITHUB_RAW_BASE}/spectator/index.html`, type: "live" },
  fqiLive: { label: "fqi/index.html", path: `${GITHUB_RAW_BASE}/fqi/index.html`, type: "live" },
};

// ─── Parsing Engine ──────────────────────────────────────────────
function extractHotelConfig(content) {
  const match = content.match(/const HOTEL_CONFIG\s*=\s*\{([\s\S]*?)\};/);
  if (!match) return null;
  const block = match[1];
  const fields = {};
  const fieldRegex = /(\w+)\s*:\s*"([^"]+)"/g;
  let m;
  while ((m = fieldRegex.exec(block)) !== null) {
    fields[m[1]] = m[2];
  }
  return fields;
}

function extractSessions(content) {
  const match = content.match(/const sessions\s*=\s*\[([\s\S]*?)\n\];/);
  if (!match) return [];
  const block = match[1];
  const sessions = [];
  const idRegex = /id:\s*"(\w+)"/g;
  let m;
  while ((m = idRegex.exec(block)) !== null) {
    sessions.push(m[1]);
  }
  return sessions;
}

function extractSessionBlock(content, sessionId) {
  const pattern = new RegExp(`\\{\\s*\\n\\s*id:\\s*"${sessionId}"([\\s\\S]*?)(?=\\{\\s*\\n\\s*id:\\s*"|\\n\\];)`, "m");
  const match = content.match(pattern);
  return match ? match[0].trim() : "";
}

function extractExercises(content, sessionId) {
  const block = extractSessionBlock(content, sessionId);
  if (!block) return [];
  const exercises = [];
  const exRegex = /name:\s*"([^"]+)"/g;
  let m;
  while ((m = exRegex.exec(block)) !== null) {
    exercises.push(m[1]);
  }
  return exercises;
}

function extractCues(content, sessionId) {
  const block = extractSessionBlock(content, sessionId);
  if (!block) return [];
  const cues = [];
  const cueRegex = /cue:\s*"([^"]+)"/g;
  let m;
  while ((m = cueRegex.exec(block)) !== null) {
    cues.push(m[1]);
  }
  return cues;
}

function extractReps(content, sessionId) {
  const block = extractSessionBlock(content, sessionId);
  if (!block) return [];
  const reps = [];
  const repRegex = /reps:\s*"([^"]+)"/g;
  let m;
  while ((m = repRegex.exec(block)) !== null) {
    reps.push(m[1]);
  }
  return reps;
}

function extractFonts(content) {
  const fonts = new Set();
  const fontRegex = /fontFamily:\s*"'([^']+)'/g;
  let m;
  while ((m = fontRegex.exec(content)) !== null) {
    fonts.add(m[1]);
  }
  return [...fonts].sort();
}

function extractEquipment(content) {
  const match = content.match(/const equipment\s*=\s*\[([\s\S]*?)\];/);
  if (!match) return [];
  const items = [];
  const nameRegex = /name:\s*"([^"]+)"/g;
  let m;
  while ((m = nameRegex.exec(match[1])) !== null) {
    items.push(m[1]);
  }
  return items;
}

function extractQuickStartLogic(content) {
  const match = content.match(/const isEvening[\s\S]*?const quickEmoji[^\n]+/);
  return match ? match[0].trim() : "";
}

function extractConciergeText(content) {
  const patterns = [
    /Butler Concierge|Front Desk Concierge/g,
    /your suite|your room/g,
    /Ask your Butler|Ask our Front Desk/g,
  ];
  const results = [];
  patterns.forEach(p => {
    let m;
    while ((m = p.exec(content)) !== null) {
      results.push(m[0]);
    }
  });
  return results;
}

// ─── Diff Engine ─────────────────────────────────────────────────
function diffArrays(a, b) {
  const diffs = [];
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    if (i >= a.length) {
      diffs.push({ index: i, type: "added", value: b[i] });
    } else if (i >= b.length) {
      diffs.push({ index: i, type: "removed", value: a[i] });
    } else if (a[i] !== b[i]) {
      diffs.push({ index: i, type: "changed", from: a[i], to: b[i] });
    }
  }
  return diffs;
}

function runFullSync(files) {
  const results = { timestamp: new Date().toISOString(), categories: [] };
  const keys = Object.keys(files);

  // We compare in pairs: root-to-root, live-to-live, and root-to-live per hotel
  const pairs = [
    { label: "Root Files", a: "spectatorRoot", b: "fqiRoot", expectConfigDiff: true },
  ];

  // Check if live files were loaded
  if (files.spectatorLive && files.fqiLive) {
    pairs.push({ label: "Live Deployed Files", a: "spectatorLive", b: "fqiLive", expectConfigDiff: true });
    pairs.push({ label: "Spectator Root ↔ Live", a: "spectatorRoot", b: "spectatorLive", expectConfigDiff: false });
    pairs.push({ label: "FQI Root ↔ Live", a: "fqiRoot", b: "fqiLive", expectConfigDiff: false });
  }

  pairs.forEach(pair => {
    const contentA = files[pair.a];
    const contentB = files[pair.b];
    if (!contentA || !contentB) return;

    const category = {
      label: pair.label,
      fileA: FILES[pair.a].label,
      fileB: FILES[pair.b].label,
      sections: [],
    };

    // 1. HOTEL_CONFIG
    const configA = extractHotelConfig(contentA);
    const configB = extractHotelConfig(contentB);
    if (configA && configB) {
      const configDiffs = [];
      const allKeys = [...new Set([...Object.keys(configA), ...Object.keys(configB)])];
      allKeys.forEach(key => {
        if (configA[key] !== configB[key]) {
          configDiffs.push({ field: key, a: configA[key] || "—", b: configB[key] || "—" });
        }
      });
      category.sections.push({
        title: "HOTEL_CONFIG",
        status: configDiffs.length === 0 ? "match" : pair.expectConfigDiff ? "expected-diff" : "mismatch",
        details: configDiffs.length === 0
          ? "All config values match"
          : configDiffs.map(d => `${d.field}: "${d.a}" → "${d.b}"`),
        count: configDiffs.length,
      });
    }

    // 2. Session IDs
    const sessionsA = extractSessions(contentA);
    const sessionsB = extractSessions(contentB);
    const sessionIdDiff = diffArrays(sessionsA, sessionsB);
    category.sections.push({
      title: "Session IDs",
      status: sessionIdDiff.length === 0 ? "match" : "mismatch",
      details: sessionIdDiff.length === 0
        ? `All ${sessionsA.length} sessions present in both files`
        : sessionIdDiff.map(d => d.type === "changed" ? `#${d.index}: "${d.from}" → "${d.to}"` : `#${d.index}: ${d.type} "${d.value}"`),
      count: sessionIdDiff.length,
    });

    // 3. Per-session exercise/cue/rep check
    const commonSessions = sessionsA.filter(s => sessionsB.includes(s));
    const exerciseDiffs = [];
    commonSessions.forEach(sid => {
      const exA = extractExercises(contentA, sid);
      const exB = extractExercises(contentB, sid);
      const exDiff = diffArrays(exA, exB);
      if (exDiff.length > 0) {
        exerciseDiffs.push({ session: sid, type: "exercises", diffs: exDiff });
      }

      const repA = extractReps(contentA, sid);
      const repB = extractReps(contentB, sid);
      const repDiff = diffArrays(repA, repB);
      if (repDiff.length > 0) {
        exerciseDiffs.push({ session: sid, type: "reps", diffs: repDiff });
      }

      const cueA = extractCues(contentA, sid);
      const cueB = extractCues(contentB, sid);
      const cueDiff = diffArrays(cueA, cueB);
      // Filter out hotel-specific cue diffs (expected)
      const unexpectedCueDiffs = cueDiff.filter(d => {
        if (d.type !== "changed") return true;
        const hotelTerms = ["Spectator", "French Quarter Inn", "Butler", "Front Desk", "suite", "room", "FQI", "mattress", "bed"];
        const isHotelSpecific = hotelTerms.some(t =>
          (d.from && d.from.includes(t)) || (d.to && d.to.includes(t))
        );
        return !isHotelSpecific;
      });
      if (unexpectedCueDiffs.length > 0) {
        exerciseDiffs.push({ session: sid, type: "cues (unexpected)", diffs: unexpectedCueDiffs });
      }
      if (cueDiff.length > 0 && cueDiff.length !== unexpectedCueDiffs.length) {
        const hotelCount = cueDiff.length - unexpectedCueDiffs.length;
        exerciseDiffs.push({ session: sid, type: "cues (hotel-specific)", diffs: cueDiff.filter(d => {
          if (d.type !== "changed") return false;
          const hotelTerms = ["Spectator", "French Quarter Inn", "Butler", "Front Desk", "suite", "room", "FQI", "mattress", "bed"];
          return hotelTerms.some(t => (d.from && d.from.includes(t)) || (d.to && d.to.includes(t)));
        }), expected: true });
      }
    });

    if (exerciseDiffs.length === 0) {
      category.sections.push({
        title: "Workout Content",
        status: "match",
        details: `All ${commonSessions.length} sessions: exercises, reps, and cues match`,
        count: 0,
      });
    } else {
      const unexpected = exerciseDiffs.filter(d => !d.expected);
      const expected = exerciseDiffs.filter(d => d.expected);
      if (unexpected.length > 0) {
        category.sections.push({
          title: "Workout Content — MISMATCHES",
          status: "mismatch",
          details: unexpected.map(d => {
            const diffStrs = d.diffs.map(dd =>
              dd.type === "changed" ? `  "${dd.from}" → "${dd.to}"` : `  ${dd.type}: "${dd.value}"`
            );
            return `${d.session} (${d.type}):\n${diffStrs.join("\n")}`;
          }),
          count: unexpected.length,
        });
      }
      if (expected.length > 0) {
        category.sections.push({
          title: "Workout Content — Hotel-Specific (Expected)",
          status: "expected-diff",
          details: expected.map(d => {
            const diffStrs = d.diffs.map(dd =>
              dd.type === "changed" ? `  "${dd.from.substring(0, 60)}..." → "${dd.to.substring(0, 60)}..."`
              : `  ${dd.type}: "${dd.value}"`
            );
            return `${d.session} (${d.type}):\n${diffStrs.join("\n")}`;
          }),
          count: expected.length,
        });
      }
    }

    // 4. Equipment list
    const eqA = extractEquipment(contentA);
    const eqB = extractEquipment(contentB);
    const eqDiff = diffArrays(eqA, eqB);
    category.sections.push({
      title: "Equipment List",
      status: eqDiff.length === 0 ? "match" : "mismatch",
      details: eqDiff.length === 0 ? `${eqA.length} items match` : eqDiff.map(d => d.type === "changed" ? `"${d.from}" → "${d.to}"` : `${d.type}: "${d.value}"`),
      count: eqDiff.length,
    });

    // 5. Fonts (expected to differ between hotels)
    const fontsA = extractFonts(contentA);
    const fontsB = extractFonts(contentB);
    const fontDiff = diffArrays(fontsA, fontsB);
    category.sections.push({
      title: "Font Families",
      status: fontDiff.length === 0 ? "match" : pair.expectConfigDiff ? "expected-diff" : "mismatch",
      details: fontDiff.length === 0
        ? `Both use: ${fontsA.join(", ")}`
        : [`File A: ${fontsA.join(", ")}`, `File B: ${fontsB.join(", ")}`],
      count: fontDiff.length,
    });

    // 6. Quick Start logic
    const qsA = extractQuickStartLogic(contentA);
    const qsB = extractQuickStartLogic(contentB);
    if (qsA && qsB) {
      const qsDiff = qsA !== qsB;
      category.sections.push({
        title: "Quick Start Logic",
        status: qsDiff ? "warning" : "match",
        details: qsDiff
          ? ["Logic differs between files — review afternoon default routing", `File A afternoon: ${qsA.match(/quickLabel[^;]+/)?.[0] || "?"}`, `File B afternoon: ${qsB.match(/quickLabel[^;]+/)?.[0] || "?"}`]
          : "Quick Start routing logic matches",
        count: qsDiff ? 1 : 0,
      });
    }

    // 7. Line count
    const linesA = contentA.split("\n").length;
    const linesB = contentB.split("\n").length;
    category.sections.push({
      title: "File Size",
      status: Math.abs(linesA - linesB) > 10 ? "warning" : "info",
      details: `${FILES[pair.a].label}: ${linesA.toLocaleString()} lines | ${FILES[pair.b].label}: ${linesB.toLocaleString()} lines (Δ ${Math.abs(linesA - linesB)})`,
      count: 0,
    });

    results.categories.push(category);
  });

  return results;
}

// ─── UI Components ───────────────────────────────────────────────

function StatusBadge({ status }) {
  const config = {
    match: { label: "MATCH", color: BRAND.green, bg: `${BRAND.green}18` },
    mismatch: { label: "MISMATCH", color: BRAND.red, bg: `${BRAND.red}18` },
    "expected-diff": { label: "EXPECTED", color: BRAND.blue, bg: `${BRAND.blue}18` },
    warning: { label: "REVIEW", color: BRAND.amber, bg: `${BRAND.amber}18` },
    info: { label: "INFO", color: BRAND.muted, bg: `${BRAND.muted}18` },
  }[status] || { label: status, color: BRAND.muted, bg: `${BRAND.muted}18` };

  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 6,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 1.5,
      color: config.color,
      background: config.bg,
      border: `1px solid ${config.color}30`,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {config.label}
    </span>
  );
}

function SectionCard({ section }) {
  const [expanded, setExpanded] = useState(section.status === "mismatch" || section.status === "warning");
  const details = Array.isArray(section.details) ? section.details : [section.details];
  const isExpandable = details.length > 0 && section.status !== "info";

  return (
    <div style={{
      background: section.status === "mismatch" ? `${BRAND.red}06` : "transparent",
      border: `1px solid ${section.status === "mismatch" ? BRAND.red + "25" : BRAND.cardBorder}`,
      borderRadius: 10,
      marginBottom: 8,
      overflow: "hidden",
    }}>
      <button
        onClick={() => isExpandable && setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          cursor: isExpandable ? "pointer" : "default",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <span style={{
            fontSize: 16,
            filter: section.status === "match" ? "none" : "none",
          }}>
            {section.status === "match" ? "✓" : section.status === "mismatch" ? "✕" : section.status === "warning" ? "⚠" : section.status === "expected-diff" ? "↔" : "ℹ"}
          </span>
          <span style={{
            color: BRAND.text,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "'Outfit', sans-serif",
          }}>
            {section.title}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusBadge status={section.status} />
          {isExpandable && (
            <span style={{
              color: BRAND.muted,
              fontSize: 12,
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}>▾</span>
          )}
        </div>
      </button>
      {expanded && (
        <div style={{
          padding: "0 16px 14px 44px",
          borderTop: `1px solid ${BRAND.cardBorder}`,
        }}>
          {details.map((d, i) => (
            <pre key={i} style={{
              color: section.status === "mismatch" ? BRAND.red : section.status === "warning" ? BRAND.amber : BRAND.muted,
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              margin: "10px 0 0",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.7,
            }}>
              {d}
            </pre>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryBlock({ category }) {
  const matchCount = category.sections.filter(s => s.status === "match").length;
  const mismatchCount = category.sections.filter(s => s.status === "mismatch").length;
  const warningCount = category.sections.filter(s => s.status === "warning").length;
  const overallStatus = mismatchCount > 0 ? "mismatch" : warningCount > 0 ? "warning" : "match";

  return (
    <div style={{
      background: BRAND.card,
      border: `1px solid ${overallStatus === "mismatch" ? BRAND.red + "30" : BRAND.cardBorder}`,
      borderRadius: 14,
      padding: "20px",
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h3 style={{
            color: BRAND.text,
            fontSize: 16,
            fontWeight: 600,
            margin: 0,
            fontFamily: "'Cormorant Garamond', serif",
            letterSpacing: 0.5,
          }}>
            {category.label}
          </h3>
          <p style={{
            color: BRAND.muted,
            fontSize: 11,
            margin: "4px 0 0",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {category.fileA} ↔ {category.fileB}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {matchCount > 0 && (
            <span style={{ color: BRAND.green, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              {matchCount} ✓
            </span>
          )}
          {mismatchCount > 0 && (
            <span style={{ color: BRAND.red, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              {mismatchCount} ✕
            </span>
          )}
          {warningCount > 0 && (
            <span style={{ color: BRAND.amber, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              {warningCount} ⚠
            </span>
          )}
        </div>
      </div>
      {category.sections.map((s, i) => (
        <SectionCard key={i} section={s} />
      ))}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────
export default function PortalSyncChecker() {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [results, setResults] = useState(null);
  const [loadedFiles, setLoadedFiles] = useState({});
  const [fileStatus, setFileStatus] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteFiles, setPasteFiles] = useState({ spectatorRoot: "", fqiRoot: "" });

  const fetchFiles = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    const loaded = {};
    const statuses = {};

    for (const [key, file] of Object.entries(FILES)) {
      try {
        statuses[key] = "loading";
        setFileStatus({ ...statuses });
        const res = await fetch(file.path);
        if (res.ok) {
          loaded[key] = await res.text();
          statuses[key] = "ok";
        } else {
          statuses[key] = "missing";
        }
      } catch (e) {
        statuses[key] = "error";
      }
      setFileStatus({ ...statuses });
    }

    setLoadedFiles(loaded);

    if (!loaded.spectatorRoot || !loaded.fqiRoot) {
      setStatus("error");
      setErrorMsg("Could not load root portal files from GitHub. Use paste mode instead.");
      return;
    }

    const syncResults = runFullSync(loaded);
    setResults(syncResults);
    setStatus("done");
  }, []);

  const runFromPaste = useCallback(() => {
    if (!pasteFiles.spectatorRoot.trim() || !pasteFiles.fqiRoot.trim()) {
      setErrorMsg("Paste both root files to run sync check.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    const loaded = {
      spectatorRoot: pasteFiles.spectatorRoot,
      fqiRoot: pasteFiles.fqiRoot,
    };
    setLoadedFiles(loaded);
    const syncResults = runFullSync(loaded);
    setResults(syncResults);
    setStatus("done");
  }, [pasteFiles]);

  // Summary stats
  const summary = results ? {
    totalSections: results.categories.reduce((a, c) => a + c.sections.length, 0),
    matches: results.categories.reduce((a, c) => a + c.sections.filter(s => s.status === "match").length, 0),
    expected: results.categories.reduce((a, c) => a + c.sections.filter(s => s.status === "expected-diff").length, 0),
    mismatches: results.categories.reduce((a, c) => a + c.sections.filter(s => s.status === "mismatch").length, 0),
    warnings: results.categories.reduce((a, c) => a + c.sections.filter(s => s.status === "warning").length, 0),
  } : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: BRAND.dark,
      color: BRAND.text,
      fontFamily: "'Outfit', sans-serif",
    }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      />

      {/* Header */}
      <div style={{
        padding: "32px 24px 24px",
        borderBottom: `1px solid ${BRAND.cardBorder}`,
        background: `linear-gradient(180deg, ${BRAND.deepPurple}15 0%, transparent 100%)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.deepPurple})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>
            🔄
          </div>
          <div>
            <p style={{
              fontSize: 10, letterSpacing: 4, color: BRAND.teal, fontWeight: 600,
              margin: 0, fontFamily: "'Outfit', sans-serif",
            }}>
              STRONGHOLD WELLNESS
            </p>
            <h1 style={{
              fontSize: 22, fontWeight: 400, margin: 0, color: BRAND.text,
              fontFamily: "'Cormorant Garamond', serif",
            }}>
              Portal Sync Checker
            </h1>
          </div>
        </div>
        <p style={{ color: BRAND.muted, fontSize: 13, margin: "12px 0 0", lineHeight: 1.6 }}>
          Compares all portal files across hotels. Flags unexpected workout content mismatches, validates session parity, and distinguishes expected hotel-specific differences from bugs.
        </p>
      </div>

      {/* Controls */}
      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button
            onClick={fetchFiles}
            disabled={status === "loading"}
            style={{
              flex: 1,
              padding: "14px 20px",
              border: "none",
              borderRadius: 10,
              background: status === "loading"
                ? `${BRAND.teal}40`
                : `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.deepPurple})`,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: status === "loading" ? "wait" : "pointer",
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: 0.5,
              transition: "all 0.2s",
            }}
          >
            {status === "loading" ? "Scanning..." : "Sync Check from GitHub"}
          </button>
          <button
            onClick={() => setPasteMode(!pasteMode)}
            style={{
              padding: "14px 16px",
              border: `1px solid ${BRAND.cardBorder}`,
              borderRadius: 10,
              background: pasteMode ? `${BRAND.teal}15` : "transparent",
              color: pasteMode ? BRAND.teal : BRAND.muted,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
              transition: "all 0.2s",
            }}
          >
            Paste
          </button>
        </div>

        {/* Paste Mode */}
        {pasteMode && (
          <div style={{ marginBottom: 20 }}>
            {["spectatorRoot", "fqiRoot"].map(key => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{
                  display: "block",
                  color: BRAND.muted,
                  fontSize: 11,
                  letterSpacing: 1,
                  marginBottom: 6,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {FILES[key].label}
                </label>
                <textarea
                  value={pasteFiles[key]}
                  onChange={e => setPasteFiles(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={`Paste ${FILES[key].label} content here...`}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: BRAND.card,
                    border: `1px solid ${BRAND.cardBorder}`,
                    borderRadius: 8,
                    color: BRAND.text,
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    resize: "vertical",
                  }}
                />
              </div>
            ))}
            <button
              onClick={runFromPaste}
              style={{
                width: "100%",
                padding: "12px",
                border: "none",
                borderRadius: 8,
                background: BRAND.teal,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Run Sync Check on Pasted Files
            </button>
          </div>
        )}

        {/* File fetch status */}
        {status === "loading" && (
          <div style={{
            background: BRAND.card,
            border: `1px solid ${BRAND.cardBorder}`,
            borderRadius: 10,
            padding: 16,
            marginBottom: 16,
          }}>
            {Object.entries(FILES).map(([key, file]) => (
              <div key={key} style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 0",
              }}>
                <span style={{
                  fontSize: 14,
                  width: 20,
                  textAlign: "center",
                }}>
                  {fileStatus[key] === "ok" ? "✓" : fileStatus[key] === "loading" ? "◌" : fileStatus[key] === "error" || fileStatus[key] === "missing" ? "✕" : "·"}
                </span>
                <span style={{
                  color: fileStatus[key] === "ok" ? BRAND.green : fileStatus[key] === "loading" ? BRAND.amber : BRAND.muted,
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {file.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div style={{
            background: `${BRAND.red}12`,
            border: `1px solid ${BRAND.red}30`,
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
          }}>
            <p style={{ color: BRAND.red, fontSize: 13, margin: 0 }}>{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <div style={{ padding: "0 24px 40px" }}>
          {/* Summary Bar */}
          <div style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            flexWrap: "wrap",
          }}>
            {[
              { label: "Checks", value: summary.totalSections, color: BRAND.text },
              { label: "Match", value: summary.matches, color: BRAND.green },
              { label: "Expected", value: summary.expected, color: BRAND.blue },
              { label: "Mismatch", value: summary.mismatches, color: BRAND.red },
              { label: "Review", value: summary.warnings, color: BRAND.amber },
            ].map((s, i) => (
              <div key={i} style={{
                flex: "1 1 60px",
                background: BRAND.card,
                border: `1px solid ${s.value > 0 && s.color === BRAND.red ? BRAND.red + "30" : BRAND.cardBorder}`,
                borderRadius: 10,
                padding: "12px 14px",
                textAlign: "center",
                minWidth: 60,
              }}>
                <p style={{
                  color: s.color,
                  fontSize: 22,
                  fontWeight: 600,
                  margin: 0,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {s.value}
                </p>
                <p style={{
                  color: BRAND.muted,
                  fontSize: 10,
                  letterSpacing: 1,
                  margin: "4px 0 0",
                  fontWeight: 600,
                }}>
                  {s.label.toUpperCase()}
                </p>
              </div>
            ))}
          </div>

          {/* Overall Verdict */}
          <div style={{
            background: summary.mismatches > 0
              ? `${BRAND.red}10`
              : summary.warnings > 0
              ? `${BRAND.amber}10`
              : `${BRAND.green}10`,
            border: `1px solid ${summary.mismatches > 0 ? BRAND.red : summary.warnings > 0 ? BRAND.amber : BRAND.green}25`,
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}>
            <span style={{ fontSize: 28 }}>
              {summary.mismatches > 0 ? "🚨" : summary.warnings > 0 ? "⚠️" : "✅"}
            </span>
            <div>
              <p style={{
                color: summary.mismatches > 0 ? BRAND.red : summary.warnings > 0 ? BRAND.amber : BRAND.green,
                fontSize: 15,
                fontWeight: 600,
                margin: 0,
              }}>
                {summary.mismatches > 0
                  ? `${summary.mismatches} content mismatch${summary.mismatches > 1 ? "es" : ""} found`
                  : summary.warnings > 0
                  ? `All content synced — ${summary.warnings} item${summary.warnings > 1 ? "s" : ""} to review`
                  : "All portals in sync"}
              </p>
              <p style={{ color: BRAND.muted, fontSize: 12, margin: "4px 0 0" }}>
                Scanned {new Date(results.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Category Blocks */}
          {results.categories.map((cat, i) => (
            <CategoryBlock key={i} category={cat} />
          ))}

          {/* Legend */}
          <div style={{
            background: BRAND.card,
            border: `1px solid ${BRAND.cardBorder}`,
            borderRadius: 10,
            padding: "14px 18px",
            marginTop: 8,
          }}>
            <p style={{ color: BRAND.muted, fontSize: 11, fontWeight: 600, letterSpacing: 1, margin: "0 0 10px" }}>
              LEGEND
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
              {[
                { status: "match", desc: "Content identical" },
                { status: "expected-diff", desc: "Hotel-specific (intentional)" },
                { status: "warning", desc: "Needs human review" },
                { status: "mismatch", desc: "Unexpected difference (fix)" },
              ].map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StatusBadge status={l.status} />
                  <span style={{ color: BRAND.muted, fontSize: 11 }}>{l.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {status === "idle" && (
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 40, margin: "0 0 16px" }}>🔍</p>
          <p style={{ color: BRAND.muted, fontSize: 14, lineHeight: 1.6 }}>
            Hit "Sync Check from GitHub" to fetch all four portal files and run a full comparison. Or use Paste mode for local files.
          </p>
        </div>
      )}
    </div>
  );
}
