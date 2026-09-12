import React, { useState, useEffect, useCallback } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import {
  LayoutDashboard, Users, Layers, ClipboardList, LogOut, Search,
  Plus, Pencil, Trash2, Phone, Clock, CheckCircle2, XCircle,
  ShieldCheck, ArrowLeft, X, Save, KeyRound,
  ChevronRight, AlertCircle, UserCheck, LogIn, Calendar, RotateCcw,
  Building2, BadgeCheck, BookOpen, Award, ChevronDown, MoreVertical
} from "https://esm.sh/lucide-react@0.383.0?deps=react@18.2.0";

/* ---------------------------------------------------------------------
   THEME  —  "Registry" system: deep ink navy + brass stamp gold on a
   cool paper ground. Built around the idea of a physical roll-call
   ledger being marked with a rubber stamp when a student arrives.
--------------------------------------------------------------------- */
const T = {
  ink: "#132247",
  inkSoft: "#1C2E5A",
  paper: "#F5F6F5",
  paperCard: "#FFFFFF",
  line: "#E3E3D8",
  brass: "#B5382C",
  brassSoft: "#F4DAD8",
  slate: "#5B6472",
  slateLight: "#8A93A3",
  good: "#2F7A4F",
  goodSoft: "#E4F1E8",
  bad: "#B0432D",
  badSoft: "#F8E7E1",
  display: "'Fraunces', serif",
  body: "'Inter', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');`;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const uid = () => Math.random().toString(36).slice(2, 10);
const todayStr = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const rollCode = (name) => {
  const initials = name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 3);
  return `AU-${initials}${Math.floor(1000 + Math.random() * 9000)}`;
};

/* ---------------------------------------------------------------------
   STORAGE — talks to a Google Apps Script Web App backed by a Google
   Sheet. Every table (Batches, Students, Attendance, Homework,
   HomeworkRecords, Config) is a real, human-readable tab in the sheet
   that the institute can open directly — that's the "record".

   SETUP: deploy the included Code.gs as a Web App (see README.md),
   then paste the resulting /exec URL below.
--------------------------------------------------------------------- */
const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbxfKEVy6BoprHblu4MDg9y-vA4uvfNJi9TUD-dpPhgicIysrwFKhLXZl7e35GCYwLA4Rw/exec";
const SHEET_CONFIGURED = SHEET_API_URL.indexOf("PASTE_YOUR") === -1;

const KEY_TYPE = {
  "au-config": "config",
  "au-batches": "batches",
  "au-students": "students",
  "au-attendance": "attendance",
  "au-homework": "homework",
  "au-homework-records": "homeworkRecords",
};

async function loadKey(key, fallback) {
  try {
    const type = KEY_TYPE[key];
    const res = await fetch(`${SHEET_API_URL}?type=${type}`);
    const data = await res.json();
    return data === null || data === undefined ? fallback : data;
  } catch (e) {
    console.error("Sheet load failed for", key, e);
    return fallback;
  }
}
async function saveKey(key, value) {
  try {
    const type = KEY_TYPE[key];
    // text/plain avoids a CORS preflight that Apps Script can't answer.
    await fetch(SHEET_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type, data: value }),
    });
  } catch (e) {
    console.error("Sheet save failed for", key, e);
  }
}

const SEED_BATCHES = [
  { id: uid(), name: "Class 10 — Morning Batch", subject: "Science & Maths", start: "07:00", end: "08:30", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], color: "#B5382C" },
  { id: uid(), name: "Class 12 — Evening Batch", subject: "Physics & Chemistry", start: "17:00", end: "19:00", days: ["Mon", "Wed", "Fri"], color: "#2F7A4F" },
];
const SEED_STUDENTS = [
  { id: uid(), name: "Aarav Mehta", batchId: SEED_BATCHES[0].id, parentName: "Rohit Mehta", parentPhone: "+91 98765 43210", code: rollCode("Aarav Mehta"), joined: todayStr() },
  { id: uid(), name: "Diya Sharma", batchId: SEED_BATCHES[0].id, parentName: "Kavita Sharma", parentPhone: "+91 98765 11223", code: rollCode("Diya Sharma"), joined: todayStr() },
  { id: uid(), name: "Ishaan Rao", batchId: SEED_BATCHES[1].id, parentName: "Sunil Rao", parentPhone: "+91 91234 56789", code: rollCode("Ishaan Rao"), joined: todayStr() },
];
const SEED_HOMEWORK = [
  { id: uid(), batchId: SEED_BATCHES[0].id, title: "Quadratic Equations — Worksheet 3", subject: "Maths", description: "Solve all questions from the practice sheet and show full working.", assignedDate: todayStr(), dueDate: todayStr() },
];

/* ---------------------------------------------------------------------
   SHARED UI ATOMS
--------------------------------------------------------------------- */
function Stamp({ state }) {
  // state: 'present' | 'absent' | 'pending'
  const map = {
    present: { color: T.good, bg: T.goodSoft, label: "PRESENT", Icon: CheckCircle2 },
    absent: { color: T.bad, bg: T.badSoft, label: "ABSENT", Icon: XCircle },
    done: { color: T.good, bg: T.goodSoft, label: "DONE", Icon: CheckCircle2 },
    missed: { color: T.bad, bg: T.badSoft, label: "MISSED", Icon: XCircle },
    pending: { color: T.slateLight, bg: "#EEF0EC", label: "PENDING", Icon: Clock },
  };
  const s = map[state] || map.pending;
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 select-none"
      style={{
        borderColor: s.color,
        color: s.color,
        background: s.bg,
        fontFamily: T.mono,
        fontSize: "11px",
        letterSpacing: "0.08em",
        transform: state === "pending" ? "none" : "rotate(-2deg)",
      }}
    >
      <s.Icon size={13} strokeWidth={2.5} />
      {s.label}
    </div>
  );
}

function AULogo({ size = 34, ring = true }) {
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{
        width: size, height: size,
        background: "#fff",
        border: ring ? `1.5px dashed ${T.ink}` : "none",
        boxShadow: "inset 0 0 0 2px #fff",
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 100 100">
        <text x="6" y="74" fontFamily={T.display} fontWeight="700" fontStyle="italic" fontSize="70" fill={T.brass}>A</text>
        <text x="42" y="74" fontFamily={T.display} fontWeight="700" fontStyle="italic" fontSize="70" fill={T.ink}>U</text>
      </svg>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs mb-1.5" style={{ color: T.slate, fontFamily: T.body, fontWeight: 600, letterSpacing: "0.03em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle = {
  fontFamily: T.body,
  border: `1.5px solid ${T.line}`,
  borderRadius: "10px",
  padding: "10px 12px",
  width: "100%",
  fontSize: "14px",
  color: T.ink,
  outline: "none",
  background: "#FFFFFF",
};

function TextInput(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} className={`focus:ring-2 ${props.className || ""}`} onFocus={(e) => (e.target.style.borderColor = T.brass)} onBlur={(e) => (e.target.style.borderColor = T.line)} />;
}
function Select(props) {
  return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }} onFocus={(e) => (e.target.style.borderColor = T.brass)} onBlur={(e) => (e.target.style.borderColor = T.line)} />;
}
function Textarea(props) {
  return <textarea {...props} rows={props.rows || 3} style={{ ...inputStyle, resize: "vertical", ...(props.style || {}) }} onFocus={(e) => (e.target.style.borderColor = T.brass)} onBlur={(e) => (e.target.style.borderColor = T.line)} />;
}

function Button({ variant = "primary", children, className = "", ...rest }) {
  const styles = {
    primary: { background: T.ink, color: "#fff" },
    brass: { background: T.brass, color: "#fff" },
    ghost: { background: "transparent", color: T.ink, border: `1.5px solid ${T.line}` },
    danger: { background: "transparent", color: T.bad, border: `1.5px solid ${T.badSoft}` },
  };
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.97] hover:opacity-90 disabled:opacity-40 ${className}`}
      style={{ fontFamily: T.body, ...styles[variant] }}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(16,26,48,0.55)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "max-w-lg" : "max-w-md"} rounded-2xl overflow-hidden`}
        style={{ background: T.paperCard, boxShadow: "0 30px 60px rgba(16,26,48,0.35)" }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${T.line}` }}>
          <h3 style={{ fontFamily: T.display, fontSize: "19px", color: T.ink, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5"><X size={18} color={T.slate} /></button>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, note }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: T.brassSoft }}>
        <Icon size={24} color={T.brass} />
      </div>
      <div style={{ fontFamily: T.display, fontSize: "17px", color: T.ink, fontWeight: 600 }}>{title}</div>
      <div style={{ fontFamily: T.body, fontSize: "13px", color: T.slate, marginTop: "4px" }}>{note}</div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   ROOT APP
--------------------------------------------------------------------- */
function App() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("landing"); // landing | admin | parent
  const [config, setConfig] = useState({ instituteName: "AcademyUs", adminPin: "1234" });
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [homework, setHomework] = useState([]);
  const [hwRecords, setHwRecords] = useState([]);

  useEffect(() => {
    if (!SHEET_CONFIGURED) { setLoading(false); return; }
    (async () => {
      let [cfg, b, s, a, hw, hwr] = await Promise.all([
        loadKey("au-config", null),
        loadKey("au-batches", null),
        loadKey("au-students", null),
        loadKey("au-attendance", []),
        loadKey("au-homework", null),
        loadKey("au-homework-records", []),
      ]);
      if (!cfg) { cfg = { instituteName: "AcademyUs", adminPin: "1234" }; await saveKey("au-config", cfg); }
      if (!b) { b = SEED_BATCHES; await saveKey("au-batches", b); }
      if (!s) { s = SEED_STUDENTS; await saveKey("au-students", s); }
      if (!hw) { hw = SEED_HOMEWORK; await saveKey("au-homework", hw); }
      setConfig(cfg); setBatches(b); setStudents(s); setAttendance(a || []);
      setHomework(hw); setHwRecords(hwr || []);
      setLoading(false);
    })();
  }, []);

  const persistBatches = useCallback(async (next) => { setBatches(next); await saveKey("au-batches", next); }, []);
  const persistStudents = useCallback(async (next) => { setStudents(next); await saveKey("au-students", next); }, []);
  const persistAttendance = useCallback(async (next) => { setAttendance(next); await saveKey("au-attendance", next); }, []);
  const persistConfig = useCallback(async (next) => { setConfig(next); await saveKey("au-config", next); }, []);
  const persistHomework = useCallback(async (next) => { setHomework(next); await saveKey("au-homework", next); }, []);
  const persistHwRecords = useCallback(async (next) => { setHwRecords(next); await saveKey("au-homework-records", next); }, []);

  if (!SHEET_CONFIGURED) {
    return (
      <div className="h-screen w-full flex items-center justify-center px-6" style={{ background: T.ink }}>
        <style>{FONT_IMPORT}</style>
        <div className="w-full max-w-md rounded-2xl p-7" style={{ background: T.paperCard }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ background: T.brassSoft }}>
            <AlertCircle size={20} color={T.brass} />
          </div>
          <h2 style={{ fontFamily: T.display, fontSize: "20px", color: T.ink, fontWeight: 600 }}>One setup step left</h2>
          <p style={{ fontSize: "13.5px", color: T.slate, marginTop: "8px", lineHeight: 1.6 }}>
            This app stores its data in a Google Sheet. Open <code style={{ background: T.paper, padding: "1px 5px", borderRadius: "4px" }}>app.jsx</code> (or the compiled <code style={{ background: T.paper, padding: "1px 5px", borderRadius: "4px" }}>app.js</code>), find the line starting with <code style={{ background: T.paper, padding: "1px 5px", borderRadius: "4px" }}>const SHEET_API_URL</code>, and paste in your deployed Apps Script Web App URL. See <strong>README.md</strong> for the full step-by-step.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center" style={{ background: T.paper }}>
        <style>{FONT_IMPORT}</style>
        <div className="animate-pulse" style={{ fontFamily: T.display, color: T.ink, fontSize: "20px" }}>Opening the registry…</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: T.body, background: T.paper, minHeight: "100vh" }}>
      <style>{FONT_IMPORT}</style>
      {view === "landing" && <Landing name={config.instituteName} onPick={setView} />}
      {view === "admin" && (
        <AdminApp
          config={config} setConfig={persistConfig}
          batches={batches} setBatches={persistBatches}
          students={students} setStudents={persistStudents}
          attendance={attendance} setAttendance={persistAttendance}
          homework={homework} setHomework={persistHomework}
          hwRecords={hwRecords} setHwRecords={persistHwRecords}
          onExit={() => setView("landing")}
        />
      )}
      {view === "parent" && (
        <ParentApp
          instituteName={config.instituteName}
          batches={batches} students={students} attendance={attendance}
          homework={homework} hwRecords={hwRecords}
          onExit={() => setView("landing")}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------
   LANDING
--------------------------------------------------------------------- */
function Landing({ name, onPick }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-16" style={{ background: T.ink }}>
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <AULogo size={64} />
            <span style={{ fontFamily: T.mono, color: T.brassSoft, fontSize: "11px", letterSpacing: "0.2em", marginTop: "10px" }}>REGISTRY</span>
          </div>
          <h1 className="text-center mb-1" style={{ fontFamily: T.display, color: "#fff", fontSize: "40px", fontWeight: 600, lineHeight: 1.1 }}>
            {name}
          </h1>
          <p className="text-center mb-1" style={{ color: T.brassSoft, fontSize: "12.5px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Together we achieve the extraordinary
          </p>
          <p className="text-center mb-10" style={{ color: "#B7BFD1", fontSize: "14px", marginTop: "10px" }}>
            Attendance &amp; batch records, kept the way a good registry should be — accurate, and always in view.
          </p>

          <button
            onClick={() => onPick("admin")}
            className="w-full flex items-center justify-between px-5 py-4 rounded-xl mb-3 transition hover:opacity-90 active:scale-[0.98]"
            style={{ background: T.brass }}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} color="#fff" />
              <div className="text-left">
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>Institute Login</div>
                <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px" }}>Mark attendance, manage batches &amp; students</div>
              </div>
            </div>
            <ChevronRight size={18} color="#fff" />
          </button>

          <button
            onClick={() => onPick("parent")}
            className="w-full flex items-center justify-between px-5 py-4 rounded-xl transition hover:opacity-90 active:scale-[0.98]"
            style={{ background: T.inkSoft, border: `1px solid #2A3A5C` }}
          >
            <div className="flex items-center gap-3">
              <UserCheck size={20} color={T.brassSoft} />
              <div className="text-left">
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>Parent Lookup</div>
                <div style={{ color: "#B7BFD1", fontSize: "12px" }}>Check your child's attendance &amp; batch timing</div>
              </div>
            </div>
            <ChevronRight size={18} color={T.brassSoft} />
          </button>
        </div>
      </div>
      <div className="py-3 text-center" style={{ background: T.paper, color: T.slateLight, fontSize: "11px", fontFamily: T.mono }}>
        BUILT FOR {name.toUpperCase()} · PROTOTYPE
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   ADMIN APP
--------------------------------------------------------------------- */
function AdminApp({ config, setConfig, batches, setBatches, students, setStudents, attendance, setAttendance, homework, setHomework, hwRecords, setHwRecords, onExit }) {
  const [authed, setAuthed] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: T.ink }}>
        <style>{FONT_IMPORT}</style>
        <div className="w-full max-w-sm rounded-2xl p-7" style={{ background: T.paperCard }}>
          <div className="flex items-center gap-2 mb-5">
            <button onClick={onExit} className="p-1.5 rounded-full hover:bg-black/5"><ArrowLeft size={16} color={T.slate} /></button>
            <span style={{ fontFamily: T.body, fontSize: "13px", color: T.slate }}>Back</span>
          </div>
          <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ background: T.brassSoft }}>
            <KeyRound size={20} color={T.brass} />
          </div>
          <h2 style={{ fontFamily: T.display, fontSize: "22px", color: T.ink, fontWeight: 600 }}>Institute PIN</h2>
          <p style={{ fontSize: "13px", color: T.slate, marginBottom: "18px" }}>Enter the admin PIN to open the registry. Default is 1234 — change it under Settings once inside.</p>
          <TextInput
            type="password" inputMode="numeric" placeholder="••••" value={pinInput} maxLength={6}
            onChange={(e) => { setPinInput(e.target.value); setPinError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { if (pinInput === config.adminPin) setAuthed(true); else setPinError("Incorrect PIN. Try again."); } }}
            style={{ textAlign: "center", letterSpacing: "0.4em", fontFamily: T.mono, fontSize: "18px" }}
          />
          {pinError && <div className="flex items-center gap-1.5 mt-2" style={{ color: T.bad, fontSize: "12px" }}><AlertCircle size={13} />{pinError}</div>}
          <Button variant="brass" className="w-full mt-4" onClick={() => { if (pinInput === config.adminPin) setAuthed(true); else setPinError("Incorrect PIN. Try again."); }}>
            Unlock <ChevronRight size={15} />
          </Button>
        </div>
      </div>
    );
  }

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "batches", label: "Batches", icon: Layers },
    { id: "students", label: "Students", icon: Users },
    { id: "attendance", label: "Mark Attendance", icon: ClipboardList },
    { id: "homework", label: "Homework", icon: BookOpen },
    { id: "records", label: "Records", icon: Calendar },
    { id: "settings", label: "Settings", icon: ShieldCheck },
  ];
  const currentLabel = NAV.find((n) => n.id === tab)?.label || "Dashboard";

  return (
    <div className="min-h-screen">
      <style>{FONT_IMPORT}</style>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3.5 relative" style={{ background: T.ink }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <AULogo size={30} />
          <div className="min-w-0">
            <div style={{ fontFamily: T.display, color: "#fff", fontWeight: 600, fontSize: "15px", lineHeight: 1.1 }}>{config.instituteName}</div>
            <div style={{ color: T.brassSoft, fontSize: "11px", fontFamily: T.mono }}>{currentLabel}</div>
          </div>
        </div>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
          className="p-2 rounded-full hover:bg-white/10 shrink-0"
        >
          <MoreVertical size={20} color="#fff" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
            <div
              className="absolute right-4 md:right-6 top-[calc(100%+6px)] z-40 w-60 rounded-2xl overflow-hidden py-2"
              style={{ background: T.paperCard, boxShadow: "0 20px 45px rgba(16,26,48,0.3)", border: `1px solid ${T.line}` }}
            >
              {NAV.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { setTab(n.id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-black/5"
                  style={{
                    background: tab === n.id ? T.brassSoft : "transparent",
                    color: tab === n.id ? T.brass : T.ink,
                    fontSize: "13.5px",
                    fontWeight: 600,
                  }}
                >
                  <n.icon size={16} /> {n.label}
                </button>
              ))}
              <div style={{ borderTop: `1px solid ${T.line}`, margin: "6px 0" }} />
              <button
                onClick={() => { setAuthed(false); setPinInput(""); setMenuOpen(false); onExit(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-black/5"
                style={{ color: T.bad, fontSize: "13.5px", fontWeight: 600 }}
              >
                <LogOut size={16} /> Log out
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main */}
      <div className="p-5 md:p-8 max-w-6xl">
        {tab === "dashboard" && <Dashboard batches={batches} students={students} attendance={attendance} setTab={setTab} />}
        {tab === "batches" && <BatchesTab batches={batches} setBatches={setBatches} students={students} />}
        {tab === "students" && <StudentsTab students={students} setStudents={setStudents} batches={batches} />}
        {tab === "attendance" && <AttendanceTab batches={batches} students={students} attendance={attendance} setAttendance={setAttendance} />}
        {tab === "homework" && <HomeworkTab batches={batches} students={students} homework={homework} setHomework={setHomework} hwRecords={hwRecords} setHwRecords={setHwRecords} />}
        {tab === "records" && <RecordsTab students={students} batches={batches} attendance={attendance} homework={homework} hwRecords={hwRecords} />}
        {tab === "settings" && <SettingsTab config={config} setConfig={setConfig} batches={batches} setBatches={setBatches} students={students} setStudents={setStudents} attendance={attendance} setAttendance={setAttendance} homework={homework} setHomework={setHomework} hwRecords={hwRecords} setHwRecords={setHwRecords} />}
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, action }) {
  return (
    <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
      <div>
        <div style={{ fontFamily: T.mono, fontSize: "11px", color: T.brass, letterSpacing: "0.12em", marginBottom: "4px" }}>{eyebrow}</div>
        <h2 style={{ fontFamily: T.display, fontSize: "26px", color: T.ink, fontWeight: 600 }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

/* ---------------------- DASHBOARD ---------------------- */
function Dashboard({ batches, students, attendance, setTab }) {
  const today = todayStr();
  const todayRecords = attendance.filter((a) => a.date === today);
  const presentToday = todayRecords.filter((a) => a.status === "present").length;
  const dayName = DAYS[(new Date().getDay() + 6) % 7];
  const runningBatches = batches.filter((b) => b.days.includes(dayName));

  const stats = [
    { label: "Total Students", value: students.length, icon: Users },
    { label: "Present Today", value: presentToday, icon: CheckCircle2 },
    { label: "Active Batches", value: batches.length, icon: Layers },
    { label: "Running Today", value: runningBatches.length, icon: Clock },
  ];

  return (
    <div>
      <SectionHeader eyebrow={fmtDate(today)} title="Today at a glance" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: T.paperCard, border: `1px solid ${T.line}` }}>
            <s.icon size={16} color={T.brass} />
            <div style={{ fontFamily: T.display, fontSize: "28px", color: T.ink, fontWeight: 600, marginTop: "8px" }}>{s.value}</div>
            <div style={{ fontSize: "12px", color: T.slate }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5 mb-6" style={{ background: T.paperCard, border: `1px solid ${T.line}` }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: T.display, fontSize: "17px", color: T.ink, fontWeight: 600 }}>Batches running today · {dayName}</h3>
          <Button variant="ghost" onClick={() => setTab("attendance")}>Mark attendance <ChevronRight size={14} /></Button>
        </div>
        {runningBatches.length === 0 ? (
          <EmptyState icon={Layers} title="No batches today" note="Nothing scheduled for this weekday." />
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {runningBatches.map((b) => {
              const count = students.filter((s) => s.batchId === b.id).length;
              const present = todayRecords.filter((a) => students.find((s) => s.id === a.studentId)?.batchId === b.id && a.status === "present").length;
              return (
                <div key={b.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: T.paper }}>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: b.color }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: T.ink }}>{b.name}</div>
                      <div style={{ fontSize: "12px", color: T.slate, fontFamily: T.mono }}>{b.start} – {b.end}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: "12px", color: T.slate, fontFamily: T.mono }}>{present}/{count} in</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------- BATCHES ---------------------- */
const COLOR_CHOICES = ["#B5382C", "#2F7A4F", "#132247", "#3A5A9B", "#7A5AA8", "#B0432D"];

function BatchesTab({ batches, setBatches, students }) {
  const [modal, setModal] = useState(null); // null | {} | batch

  const save = async (draft) => {
    if (draft.id) await setBatches(batches.map((b) => (b.id === draft.id ? draft : b)));
    else await setBatches([...batches, { ...draft, id: uid() }]);
    setModal(null);
  };
  const remove = async (id) => {
    if (students.some((s) => s.batchId === id)) { alert("Move or remove students from this batch first."); return; }
    await setBatches(batches.filter((b) => b.id !== id));
  };

  return (
    <div>
      <SectionHeader eyebrow={`${batches.length} BATCHES`} title="Batches & timings" action={<Button variant="brass" onClick={() => setModal({})}><Plus size={15} /> New batch</Button>} />
      {batches.length === 0 ? (
        <EmptyState icon={Layers} title="No batches yet" note="Create your first batch to start scheduling classes." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {batches.map((b) => (
            <div key={b.id} className="rounded-2xl p-5" style={{ background: T.paperCard, border: `1px solid ${T.line}`, borderLeft: `5px solid ${b.color}` }}>
              <div className="flex items-start justify-between">
                <div>
                  <div style={{ fontFamily: T.display, fontSize: "17px", fontWeight: 600, color: T.ink }}>{b.name}</div>
                  <div style={{ fontSize: "12.5px", color: T.slate }}>{b.subject}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal(b)} className="p-1.5 rounded-full hover:bg-black/5"><Pencil size={14} color={T.slate} /></button>
                  <button onClick={() => remove(b.id)} className="p-1.5 rounded-full hover:bg-black/5"><Trash2 size={14} color={T.bad} /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3" style={{ fontFamily: T.mono, fontSize: "12.5px", color: T.ink }}>
                <Clock size={13} color={T.brass} /> {b.start} – {b.end}
              </div>
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {DAYS.map((d) => (
                  <span key={d} className="px-2 py-0.5 rounded-md text-[11px]" style={{ background: b.days.includes(d) ? T.brassSoft : T.paper, color: b.days.includes(d) ? T.brass : T.slateLight, fontWeight: 600 }}>{d}</span>
                ))}
              </div>
              <div className="mt-3" style={{ fontSize: "12px", color: T.slateLight }}>{students.filter((s) => s.batchId === b.id).length} students enrolled</div>
            </div>
          ))}
        </div>
      )}
      {modal !== null && <BatchModal batch={modal} onClose={() => setModal(null)} onSave={save} />}
    </div>
  );
}

function BatchModal({ batch, onClose, onSave }) {
  const [f, setF] = useState({ name: "", subject: "", start: "07:00", end: "08:30", days: [], color: COLOR_CHOICES[0], ...batch });
  const toggleDay = (d) => setF((s) => ({ ...s, days: s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d] }));
  return (
    <Modal title={batch.id ? "Edit batch" : "New batch"} onClose={onClose}>
      <Field label="Batch name"><TextInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Class 10 — Morning Batch" /></Field>
      <Field label="Subject / focus"><TextInput value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="e.g. Science & Maths" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start time"><TextInput type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
        <Field label="End time"><TextInput type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
      </div>
      <Field label="Runs on">
        <div className="flex gap-1.5 flex-wrap">
          {DAYS.map((d) => (
            <button key={d} onClick={() => toggleDay(d)} type="button" className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: f.days.includes(d) ? T.ink : T.paper, color: f.days.includes(d) ? "#fff" : T.slate }}>{d}</button>
          ))}
        </div>
      </Field>
      <Field label="Color tag">
        <div className="flex gap-2">
          {COLOR_CHOICES.map((c) => (
            <button key={c} onClick={() => setF({ ...f, color: c })} className="w-7 h-7 rounded-full" style={{ background: c, outline: f.color === c ? `2px solid ${T.ink}` : "none", outlineOffset: "2px" }} />
          ))}
        </div>
      </Field>
      <Button variant="brass" className="w-full mt-2" disabled={!f.name || f.days.length === 0} onClick={() => onSave(f)}><Save size={15} /> Save batch</Button>
    </Modal>
  );
}

/* ---------------------- STUDENTS ---------------------- */
function StudentsTab({ students, setStudents, batches }) {
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");

  const filtered = students.filter((s) => {
    const matchQ = s.name.toLowerCase().includes(query.toLowerCase()) || s.code.toLowerCase().includes(query.toLowerCase());
    const matchB = batchFilter === "all" || s.batchId === batchFilter;
    return matchQ && matchB;
  });

  const save = async (draft) => {
    if (draft.id) await setStudents(students.map((s) => (s.id === draft.id ? draft : s)));
    else await setStudents([...students, { ...draft, id: uid(), code: rollCode(draft.name), joined: todayStr() }]);
    setModal(null);
  };
  const remove = async (id) => { if (confirm("Remove this student and their record access?")) await setStudents(students.filter((s) => s.id !== id)); };

  return (
    <div>
      <SectionHeader eyebrow={`${students.length} STUDENTS`} title="Students" action={<Button variant="brass" onClick={() => setModal({})}><Plus size={15} /> Add student</Button>} />
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} color={T.slateLight} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or roll code…" style={{ paddingLeft: "34px" }} />
        </div>
        <Select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} style={{ width: "auto" }}>
          <option value="all">All batches</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No students found" note="Try a different search or add a new student." />
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${T.line}`, background: T.paperCard }}>
          {filtered.map((s, i) => {
            const b = batches.find((x) => x.id === s.batchId);
            return (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 flex-wrap gap-2" style={{ borderTop: i ? `1px solid ${T.line}` : "none" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: T.brassSoft, color: T.brass, fontFamily: T.display, fontWeight: 700, fontSize: "14px" }}>
                    {s.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: T.ink }}>{s.name}</div>
                    <div style={{ fontSize: "12px", color: T.slate }}>{b ? b.name : "Unassigned"} · {s.parentName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md" style={{ background: T.paper, fontFamily: T.mono, fontSize: "11.5px", color: T.brass, fontWeight: 600 }}>{s.code}</span>
                  <button onClick={() => setModal(s)} className="p-1.5 rounded-full hover:bg-black/5"><Pencil size={14} color={T.slate} /></button>
                  <button onClick={() => remove(s.id)} className="p-1.5 rounded-full hover:bg-black/5"><Trash2 size={14} color={T.bad} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {modal !== null && <StudentModal student={modal} batches={batches} onClose={() => setModal(null)} onSave={save} />}
    </div>
  );
}

function StudentModal({ student, batches, onClose, onSave }) {
  const [f, setF] = useState({ name: "", batchId: batches[0]?.id || "", parentName: "", parentPhone: "", ...student });
  return (
    <Modal title={student.id ? "Edit student" : "Add student"} onClose={onClose}>
      <Field label="Student name"><TextInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Full name" /></Field>
      <Field label="Batch">
        <Select value={f.batchId} onChange={(e) => setF({ ...f, batchId: e.target.value })}>
          {batches.length === 0 && <option value="">Create a batch first</option>}
          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </Field>
      <Field label="Parent / guardian name"><TextInput value={f.parentName} onChange={(e) => setF({ ...f, parentName: e.target.value })} placeholder="Full name" /></Field>
      <Field label="Parent phone"><TextInput value={f.parentPhone} onChange={(e) => setF({ ...f, parentPhone: e.target.value })} placeholder="+91 …" /></Field>
      {student.code && (
        <div className="rounded-lg px-3 py-2 mb-4 flex items-center gap-2" style={{ background: T.brassSoft }}>
          <BadgeCheck size={15} color={T.brass} />
          <span style={{ fontFamily: T.mono, fontSize: "12.5px", color: T.brass, fontWeight: 600 }}>Roll code: {student.code}</span>
        </div>
      )}
      <Button variant="brass" className="w-full mt-1" disabled={!f.name || !f.batchId} onClick={() => onSave(f)}><Save size={15} /> Save student</Button>
      {!student.id && <p style={{ fontSize: "11.5px", color: T.slateLight, marginTop: "10px" }}>A unique roll code is generated automatically — share it with the parent for record lookup.</p>}
    </Modal>
  );
}

/* ---------------------- ATTENDANCE ---------------------- */
function AttendanceTab({ batches, students, attendance, setAttendance }) {
  const [date, setDate] = useState(todayStr());
  const [batchId, setBatchId] = useState(batches[0]?.id || "");
  const roster = students.filter((s) => s.batchId === batchId);

  const recordFor = (studentId) => attendance.find((a) => a.studentId === studentId && a.date === date);

  const setStatus = async (studentId, status) => {
    const existing = recordFor(studentId);
    let next;
    if (existing) {
      next = attendance.map((a) => (a === existing ? { ...a, status, checkIn: status === "present" ? (a.checkIn || nowTime()) : null, checkOut: status === "present" ? a.checkOut : null } : a));
    } else {
      next = [...attendance, { id: uid(), studentId, date, status, checkIn: status === "present" ? nowTime() : null, checkOut: null }];
    }
    await setAttendance(next);
  };
  const markCheckout = async (studentId) => {
    const existing = recordFor(studentId);
    if (!existing) return;
    await setAttendance(attendance.map((a) => (a === existing ? { ...a, checkOut: nowTime() } : a)));
  };

  return (
    <div>
      <SectionHeader eyebrow="ROLL CALL" title="Mark attendance" />
      <div className="flex gap-2 mb-5 flex-wrap">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "auto" }} />
        <Select value={batchId} onChange={(e) => setBatchId(e.target.value)} style={{ width: "auto" }}>
          {batches.length === 0 && <option value="">No batches yet</option>}
          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </div>

      {roster.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No students in this batch" note="Add students to this batch to start marking attendance." />
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${T.line}`, background: T.paperCard }}>
          {roster.map((s, i) => {
            const rec = recordFor(s.id);
            const status = rec?.status || "pending";
            return (
              <div key={s.id} className="flex items-center justify-between px-4 py-3.5 flex-wrap gap-3" style={{ borderTop: i ? `1px solid ${T.line}` : "none" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: T.brassSoft, color: T.brass, fontFamily: T.display, fontWeight: 700, fontSize: "14px" }}>
                    {s.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: T.ink }}>{s.name}</div>
                    {rec?.checkIn && <div style={{ fontSize: "11.5px", color: T.slate, fontFamily: T.mono }}>In {rec.checkIn}{rec.checkOut ? ` · Out ${rec.checkOut}` : ""}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Stamp state={status} />
                  <button onClick={() => setStatus(s.id, "present")} className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80" style={{ background: T.good, color: "#fff" }}><LogIn size={12} className="inline mr-1" />Arrived</button>
                  {status === "present" && !rec?.checkOut && (
                    <button onClick={() => markCheckout(s.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80" style={{ background: T.ink, color: "#fff" }}>Mark left</button>
                  )}
                  <button onClick={() => setStatus(s.id, "absent")} className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80" style={{ background: T.badSoft, color: T.bad }}>Absent</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------------- HOMEWORK ---------------------- */
function HomeworkTab({ batches, students, homework, setHomework, hwRecords, setHwRecords }) {
  const [modal, setModal] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const saveHw = async (draft) => {
    if (draft.id) await setHomework(homework.map((h) => (h.id === draft.id ? draft : h)));
    else await setHomework([{ ...draft, id: uid(), assignedDate: todayStr() }, ...homework]);
    setModal(null);
  };
  const removeHw = async (id) => {
    if (!confirm("Delete this homework and all grading for it?")) return;
    await setHomework(homework.filter((h) => h.id !== id));
    await setHwRecords(hwRecords.filter((r) => r.homeworkId !== id));
  };

  const recordFor = (hwId, studentId) => hwRecords.find((r) => r.homeworkId === hwId && r.studentId === studentId);
  const setHwStatus = async (hwId, studentId, status) => {
    const existing = recordFor(hwId, studentId);
    const next = existing
      ? hwRecords.map((r) => (r === existing ? { ...r, status } : r))
      : [...hwRecords, { id: uid(), homeworkId: hwId, studentId, status, score: "", remarks: "" }];
    await setHwRecords(next);
  };
  const setHwField = async (hwId, studentId, field, value) => {
    const existing = recordFor(hwId, studentId);
    const next = existing
      ? hwRecords.map((r) => (r === existing ? { ...r, [field]: value } : r))
      : [...hwRecords, { id: uid(), homeworkId: hwId, studentId, status: "pending", score: "", remarks: "", [field]: value }];
    await setHwRecords(next);
  };

  const sorted = [...homework].sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));

  return (
    <div>
      <SectionHeader eyebrow={`${homework.length} ASSIGNED`} title="Homework tracker" action={<Button variant="brass" onClick={() => setModal({})}><Plus size={15} /> Assign homework</Button>} />
      {sorted.length === 0 ? (
        <EmptyState icon={BookOpen} title="No homework assigned yet" note="Assign homework to a batch, then grade it here as students submit." />
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((hw) => {
            const batch = batches.find((b) => b.id === hw.batchId);
            const roster = students.filter((s) => s.batchId === hw.batchId);
            const doneCount = roster.filter((s) => recordFor(hw.id, s.id)?.status === "done").length;
            const isOpen = expanded === hw.id;
            return (
              <div key={hw.id} className="rounded-2xl overflow-hidden" style={{ background: T.paperCard, border: `1px solid ${T.line}` }}>
                <button onClick={() => setExpanded(isOpen ? null : hw.id)} className="w-full flex items-center justify-between px-5 py-4 text-left flex-wrap gap-2">
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: batch?.color || T.brass }} />
                    <div>
                      <div style={{ fontFamily: T.display, fontSize: "16px", fontWeight: 600, color: T.ink }}>{hw.title}</div>
                      <div style={{ fontSize: "12px", color: T.slate }}>{batch ? batch.name : "Unassigned batch"} · {hw.subject}</div>
                      <div style={{ fontSize: "11.5px", color: T.slateLight, fontFamily: T.mono, marginTop: "3px" }}>Due {fmtDate(hw.dueDate)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-md" style={{ background: T.goodSoft, color: T.good, fontSize: "11.5px", fontWeight: 700, fontFamily: T.mono }}>{doneCount}/{roster.length} done</span>
                    <ChevronDown size={16} color={T.slate} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                  </div>
                </button>

                {isOpen && (
                  <div style={{ borderTop: `1px solid ${T.line}` }}>
                    {hw.description && <p className="px-5 pt-4 pb-1" style={{ fontSize: "12.5px", color: T.slate }}>{hw.description}</p>}
                    <div className="flex gap-2 px-5 pt-2">
                      <button onClick={() => setModal(hw)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: T.slate }}><Pencil size={12} /> Edit</button>
                      <button onClick={() => removeHw(hw.id)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: T.bad }}><Trash2 size={12} /> Delete</button>
                    </div>
                    {roster.length === 0 ? (
                      <div className="px-5 py-4" style={{ fontSize: "12.5px", color: T.slateLight }}>No students in this batch yet.</div>
                    ) : (
                      <div className="px-2 pb-2 pt-2">
                        {roster.map((s) => {
                          const rec = recordFor(hw.id, s.id);
                          const status = rec?.status || "pending";
                          return (
                            <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5 flex-wrap rounded-xl">
                              <div className="flex items-center gap-2.5 min-w-[140px]">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: T.brassSoft, color: T.brass, fontFamily: T.display, fontWeight: 700, fontSize: "12.5px" }}>
                                  {s.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                                </div>
                                <span style={{ fontWeight: 600, fontSize: "13.5px", color: T.ink }}>{s.name}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Stamp state={status} />
                                <button onClick={() => setHwStatus(hw.id, s.id, "done")} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: T.good, color: "#fff" }}>Done</button>
                                <button onClick={() => setHwStatus(hw.id, s.id, "missed")} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: T.badSoft, color: T.bad }}>Missed</button>
                                <input
                                  defaultValue={rec?.score || ""} placeholder="Score e.g. 8/10"
                                  onBlur={(e) => setHwField(hw.id, s.id, "score", e.target.value)}
                                  style={{ ...inputStyle, width: "110px", padding: "6px 8px", fontSize: "12px" }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {modal !== null && <HomeworkModal hw={modal} batches={batches} onClose={() => setModal(null)} onSave={saveHw} />}
    </div>
  );
}

function HomeworkModal({ hw, batches, onClose, onSave }) {
  const [f, setF] = useState({ batchId: batches[0]?.id || "", title: "", subject: "", description: "", dueDate: todayStr(), ...hw });
  return (
    <Modal title={hw.id ? "Edit homework" : "Assign homework"} onClose={onClose} wide>
      <Field label="Batch">
        <Select value={f.batchId} onChange={(e) => setF({ ...f, batchId: e.target.value })}>
          {batches.length === 0 && <option value="">Create a batch first</option>}
          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </Field>
      <Field label="Title"><TextInput value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Quadratic Equations — Worksheet 3" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Subject"><TextInput value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="e.g. Maths" /></Field>
        <Field label="Due date"><TextInput type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
      </div>
      <Field label="Description / instructions"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="What should students do?" /></Field>
      <Button variant="brass" className="w-full mt-1" disabled={!f.title || !f.batchId} onClick={() => onSave(f)}><Save size={15} /> Save homework</Button>
    </Modal>
  );
}

/* ---------------------- RECORDS ---------------------- */
function RecordsTab({ students, batches, attendance, homework, hwRecords }) {
  const [studentId, setStudentId] = useState(students[0]?.id || "");
  const student = students.find((s) => s.id === studentId);
  const batch = batches.find((b) => b.id === student?.batchId);
  const history = attendance.filter((a) => a.studentId === studentId).sort((a, b) => (a.date < b.date ? 1 : -1));
  const presentCount = history.filter((h) => h.status === "present").length;

  const batchHomework = homework.filter((h) => h.batchId === student?.batchId);
  const hwWithStatus = batchHomework.map((h) => ({ ...h, rec: hwRecords.find((r) => r.homeworkId === h.id && r.studentId === studentId) }));
  const hwDone = hwWithStatus.filter((h) => h.rec?.status === "done").length;
  const hwGraded = batchHomework.length;
  const hwPct = hwGraded ? Math.round((hwDone / hwGraded) * 100) : 0;

  return (
    <div>
      <SectionHeader eyebrow="LEDGER" title="Attendance records" />
      <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} style={{ width: "auto", marginBottom: "20px" }}>
        {students.length === 0 && <option>No students yet</option>}
        {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>

      {!student ? (
        <EmptyState icon={Calendar} title="Add a student to see records" note="Once students are enrolled, their attendance history appears here." />
      ) : (
        <>
          <div className="rounded-2xl p-5 mb-5 flex items-center justify-between flex-wrap gap-3" style={{ background: T.ink }}>
            <div>
              <div style={{ fontFamily: T.display, color: "#fff", fontSize: "19px", fontWeight: 600 }}>{student.name}</div>
              <div style={{ color: "#AEB6C6", fontSize: "12.5px" }}>{batch?.name} · Roll {student.code}</div>
            </div>
            <div className="text-right">
              <div style={{ fontFamily: T.display, color: T.brassSoft, fontSize: "24px", fontWeight: 700 }}>{presentCount}</div>
              <div style={{ color: "#AEB6C6", fontSize: "11px" }}>days present logged</div>
            </div>
          </div>

          {history.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No attendance marked yet" note="Records will appear once attendance is taken." />
          ) : (
            <div className="rounded-2xl overflow-hidden mb-6" style={{ border: `1px solid ${T.line}`, background: T.paperCard }}>
              {history.map((h, i) => (
                <div key={h.id} className="flex items-center justify-between px-4 py-3" style={{ borderTop: i ? `1px solid ${T.line}` : "none" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "13.5px", color: T.ink }}>{fmtDate(h.date)}</div>
                    {h.checkIn && <div style={{ fontSize: "11.5px", color: T.slate, fontFamily: T.mono }}>In {h.checkIn}{h.checkOut ? ` · Out ${h.checkOut}` : " · still at institute"}</div>}
                  </div>
                  <Stamp state={h.status} />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontFamily: T.display, fontSize: "16px", fontWeight: 600, color: T.ink }}>Homework performance</h3>
            {hwGraded > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ background: T.brassSoft, color: T.brass, fontSize: "12px", fontWeight: 700, fontFamily: T.mono }}>
                <Award size={13} /> {hwPct}% completed
              </span>
            )}
          </div>
          {hwWithStatus.length === 0 ? (
            <EmptyState icon={BookOpen} title="No homework for this batch yet" note="Assigned homework and grading will show up here." />
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${T.line}`, background: T.paperCard }}>
              {hwWithStatus.map((h, i) => (
                <div key={h.id} className="flex items-center justify-between px-4 py-3 flex-wrap gap-2" style={{ borderTop: i ? `1px solid ${T.line}` : "none" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "13.5px", color: T.ink }}>{h.title}</div>
                    <div style={{ fontSize: "11.5px", color: T.slate, fontFamily: T.mono }}>Due {fmtDate(h.dueDate)}{h.rec?.score ? ` · Score ${h.rec.score}` : ""}</div>
                  </div>
                  <Stamp state={h.rec?.status || "pending"} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------------- SETTINGS ---------------------- */
function SettingsTab({ config, setConfig, batches, setBatches, students, setStudents, attendance, setAttendance, homework, setHomework, hwRecords, setHwRecords }) {
  const [pin, setPin] = useState(config.adminPin);
  const [name, setName] = useState(config.instituteName);
  const [saved, setSaved] = useState(false);

  const resetDemo = async () => {
    if (!confirm("This clears all batches, students and attendance. Continue?")) return;
    await setBatches([]); await setStudents([]); await setAttendance([]); await setHomework([]); await setHwRecords([]);
  };

  return (
    <div>
      <SectionHeader eyebrow="CONFIGURE" title="Settings" />
      <div className="rounded-2xl p-5 mb-5 max-w-md" style={{ background: T.paperCard, border: `1px solid ${T.line}` }}>
        <Field label="Institute name"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Admin PIN"><TextInput value={pin} maxLength={6} onChange={(e) => setPin(e.target.value)} style={{ fontFamily: T.mono, letterSpacing: "0.2em" }} /></Field>
        <Button variant="brass" onClick={async () => { await setConfig({ ...config, instituteName: name, adminPin: pin }); setSaved(true); setTimeout(() => setSaved(false), 1500); }}>
          <Save size={15} /> {saved ? "Saved" : "Save changes"}
        </Button>
      </div>

      <div className="rounded-2xl p-5 max-w-md" style={{ background: T.badSoft, border: `1px solid ${T.bad}22` }}>
        <div style={{ fontWeight: 700, color: T.bad, fontSize: "14px", marginBottom: "4px" }}>Danger zone</div>
        <p style={{ fontSize: "12.5px", color: T.slate, marginBottom: "12px" }}>Permanently clear all batches, students, attendance and homework history.</p>
        <Button variant="danger" onClick={resetDemo}><RotateCcw size={14} /> Reset all data</Button>
      </div>

      <div className="mt-6 max-w-md rounded-2xl p-4 flex gap-2" style={{ background: T.paper, border: `1px dashed ${T.line}` }}>
        <AlertCircle size={16} color={T.slateLight} className="shrink-0 mt-0.5" />
        <p style={{ fontSize: "12px", color: T.slateLight }}>This prototype stores data for anyone who opens this app link — there's no separate login per parent, and changes need a page refresh to appear on other open devices. For a production rollout with real accounts, push notifications and photo IDs, this would move to a proper backend.</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   PARENT APP
--------------------------------------------------------------------- */
function ParentApp({ instituteName, batches, students, attendance, homework, hwRecords, onExit }) {
  const [code, setCode] = useState("");
  const [student, setStudent] = useState(null);
  const [error, setError] = useState("");

  const lookup = () => {
    const found = students.find((s) => s.code.toLowerCase() === code.trim().toLowerCase());
    if (found) { setStudent(found); setError(""); }
    else setError("No student found with that roll code. Check with the institute if you're unsure.");
  };

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: T.ink }}>
        <style>{FONT_IMPORT}</style>
        <div className="w-full max-w-sm rounded-2xl p-7" style={{ background: T.paperCard }}>
          <button onClick={onExit} className="flex items-center gap-1.5 mb-5" style={{ color: T.slate, fontSize: "13px" }}><ArrowLeft size={15} /> Back</button>
          <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ background: T.brassSoft }}>
            <UserCheck size={20} color={T.brass} />
          </div>
          <h2 style={{ fontFamily: T.display, fontSize: "22px", color: T.ink, fontWeight: 600 }}>Find your child</h2>
          <p style={{ fontSize: "13px", color: T.slate, marginBottom: "18px" }}>Enter the roll code given by {instituteName} when your child enrolled.</p>
          <TextInput
            value={code} onChange={(e) => { setCode(e.target.value); setError(""); }} placeholder="e.g. AU-AM4821"
            onKeyDown={(e) => e.key === "Enter" && lookup()}
            style={{ fontFamily: T.mono, letterSpacing: "0.05em", textAlign: "center", fontSize: "15px" }}
          />
          {error && <div className="flex items-center gap-1.5 mt-2" style={{ color: T.bad, fontSize: "12px" }}><AlertCircle size={13} />{error}</div>}
          <Button variant="brass" className="w-full mt-4" onClick={lookup}>Find child <ChevronRight size={15} /></Button>
        </div>
      </div>
    );
  }

  const batch = batches.find((b) => b.id === student.batchId);
  const batchHomework = homework.filter((h) => h.batchId === student.batchId).sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));
  const hwWithStatus = batchHomework.map((h) => ({ ...h, rec: hwRecords.find((r) => r.homeworkId === h.id && r.studentId === student.id) }));
  const hwDoneCount = hwWithStatus.filter((h) => h.rec?.status === "done").length;
  const hwPct = batchHomework.length ? Math.round((hwDoneCount / batchHomework.length) * 100) : 0;
  const history = attendance.filter((a) => a.studentId === student.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const today = history.find((h) => h.date === todayStr());
  const todayStatus = today ? (today.checkOut ? "left" : "present") : "pending";

  const statusCopy = {
    present: { label: "Reached institute", sub: today?.checkIn ? `Checked in at ${today.checkIn}` : "", color: T.good, bg: T.goodSoft, Icon: CheckCircle2 },
    left: { label: "Left institute", sub: `In ${today?.checkIn} · Out ${today?.checkOut}`, color: T.slate, bg: T.paper, Icon: LogOut },
    pending: { label: "Not marked yet today", sub: "The institute hasn't taken attendance yet.", color: T.slateLight, bg: "#EEF0EC", Icon: Clock },
  }[todayStatus];

  return (
    <div className="min-h-screen" style={{ background: T.paper }}>
      <style>{FONT_IMPORT}</style>
      <div style={{ background: T.ink }} className="px-6 py-5 flex items-center justify-between">
        <button onClick={() => setStudent(null)} className="flex items-center gap-1.5" style={{ color: "#AEB6C6", fontSize: "13px" }}><ArrowLeft size={15} /> Different student</button>
        <div className="flex items-center gap-1.5" style={{ color: "#AEB6C6", fontSize: "12px", fontFamily: T.mono }}><Building2 size={13} /> {instituteName}</div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: T.brassSoft, color: T.brass, fontFamily: T.display, fontWeight: 700, fontSize: "17px" }}>
            {student.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </div>
          <div>
            <div style={{ fontFamily: T.display, fontSize: "19px", fontWeight: 600, color: T.ink }}>{student.name}</div>
            <div style={{ fontSize: "12.5px", color: T.slate }}>Roll {student.code}</div>
          </div>
        </div>

        <div className="rounded-2xl p-5 mb-4 flex items-center gap-4" style={{ background: statusCopy.bg, border: `1.5px solid ${statusCopy.color}33` }}>
          <statusCopy.Icon size={28} color={statusCopy.color} />
          <div>
            <div style={{ fontFamily: T.display, fontSize: "18px", fontWeight: 700, color: statusCopy.color }}>{statusCopy.label}</div>
            <div style={{ fontSize: "12.5px", color: T.slate, fontFamily: T.mono }}>{statusCopy.sub}</div>
          </div>
        </div>

        {batch && (
          <div className="rounded-2xl p-5 mb-6" style={{ background: T.paperCard, border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: "11px", color: T.brass, fontFamily: T.mono, letterSpacing: "0.08em", marginBottom: "6px" }}>BATCH & TIMING</div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: T.ink }}>{batch.name}</div>
            <div style={{ fontSize: "13px", color: T.slate, marginBottom: "8px" }}>{batch.subject}</div>
            <div className="flex items-center gap-2 mb-2" style={{ fontFamily: T.mono, fontSize: "13px", color: T.ink }}>
              <Clock size={14} color={T.brass} /> {batch.start} – {batch.end}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((d) => (
                <span key={d} className="px-2 py-0.5 rounded-md text-[11px]" style={{ background: batch.days.includes(d) ? T.brassSoft : T.paper, color: batch.days.includes(d) ? T.brass : T.slateLight, fontWeight: 600 }}>{d}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontFamily: T.display, fontSize: "16px", fontWeight: 600, color: T.ink, marginBottom: "10px" }}>Attendance history</div>
        {history.length === 0 ? (
          <EmptyState icon={Calendar} title="No records yet" note="Attendance will appear here once the institute marks it." />
        ) : (
          <div className="rounded-2xl overflow-hidden mb-6" style={{ border: `1px solid ${T.line}`, background: T.paperCard }}>
            {history.slice(0, 30).map((h, i) => (
              <div key={h.id} className="flex items-center justify-between px-4 py-3" style={{ borderTop: i ? `1px solid ${T.line}` : "none" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "13.5px", color: T.ink }}>{fmtDate(h.date)}</div>
                  {h.checkIn && <div style={{ fontSize: "11.5px", color: T.slate, fontFamily: T.mono }}>In {h.checkIn}{h.checkOut ? ` · Out ${h.checkOut}` : ""}</div>}
                </div>
                <Stamp state={h.status} />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div style={{ fontFamily: T.display, fontSize: "16px", fontWeight: 600, color: T.ink }}>Homework performance</div>
          {batchHomework.length > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ background: T.brassSoft, color: T.brass, fontSize: "12px", fontWeight: 700, fontFamily: T.mono }}>
              <Award size={13} /> {hwPct}% completed
            </span>
          )}
        </div>
        {hwWithStatus.length === 0 ? (
          <EmptyState icon={BookOpen} title="No homework yet" note="Homework assigned to this batch will appear here." />
        ) : (
          <div className="rounded-2xl overflow-hidden mb-6" style={{ border: `1px solid ${T.line}`, background: T.paperCard }}>
            {hwWithStatus.map((h, i) => (
              <div key={h.id} className="flex items-center justify-between px-4 py-3 flex-wrap gap-2" style={{ borderTop: i ? `1px solid ${T.line}` : "none" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "13.5px", color: T.ink }}>{h.title}</div>
                  <div style={{ fontSize: "11.5px", color: T.slate }}>{h.subject} · Due {fmtDate(h.dueDate)}{h.rec?.score ? ` · Score ${h.rec.score}` : ""}</div>
                </div>
                <Stamp state={h.rec?.status || "pending"} />
              </div>
            ))}
          </div>
        )}

        {student.parentPhone && (
          <div className="flex items-center gap-2 justify-center mb-4" style={{ fontSize: "12px", color: T.slateLight }}>
            <Phone size={13} /> Registered contact: {student.parentPhone}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   MOUNT
--------------------------------------------------------------------- */
const root = createRoot(document.getElementById("root"));
root.render(<App />);
