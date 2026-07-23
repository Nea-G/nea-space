const { useState, useEffect, useRef, useMemo } = React;

/* ============================== utils ============================== */

let idCounter = 0;
function uid(prefix) {
  idCounter += 1;
  return `${prefix || "id"}_${Date.now().toString(36)}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

function pad2(n) { return String(n).padStart(2, "0"); }
function toISODate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function parseISODate(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function startOfWeek(d) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(startOfDay(d), diff);
}
function sameDate(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function weeksBetween(a, b) { return Math.round((startOfDay(a) - startOfDay(b)) / (7 * 86400000)); }
function weekdayIndex(d) { return d.getDay() === 0 ? 6 : d.getDay() - 1; } // Mon=0..Sun=6
function formatDateLabel(d) { return `${DAY_NAMES[weekdayIndex(d)]}, ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`; }

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8am .. 9pm

function hourLabel(h) {
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${period}`;
}

const TYPE_COLORS = {
  deadline: "#9b3b3b",
  meeting: "#5b7c99",
  personal: "#6b8f71",
  class: "#b68235",
  other: "#7d7979",
};
const TYPE_LABELS = { deadline: "Deadline", meeting: "Meeting", personal: "Personal", class: "Class", other: "Other" };

const COURSE_PALETTE = ["#b68235", "#6b8f71", "#5b7c99", "#9b3b3b", "#7a5ea8"];
const HABIT_PALETTE = ["#b68235", "#6b8f71", "#5b7c99", "#9b3b3b", "#7a5ea8", "#a0763f"];

const ASSISTANT_LINES = [
  "systems nominal. proceed with the day.",
  "all subroutines report ready.",
  "battery at full charge — go get it.",
  "diagnostics clean. no errors detected.",
  "today's protocol: show up, then improve.",
  "sensors calm. focus mode engaged.",
  "small tasks compound into big systems.",
];

function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

/* ============================== storage ============================== */

const STORAGE_KEY = "life-planner-data-v1";

function seedState() {
  const today = startOfDay(new Date());
  const monday = startOfWeek(today);
  const mk = (dayOffset, start, end, title, type, repeat) => ({
    id: uid("ev"), title, day: dayOffset, start, end, type, repeat: repeat || "weekly",
    startDate: toISODate(addDays(monday, dayOffset)),
  });
  const courseIds = { psyc: uid("c"), cs: uid("c"), econ: uid("c"), engl: uid("c"), stat: uid("c") };
  const mkAssignment = (courseId, title, date) => {
    const d = startOfDay(date);
    return { id: uid("ev"), title, courseId, type: "deadline", repeat: "none", startDate: toISODate(d), day: weekdayIndex(d), start: 17, end: 18 };
  };
  return {
    settings: { userName: "Nea" },
    events: [
      mk(0, 9, 10, "Team standup", "meeting", "weekly"),
      mk(1, 14, 16, "Studio time", "personal", "weekly"),
      mk(2, 10, 12, "Seminar", "class", "weekly"),
      mk(4, 17, 18, "Passport renewal", "deadline", "none"),
      mkAssignment(courseIds.psyc, "Reading response", addDays(today, 3)),
      mkAssignment(courseIds.cs, "Problem set 4", addDays(today, 6)),
      mkAssignment(courseIds.engl, "Essay draft", addDays(today, 3)),
    ],
    gym: {
      days: [
        { id: 1, label: "Push" },
        { id: 2, label: "Pull" },
        { id: 3, label: "Legs" },
        { id: 4, label: "Upper" },
      ],
      lifts: {
        1: [
          { id: uid("l"), name: "Bench press", subtitle: "flat barbell", reps: "4×8", done: false },
          { id: uid("l"), name: "Overhead press", subtitle: "", reps: "3×10", done: false },
          { id: uid("l"), name: "Tricep pushdown", subtitle: "", reps: "3×12", done: false },
        ],
        2: [
          { id: uid("l"), name: "Deadlift", subtitle: "", reps: "3×5", done: false },
          { id: uid("l"), name: "Lat pulldown", subtitle: "", reps: "3×10", done: false },
          { id: uid("l"), name: "Bicep curl", subtitle: "", reps: "3×12", done: false },
        ],
        3: [
          { id: uid("l"), name: "Squat", subtitle: "", reps: "4×6", done: false },
          { id: uid("l"), name: "Leg press", subtitle: "", reps: "3×10", done: false },
          { id: uid("l"), name: "Calf raise", subtitle: "", reps: "4×15", done: false },
        ],
        4: [
          { id: uid("l"), name: "Incline dumbbell press", subtitle: "", reps: "3×10", done: false },
          { id: uid("l"), name: "Cable row", subtitle: "", reps: "3×10", done: false },
          { id: uid("l"), name: "Lateral raise", subtitle: "", reps: "3×15", done: false },
        ],
      },
      pointer: 1,
      log: {},
    },
    courses: [
      { id: courseIds.psyc, code: "PSYC201", name: "Cognitive Psychology", color: COURSE_PALETTE[0],
        todos: [{ id: uid("t"), text: "Review lecture notes", done: false }] },
      { id: courseIds.cs, code: "CS340", name: "Algorithms", color: COURSE_PALETTE[1],
        todos: [{ id: uid("t"), text: "Start dynamic programming set", done: false }] },
      { id: courseIds.econ, code: "ECON110", name: "Microeconomics", color: COURSE_PALETTE[2], todos: [] },
      { id: courseIds.engl, code: "ENGL215", name: "Modern Fiction", color: COURSE_PALETTE[3], todos: [] },
      { id: courseIds.stat, code: "STAT250", name: "Probability", color: COURSE_PALETTE[4], todos: [] },
    ],
    habits: [
      { id: uid("h"), name: "Read 20 minutes", color: HABIT_PALETTE[0], history: {} },
      { id: uid("h"), name: "Meditate", color: HABIT_PALETTE[1], history: {} },
      { id: uid("h"), name: "Drink 2L water", color: HABIT_PALETTE[2], history: {} },
      { id: uid("h"), name: "Journal", color: HABIT_PALETTE[3], history: {} },
    ],
    personal: {
      utfrTitle: "UTFR",
      utfrSubtitle: "next meeting · Thu 6:00–8:00 PM",
      utfr: [{ id: uid("t"), text: "Send budget update", done: false }],
      generalTitle: "General",
      generalSubtitle: "everything else on your plate",
      general: [{ id: uid("t"), text: "Book dentist appointment", done: false }],
    },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    return { ...seedState(), ...parsed };
  } catch (e) {
    return seedState();
  }
}

/* ============================== array helpers ============================== */

function updateItem(arr, id, patch) {
  return arr.map((x) => (x.id === id ? { ...x, ...(typeof patch === "function" ? patch(x) : patch) } : x));
}
function removeItem(arr, id) { return arr.filter((x) => x.id !== id); }
function reorderArray(arr, fromId, toId) {
  const fromIdx = arr.findIndex((x) => x.id === fromId);
  const toIdx = arr.findIndex((x) => x.id === toId);
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return arr;
  const copy = arr.slice();
  const [moved] = copy.splice(fromIdx, 1);
  copy.splice(toIdx, 0, moved);
  return copy;
}

function useDragReorder(onReorder) {
  const dragId = useRef(null);
  return {
    onDragStart: (id) => (e) => { dragId.current = id; try { e.dataTransfer.effectAllowed = "move"; } catch (err) {} },
    onDragOver: () => (e) => { e.preventDefault(); },
    onDrop: (id) => (e) => {
      e.preventDefault();
      if (dragId.current == null || dragId.current === id) return;
      onReorder(dragId.current, id);
      dragId.current = null;
    },
  };
}

/* ============================== small shared components ============================== */

function DragHandle(props) {
  return <span className="drag-handle" title="Drag to reorder" draggable onDragStart={props.onDragStart}>⠇</span>;
}

function IconButton(props) {
  return (
    <button className={"icon-btn" + (props.danger ? " danger" : "")} title={props.title} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

/* A row with: check circle / checkbox, drag handle, editable text (toggle), remove button. Used by School todos + Personal todos. */
function TodoRow({ item, onToggle, onRemove, onUpdate, dragProps, checkboxStyle }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  useEffect(() => { setDraft(item.text); }, [item.text]);

  function commit() {
    const v = draft.trim();
    if (v) onUpdate({ text: v });
    setEditing(false);
  }

  return (
    <div
      className="row-item"
      style={{ padding: "6px 10px", background: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
      onDragOver={dragProps.onDragOver()}
      onDrop={dragProps.onDrop(item.id)}
    >
      {checkboxStyle ? (
        <input type="checkbox" checked={item.done} onChange={onToggle} style={{ flex: "none" }} />
      ) : (
        <button
          key={item.done}
          onClick={onToggle}
          title="Mark done"
          className="pop-in"
          style={{
            width: 15, height: 15, borderRadius: "50%", border: "1.5px solid var(--color-accent)",
            background: item.done ? "var(--color-accent)" : "transparent", flex: "none", cursor: "pointer", padding: 0,
          }}
        />
      )}
      <DragHandle onDragStart={dragProps.onDragStart(item.id)} />
      {editing ? (
        <input
          autoFocus
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(item.text); setEditing(false); } }}
          style={{ flex: 1, minWidth: 0, fontSize: 13, padding: "2px 6px" }}
        />
      ) : (
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.55 : 1 }}>
          {item.text}
        </span>
      )}
      <IconButton title="Edit" onClick={() => setEditing((v) => !v)}>{editing ? "✓" : "✎"}</IconButton>
      <IconButton title="Remove" danger onClick={onRemove}>✕</IconButton>
    </div>
  );
}

function AddInline({ placeholder, onAdd, dashed, style }) {
  const [val, setVal] = useState("");
  return (
    <input
      className="input"
      placeholder={placeholder}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && val.trim()) { onAdd(val.trim()); setVal(""); }
      }}
      style={{ marginTop: "var(--space-2)", borderStyle: dashed ? "dashed" : "solid", ...style }}
    />
  );
}

/* ============================== Nav header ============================== */

function NavHeader({ userName, onImportClick }) {
  const today = new Date();
  const dateStr = `${DAY_NAMES_FULL[today.getDay() === 0 ? 6 : today.getDay() - 1]}, ${MONTH_NAMES[today.getMonth()]} ${today.getDate()}`;
  const hour = today.getHours();
  const greetWord = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const line = ASSISTANT_LINES[dayOfYear(today) % ASSISTANT_LINES.length];
  return (
    <div className="nav" style={{ padding: "0 0 var(--space-3)", alignItems: "flex-end", flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--color-accent-700)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 24, height: 1, background: "var(--color-accent-400)", display: "inline-block" }}></span>
          {dateStr}
        </div>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: "var(--font-heading-weight)", fontSize: 30, lineHeight: 1.15 }}>
          {greetWord}, {userName}
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 11, padding: "2px 0" }} onClick={onImportClick}>⇪ data</button>
      </div>
      <div className="assistant-line" style={{ marginLeft: "auto" }}>
        <span className="dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-accent-700)", display: "inline-block", flex: "none" }}></span>
        <span style={{ fontSize: 12, color: "var(--color-accent-800)", fontWeight: 600, fontStyle: "italic" }}>{line}</span>
      </div>
    </div>
  );
}

/* ============================== Import modal ============================== */

function DataModal({ state, setState, onClose }) {
  const [tab, setTab] = useState("schedule");

  return (
    <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" style={{ width: "min(640px,100%)" }}>
        <div className="dialog-title">Data</div>
        <div className="seg" style={{ alignSelf: "flex-start" }}>
          <button className={"seg-opt" + (tab === "schedule" ? " active" : "")} onClick={() => setTab("schedule")}>Import schedule</button>
          <button className={"seg-opt" + (tab === "export" ? " active" : "")} onClick={() => setTab("export")}>Export backup</button>
          <button className={"seg-opt" + (tab === "restore" ? " active" : "")} onClick={() => setTab("restore")}>Restore backup</button>
        </div>
        {tab === "schedule" && <ImportScheduleTab state={state} setState={setState} />}
        {tab === "export" && <ExportBackupTab state={state} />}
        {tab === "restore" && <RestoreBackupTab setState={setState} />}
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function ExportBackupTab({ state }) {
  function download() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `life-planner-backup-${toISODate(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="dialog-body">
        Downloads everything in this browser right now — courses, classes, assignments, gym setup and progress, habits,
        and to-dos — as one JSON file. Keep it somewhere safe (Drive, email to yourself, etc.) so you can restore it
        here or on another device later.
      </div>
      <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={download}>⇩ Download backup</button>
    </div>
  );
}

function RestoreBackupTab({ setState }) {
  const [text, setText] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  function onFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(reader.result);
    reader.readAsText(file);
  }

  function restore() {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      setError("That doesn't look like valid JSON — " + e.message);
      setMessage(null);
      return;
    }
    if (!data.courses || !data.events || !data.gym || !data.habits || !data.personal) {
      setError("This doesn't look like a life-planner backup file.");
      setMessage(null);
      return;
    }
    setError(null);
    setState(data);
    setMessage("Backup restored — this browser now matches the file.");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="dialog-body">
        Restoring <strong>replaces everything</strong> currently in this browser with what's in the backup file — use
        this to bring a saved backup onto a new device or browser.
      </div>
      <input type="file" accept="application/json" onChange={onFile} />
      <textarea
        className="input"
        style={{ minHeight: 140, fontFamily: "ui-monospace, monospace", fontSize: 12 }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Or paste backup JSON here"
      />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        I understand this replaces everything currently in this browser.
      </label>
      {error && <div style={{ color: TYPE_COLORS.deadline, fontSize: 12 }}>{error}</div>}
      {message && <div style={{ color: "var(--color-accent-700)", fontSize: 12 }}>{message}</div>}
      <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} disabled={!text.trim() || !confirmed} onClick={restore}>Restore backup</button>
    </div>
  );
}

function ImportScheduleTab({ state, setState }) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  function apply() {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      setError("That doesn't look like valid JSON — " + e.message);
      setMessage(null);
      return;
    }
    setError(null);

    const courses = state.courses.slice();
    const events = state.events.slice();
    let gym = state.gym;
    let addedCourses = 0, updatedCourses = 0, addedClasses = 0, addedRecurring = 0;
    const term = data.term || null;

    const codeToId = {};
    courses.forEach((c) => { codeToId[c.code] = c.id; });

    if (Array.isArray(data.courses)) {
      data.courses.forEach((c) => {
        if (!c.code) return;
        const existingIdx = courses.findIndex((x) => x.code === c.code);
        if (existingIdx >= 0) {
          courses[existingIdx] = {
            ...courses[existingIdx],
            name: c.name != null ? c.name : courses[existingIdx].name,
            room: c.room != null ? c.room : courses[existingIdx].room,
            color: c.color || courses[existingIdx].color,
          };
          codeToId[c.code] = courses[existingIdx].id;
          updatedCourses++;
        } else {
          const id = uid("c");
          const color = c.color || COURSE_PALETTE[courses.length % COURSE_PALETTE.length];
          courses.push({ id, code: c.code, name: c.name || "", room: c.room || "", color, todos: [] });
          codeToId[c.code] = id;
          addedCourses++;
        }
      });
    }

    function resolveDay(dayIdx) {
      if (typeof dayIdx === "string") {
        const idx = DAY_NAMES.findIndex((d) => d.toLowerCase() === dayIdx.slice(0, 3).toLowerCase());
        return idx >= 0 ? idx : 0;
      }
      return dayIdx;
    }

    if (Array.isArray(data.classes)) {
      const today = startOfDay(new Date());
      const termStart = term && term.start ? parseISODate(term.start) : today;
      const anchorMonday = startOfWeek(termStart);
      data.classes.forEach((cl) => {
        const courseId = codeToId[cl.courseCode];
        if (!courseId || cl.start == null || cl.end == null) return;
        const dayIdx = resolveDay(cl.day);
        const dup = events.some((e) => e.courseId === courseId && e.day === dayIdx && e.start === cl.start && e.type === "class");
        if (dup) return;
        const course = courses.find((c) => c.id === courseId);
        let occurDate = addDays(anchorMonday, dayIdx);
        if (occurDate < termStart) occurDate = addDays(occurDate, 7);
        events.push({
          id: uid("ev"), title: cl.title || (course ? course.code : "Class"), subtitle: cl.subtitle || "", courseId, type: "class",
          repeat: cl.repeat || "weekly", day: dayIdx, start: cl.start, end: cl.end,
          startDate: toISODate(occurDate),
          repeatUntil: term && term.end ? term.end : undefined,
          excludeRanges: term && term.exclude ? term.exclude : undefined,
        });
        addedClasses++;
      });
    }

    if (Array.isArray(data.recurring)) {
      data.recurring.forEach((r) => {
        if (r.start == null || r.end == null) return;
        const dayIdx = resolveDay(r.day);
        const dup = events.some((e) => !e.courseId && e.title === r.title && e.day === dayIdx && e.start === r.start);
        if (dup) return;
        const today = startOfDay(new Date());
        const monday = startOfWeek(today);
        events.push({
          id: uid("ev"), title: r.title || "Untitled", type: r.type || "meeting",
          repeat: r.repeat || "weekly", day: dayIdx, start: r.start, end: r.end,
          startDate: toISODate(addDays(monday, dayIdx)),
        });
        addedRecurring++;
      });
    }

    let gymUpdated = false;
    if (data.gym) {
      gym = {
        ...state.gym,
        days: data.gym.days || state.gym.days,
        lifts: data.gym.lifts
          ? Object.fromEntries(Object.entries(data.gym.lifts).map(([k, arr]) => [k, arr.map((l) => ({ id: uid("l"), name: l.name, subtitle: l.subtitle || "", reps: l.reps || "", done: false }))]))
          : state.gym.lifts,
      };
      gymUpdated = true;
    }

    setState((s) => ({ ...s, courses, events, gym }));
    setMessage(`Added ${addedCourses} course${addedCourses === 1 ? "" : "s"}, updated ${updatedCourses}, added ${addedClasses} class meeting${addedClasses === 1 ? "" : "s"}, added ${addedRecurring} recurring event${addedRecurring === 1 ? "" : "s"}${gymUpdated ? ", updated gym setup" : ""}.`);
    setText("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="dialog-body">
        Paste a JSON block with <code>term</code>, <code>courses</code>, <code>classes</code>, <code>recurring</code>,
        and/or a <code>gym</code> setup — it merges into what you already have, nothing gets erased.
      </div>
      <textarea
        className="input"
        style={{ minHeight: 220, fontFamily: "ui-monospace, monospace", fontSize: 12 }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='{"courses": [...], "classes": [...], "gym": {...}}'
      />
      {error && <div style={{ color: TYPE_COLORS.deadline, fontSize: 12 }}>{error}</div>}
      {message && <div style={{ color: "var(--color-accent-700)", fontSize: 12 }}>{message}</div>}
      <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={apply}>Import</button>
    </div>
  );
}

/* ============================== Calendar ============================== */

function isExcluded(date, excludeRanges) {
  if (!excludeRanges || !excludeRanges.length) return false;
  return excludeRanges.some(([s, e]) => date >= parseISODate(s) && date <= parseISODate(e));
}

function computeEventDate(ev, weekMonday) {
  // returns the Date this event occurs on for the given displayed week, or null
  const start = parseISODate(ev.startDate);
  const displayDate = addDays(weekMonday, ev.day);
  if (ev.repeat === "none") {
    return sameDate(start, displayDate) ? displayDate : null;
  }
  if (displayDate < startOfDay(start) && !sameDate(displayDate, start)) return null;
  if (ev.repeatUntil && displayDate > parseISODate(ev.repeatUntil)) return null;
  if (isExcluded(displayDate, ev.excludeRanges)) return null;
  if (ev.repeat === "weekly") {
    return displayDate.getDay() === start.getDay() ? displayDate : null;
  }
  if (ev.repeat === "biweekly") {
    if (displayDate.getDay() !== start.getDay()) return null;
    const wk = weeksBetween(displayDate, start);
    return wk % 2 === 0 ? displayDate : null;
  }
  if (ev.repeat === "monthly") {
    // occurs on same day-of-month as start, any month
    if (displayDate.getDate() === start.getDate()) return displayDate;
    return null;
  }
  return null;
}

function eventsForWeek(events, weekMonday) {
  const out = [];
  for (const ev of events) {
    const d = computeEventDate(ev, weekMonday);
    if (d) out.push({ ...ev, occursOn: d });
  }
  return out;
}

function nextOccurrenceOnOrAfter(ev, fromDate) {
  if (ev.repeat === "none") return parseISODate(ev.startDate);
  let wk = startOfWeek(fromDate);
  for (let i = 0; i < 104; i++) {
    const d = computeEventDate(ev, wk);
    if (d && d >= startOfDay(fromDate)) return d;
    wk = addDays(wk, 7);
  }
  return parseISODate(ev.startDate);
}

function gymLabelForDate(gym, dateISO, isPast, predictedDay) {
  if (gym.log[dateISO] != null) {
    const n = gym.log[dateISO];
    const day = gym.days.find((d) => d.id === n);
    return { n, label: day ? day.label : "", done: true };
  }
  if (isPast) return null;
  const day = gym.days.find((d) => d.id === predictedDay);
  return { n: predictedDay, label: day ? day.label : "", done: false };
}

function CalendarCard({ state, setState, page, setPage }) {
  const [view, setView] = useState("week");
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [form, setForm] = useState({ title: "", day: "0", start: "9", end: "10", type: "personal", repeat: "none", courseId: "" });

  const today = startOfDay(new Date());
  const weekMonday = startOfWeek(weekAnchor);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekMonday, i));
  const weekEvents = useMemo(() => eventsForWeek(state.events, weekMonday), [state.events, weekMonday]);
  const courseColorMap = useMemo(() => Object.fromEntries(state.courses.map((c) => [c.id, c.color])), [state.courses]);
  function eventColor(ev) { return (ev.courseId && courseColorMap[ev.courseId]) || TYPE_COLORS[ev.type]; }

  function submitEvent() {
    if (!form.title.trim()) return;
    const day = Number(form.day);
    const occurDate = addDays(weekMonday, day);
    const ev = {
      id: uid("ev"), title: form.title.trim(), day, start: Number(form.start), end: Number(form.end),
      type: form.type, repeat: form.repeat, startDate: toISODate(occurDate),
      courseId: (form.type === "deadline" || form.type === "class") && form.courseId ? form.courseId : undefined,
    };
    setState((s) => ({ ...s, events: [...s.events, ev] }));
    setForm({ title: "", day: "0", start: "9", end: "10", type: "personal", repeat: "none", courseId: "" });
  }

  function removeEvent(id) { setState((s) => ({ ...s, events: removeItem(s.events, id) })); }

  // predicted gym rotation across the displayed week, for undone-today/future dates
  let predPointer = state.gym.pointer;
  const gymCells = weekDates.map((d) => {
    const iso = toISODate(d);
    const isPast = d < today;
    if (state.gym.log[iso] == null && !isPast) {
      const cell = gymLabelForDate(state.gym, iso, isPast, predPointer);
      predPointer = (predPointer % 4) + 1;
      return cell;
    }
    return gymLabelForDate(state.gym, iso, isPast, predPointer);
  });

  const habitOverlayCols = weekDates.map((d) => {
    const iso = toISODate(d);
    return state.habits.map((h) => ({
      color: h.color,
      done: !!h.history[iso],
      future: d > today,
      name: h.name,
    }));
  });

  // month grid
  const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const monthGridStart = startOfWeek(monthStart);
  const daysInMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0).getDate();
  const weeksNeeded = Math.ceil((monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1 + daysInMonth) / 7);
  const monthCells = Array.from({ length: weeksNeeded * 7 }, (_, i) => addDays(monthGridStart, i));

  return (
    <div className="card elev-sm" style={{ padding: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, background: "linear-gradient(transparent 58%, var(--color-accent-200) 58%)", display: "inline-block", padding: "0 8px" }}>Calendar</h2>
          <span style={{ whiteSpace: "nowrap", fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--color-accent-700)", fontSize: 15, display: "inline-block", transform: "rotate(-1.5deg)" }}>the week, plotted.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {overlay && (
            <button className="tag tag-accent" style={{ border: "none", cursor: "pointer" }} onClick={() => setOverlay(false)}>
              Habit overlay on ✕
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => (view === "week" ? setWeekAnchor(addDays(weekMonday, -7)) : setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1)))}>‹</button>
          <button className="btn btn-ghost" onClick={() => { setWeekAnchor(new Date()); setMonthAnchor(new Date()); }}>today</button>
          <button className="btn btn-ghost" onClick={() => (view === "week" ? setWeekAnchor(addDays(weekMonday, 7)) : setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1)))}>›</button>
          <button className="btn btn-primary" onClick={() => setShowAdd((v) => !v)}>+ Add key date</button>
          <div className="seg">
            <button className={"seg-opt" + (view === "week" ? " active" : "")} onClick={() => setView("week")}>Week</button>
            <button className={"seg-opt" + (view === "month" ? " active" : "")} onClick={() => setView("month")}>Month</button>
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="fade-in-up" style={{ marginBottom: "var(--space-3)", padding: "var(--space-3)", border: "1px dashed var(--color-accent)", borderRadius: "var(--radius-md)", background: "var(--color-accent-100)" }}>
          <div className="add-event-row" style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="field" style={{ flex: 2, minWidth: 180 }}>
              <label>What's happening</label>
              <input className="input" placeholder="e.g. Ethics essay due" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="field" style={{ minWidth: 100 }}>
              <label>Day</label>
              <select className="input" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="field" style={{ minWidth: 100 }}>
              <label>Start</label>
              <select className="input" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })}>
                {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </select>
            </div>
            <div className="field" style={{ minWidth: 100 }}>
              <label>End</label>
              <select className="input" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })}>
                {HOURS.map((h) => <option key={h} value={h + 1}>{hourLabel(h + 1)}</option>)}
              </select>
            </div>
            <div className="field" style={{ minWidth: 130 }}>
              <label>Type (sets color)</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.keys(TYPE_LABELS).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="field" style={{ minWidth: 130 }}>
              <label>Repeat</label>
              <select className="input" value={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.value })}>
                <option value="none">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {(form.type === "deadline" || form.type === "class") && (
              <div className="field" style={{ minWidth: 150 }}>
                <label>Course (optional)</label>
                <select className="input" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                  <option value="">— none —</option>
                  {state.courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
                </select>
              </div>
            )}
            <button className="btn btn-primary" onClick={submitEvent}>Add to calendar</button>
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
          <div style={{ marginTop: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "1px dashed var(--color-accent)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--color-accent-800)", fontWeight: 700 }}>Saved dates &amp; meetings</div>
            {state.events.length === 0 && <div className="text-muted" style={{ fontSize: 12 }}>Nothing saved yet.</div>}
            {state.events.map((ev) => (
              <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: "var(--color-bg)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: eventColor(ev), flex: "none" }}></span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{ev.title}</span>
                <span className="text-muted" style={{ fontSize: 12 }}>{DAY_NAMES[ev.day]} · {hourLabel(ev.start)}</span>
                <button className="btn btn-ghost" style={{ padding: "3px 10px", fontSize: 12, color: "var(--color-accent-700)" }} onClick={() => removeEvent(ev.id)}>delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="fade-in-up" style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7,minmax(120px,1fr))", minWidth: 920 }}>
            <div></div>
            {weekDates.map((d, i) => (
              <div key={i} style={{ background: sameDate(d, today) ? "var(--color-accent-100)" : "transparent", padding: "6px 8px", textAlign: "center", borderBottom: "1px solid var(--color-divider)" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", opacity: 0.65 }}>{DAY_NAMES[i]}</div>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: "var(--font-heading-weight)", fontSize: 16 }}>{d.getDate()}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7,minmax(120px,1fr))", minWidth: 920, borderBottom: "1px solid var(--color-divider)" }}>
            <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: ".05em", opacity: 0.5, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>due</div>
            {weekDates.map((d, i) => {
              const iso = toISODate(d);
              const dues = weekEvents.filter((e) => e.type === "deadline" && sameDate(e.occursOn, d));
              return (
                <div key={i} style={{ padding: "3px 4px", display: "flex", flexDirection: "column", gap: 2, borderLeft: "1px solid var(--color-divider)", minHeight: 20 }}>
                  {dues.slice(0, 2).map((e) => (
                    <div key={e.id} style={{ fontSize: 8, lineHeight: 1.25, padding: "1px 4px", borderRadius: 3, borderLeft: `2px solid ${eventColor(e)}`, background: "color-mix(in srgb, " + eventColor(e) + " 18%, var(--color-bg))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                  ))}
                  {dues.length > 2 && <div style={{ fontSize: 8, opacity: 0.6, paddingLeft: 4 }}>+{dues.length - 2} more</div>}
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7,minmax(120px,1fr))", minWidth: 920, borderBottom: "1px solid var(--color-divider)" }}>
            <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: ".05em", opacity: 0.5, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>gym</div>
            {gymCells.map((gc, i) => (
              <div key={i} style={{ padding: "3px 4px", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid var(--color-divider)", minHeight: 20 }}>
                {gc && (
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".04em", padding: "1px 6px", borderRadius: 3, background: gc.done ? "var(--color-accent-2-600)" : "var(--color-accent-2-100)", color: gc.done ? "var(--color-bg)" : "var(--color-accent-2-800)", whiteSpace: "nowrap" }}>
                    D{gc.n} {gc.label}
                  </span>
                )}
              </div>
            ))}
          </div>
          {overlay && (
            <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7,minmax(120px,1fr))", minWidth: 920, borderBottom: "1px solid var(--color-divider)" }}>
              <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: ".05em", opacity: 0.5, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: "6px 6px 0 0" }}>habits</div>
              {habitOverlayCols.map((cols, i) => (
                <div key={i} style={{ borderLeft: "1px solid var(--color-divider)", padding: "6px 5px", display: "flex", flexDirection: "column", gap: 5, minHeight: 90 }}>
                  {cols.map((h, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, lineHeight: 1.15 }}>
                      <span style={{ width: 13, height: 13, flex: "none", borderRadius: "50%", border: `1.5px solid ${h.color}`, background: h.done ? h.color : "transparent", color: "var(--color-bg)", fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{h.done ? "✓" : ""}</span>
                      <span style={{ opacity: h.future ? 0.4 : 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {!overlay && (() => {
            const grid = (
              <div style={{ position: "relative", display: "grid", gridTemplateColumns: "56px repeat(7,minmax(120px,1fr))", gridTemplateRows: `repeat(${HOURS.length},34px)`, minWidth: 920, background: "var(--color-surface)" }}>
                {weekDates.map((d, i) => (
                  <div key={`bg-${i}`} style={{ gridColumn: i + 2, gridRow: "1 / -1", background: sameDate(d, today) ? "rgba(182,130,53,0.1)" : "var(--color-surface)" }}></div>
                ))}
                {HOURS.map((h, i) => (
                  <div key={`hline-${h}`} style={{ gridColumn: "1 / -1", gridRow: i + 1, borderTop: i === 0 ? "none" : "1px solid rgba(32,31,29,0.18)" }}></div>
                ))}
                {weekDates.map((d, i) => (
                  <div key={`vline-${i}`} style={{ gridColumn: i + 2, gridRow: "1 / -1", borderLeft: "1px solid rgba(32,31,29,0.18)" }}></div>
                ))}
                {HOURS.map((h, i) => (
                  <div key={h} style={{ gridColumn: 1, gridRow: i + 1, fontSize: 10, opacity: 0.6, padding: "2px 6px", textAlign: "right", position: "relative", zIndex: 2 }}>{hourLabel(h)}</div>
                ))}
                {weekEvents.filter((ev) => ev.type !== "deadline").map((ev) => {
                  const dayIdx = ev.occursOn.getDay() === 0 ? 6 : ev.occursOn.getDay() - 1;
                  const rowStart = Math.max(1, ev.start - HOURS[0] + 1);
                  const rowEnd = Math.max(rowStart + 1, ev.end - HOURS[0] + 1);
                  return (
                    <div key={ev.id} style={{ gridColumn: dayIdx + 2, gridRow: `${rowStart} / ${rowEnd}`, margin: "1px 3px", padding: "3px 6px", borderLeft: `3px solid ${eventColor(ev)}`, background: "color-mix(in srgb, " + eventColor(ev) + " 16%, var(--color-bg))", borderRadius: "var(--radius-sm)", position: "relative", zIndex: 1, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2 }}>{ev.title} {ev.repeat !== "none" && <span style={{ opacity: 0.75, fontWeight: 400 }}>↻</span>}</div>
                      {ev.subtitle && <div style={{ fontSize: 9, opacity: 0.75, lineHeight: 1.2 }}>{ev.subtitle}</div>}
                      {ev.type === "meeting" && <span style={{ display: "inline-block", marginTop: 1, fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", background: "var(--color-neutral-200)", color: "var(--color-neutral-700)", padding: "0 5px", borderRadius: 3, lineHeight: 1.6 }}>meeting</span>}
                      <div style={{ fontSize: 10, opacity: 0.7, lineHeight: 1.2 }}>{hourLabel(ev.start)}–{hourLabel(ev.end)}</div>
                    </div>
                  );
                })}
              </div>
            );
            return grid;
          })()}
        </div>
      )}

      {view === "month" && (
        <div className="fade-in-up">
          <div style={{ textAlign: "center", fontFamily: "var(--font-heading)", fontWeight: "var(--font-heading-weight)", fontSize: 18, marginBottom: 8 }}>
            {MONTH_NAMES[monthAnchor.getMonth()]} {monthAnchor.getFullYear()}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 1, background: "var(--color-divider)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            {DAY_NAMES.map((lbl) => (
              <div key={lbl} style={{ background: "var(--color-bg)", padding: 6, textAlign: "center", fontSize: 11, textTransform: "uppercase", opacity: 0.65, minWidth: 0 }}>{lbl}</div>
            ))}
            {monthCells.map((d, i) => {
              const inMonth = d.getMonth() === monthAnchor.getMonth();
              const wkMon = startOfWeek(d);
              const dEvents = eventsForWeek(state.events, wkMon).filter((e) => sameDate(e.occursOn, d));
              const iso = toISODate(d);
              return (
                <div key={i} style={{ background: sameDate(d, today) ? "var(--color-accent-100)" : "var(--color-bg)", minHeight: 92, minWidth: 0, padding: 6, display: "flex", flexDirection: "column", gap: 3, opacity: inMonth ? 1 : 0.4 }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: "var(--font-heading-weight)", fontSize: 13 }}>{d.getDate()}</div>
                  {!overlay && dEvents.slice(0, 3).map((ev) => (
                    <div key={ev.id} style={{ fontSize: 9, lineHeight: 1.25, padding: "2px 5px", borderLeft: `3px solid ${eventColor(ev)}`, background: "color-mix(in srgb, " + eventColor(ev) + " 14%, var(--color-bg))", borderRadius: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {hourLabel(ev.start)} {ev.title}
                    </div>
                  ))}
                  {overlay && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
                      {state.habits.map((h) => (
                        <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, lineHeight: 1.15 }}>
                          <span style={{ width: 12, height: 12, flex: "none", borderRadius: "50%", border: `1.5px solid ${h.color}`, background: h.history[iso] ? h.color : "transparent" }}></span>
                          <span style={{ opacity: d > today ? 0.4 : 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setOverlay((v) => !v)}>{overlay ? "Hide habit overlay" : "Show habit overlay"}</button>
      </div>
    </div>
  );
}

/* ============================== Home dashboard ============================== */

function HomeDashboard({ state, setState, setPage }) {
  const today = startOfDay(new Date());
  const gymDay = state.gym.days.find((d) => d.id === state.gym.pointer);
  const schoolTaskCount = state.courses.reduce((n, c) => n + c.todos.filter((t) => !t.done).length, 0);
  const openHabits = state.habits.filter((h) => !h.history[toISODate(today)]).length;
  const personalOpen = state.personal.utfr.filter((t) => !t.done).length + state.personal.general.filter((t) => !t.done).length;

  return (
    <React.Fragment>
      <CalendarCard state={state} setState={setState} />
      <div className="nav-cards">
        <button className="nav-card" style={{ borderColor: "var(--color-accent-2-400)", background: "var(--color-accent-2-100)" }} onClick={() => setPage("gym")}>
          <span className="badge" style={{ background: "var(--color-accent-2-500)", transform: "translateX(-50%) rotate(-2deg)" }}>Day {gymDay ? gymDay.id : 1} · {gymDay ? gymDay.label : ""}</span>
          <div className="title" style={{ textDecorationColor: "var(--color-accent-2-500)" }}>Gym</div>
          <div className="tagline" style={{ color: "var(--color-accent-2-800)" }}>actuators at full power.</div>
        </button>
        <button className="nav-card" style={{ borderColor: "var(--color-accent-400)", background: "var(--color-accent-100)" }} onClick={() => setPage("school")}>
          <span className="badge" style={{ background: "var(--color-accent-500)", transform: "translateX(-50%) rotate(2deg)" }}>{schoolTaskCount} tasks</span>
          <div className="title" style={{ textDecorationColor: "var(--color-accent-500)" }}>School</div>
          <div className="tagline" style={{ color: "var(--color-accent-800)" }}>five inputs, one processor.</div>
        </button>
        <button className="nav-card" style={{ borderColor: "var(--color-neutral-400)", background: "var(--color-neutral-100)" }} onClick={() => setPage("habits")}>
          <span className="badge" style={{ background: "var(--color-neutral-600)", transform: "translateX(-50%) rotate(-2deg)" }}>{openHabits} left today</span>
          <div className="title" style={{ textDecorationColor: "var(--color-accent-600)" }}>Habits</div>
          <div className="tagline" style={{ color: "var(--color-neutral-700)" }}>daily subroutines engaged.</div>
        </button>
        <button className="nav-card" style={{ borderColor: "var(--color-accent-2-400)", background: "var(--color-accent-2-100)" }} onClick={() => setPage("personal")}>
          <span className="badge" style={{ background: "var(--color-accent-2-500)", transform: "translateX(-50%) rotate(2deg)" }}>{personalOpen} open</span>
          <div className="title" style={{ textDecorationColor: "var(--color-accent-2-500)" }}>Personal</div>
          <div className="tagline" style={{ color: "var(--color-accent-2-800)" }}>auxiliary tasks queued.</div>
        </button>
      </div>
    </React.Fragment>
  );
}

/* ============================== Gym page ============================== */

function LiftRow({ lift, onUpdate, onToggle, onRemove, dragProps }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(lift.name);
  useEffect(() => { setName(lift.name); }, [lift.name]);

  function commitName() {
    if (name.trim()) onUpdate({ name: name.trim() });
    setEditing(false);
  }

  return (
    <div className="row-item" onDragOver={dragProps.onDragOver()} onDrop={dragProps.onDrop(lift.id)}>
      <button key={lift.done} onClick={onToggle} className="check-circle pop-in" style={{ background: lift.done ? "var(--color-accent)" : "transparent" }}>{lift.done ? "✓" : ""}</button>
      <DragHandle onDragStart={dragProps.onDragStart(lift.id)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)}
            onBlur={commitName} onKeyDown={(e) => { if (e.key === "Enter") commitName(); }}
            style={{ fontSize: 14, fontWeight: 600, padding: "3px 8px" }}
          />
        ) : (
          <div style={{ fontSize: 14, fontWeight: 600, textDecoration: lift.done ? "line-through" : "none", opacity: lift.done ? 0.6 : 1 }}>{lift.name}</div>
        )}
        <input
          value={lift.subtitle} onChange={(e) => onUpdate({ subtitle: e.target.value })} placeholder="add a note…"
          style={{ display: "block", width: "100%", fontSize: 11, color: "var(--color-neutral-700)", background: "transparent", border: "none", borderBottom: "1px dashed transparent", padding: "1px 0", fontFamily: "var(--font-body)" }}
        />
      </div>
      <input
        value={lift.reps} onChange={(e) => onUpdate({ reps: e.target.value })}
        style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent-800)", background: "var(--color-accent-100)", border: "1px solid var(--color-accent-300)", padding: "4px 10px", borderRadius: 999, width: 88, textAlign: "center", flex: "none" }}
      />
      <IconButton title="Edit name" onClick={() => setEditing((v) => !v)}>{editing ? "✓" : "✎"}</IconButton>
      <IconButton title="Remove" danger onClick={onRemove}>✕</IconButton>
    </div>
  );
}

function GymDayPanel({ day, lifts, onUpdateLifts, gymLog, gymPointer, onSetHabitDone }) {
  const today = toISODate(startOfDay(new Date()));
  const doneCount = lifts.filter((l) => l.done).length;
  const habitDoneToday = gymLog[today] === day.id;
  const drag = useDragReorder((from, to) => onUpdateLifts(reorderArray(lifts, from, to)));

  function patchLift(id, patch) { onUpdateLifts(updateItem(lifts, id, patch)); }
  function removeLift(id) { onUpdateLifts(removeItem(lifts, id)); }
  function addLift(name) { onUpdateLifts([...lifts, { id: uid("l"), name, subtitle: "", reps: "3×10", done: false }]); }

  return (
    <div className="fade-in-up" style={{ padding: "var(--space-3) 0 0", borderTop: "1px dashed var(--color-divider)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
        <span className="tag tag-accent" style={{ fontSize: 13, padding: "6px 14px", fontWeight: 700 }}>DAY {day.id}</span>
        <div className="card-title" style={{ fontSize: 19, margin: 0 }}>{day.label}</div>
        <span style={{ marginLeft: "auto", transform: "rotate(-2deg)", background: "var(--color-accent-2-200)", color: "var(--color-accent-2-800)", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999 }}>{doneCount}/{lifts.length} done</span>
      </div>
      {lifts.map((l) => (
        <LiftRow key={l.id} lift={l} onUpdate={(p) => patchLift(l.id, p)} onToggle={() => patchLift(l.id, { done: !l.done })} onRemove={() => removeLift(l.id)} dragProps={drag} />
      ))}
      <AddInline placeholder="+ add a movement, press Enter" onAdd={addLift} />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: "var(--space-3)" }}>
        <input type="checkbox" checked={habitDoneToday} onChange={(e) => onSetHabitDone(day.id, e.target.checked)} /> Mark today's gym habit done
      </label>
    </div>
  );
}

function GymPage({ state, setState, setPage }) {
  const [expanded, setExpanded] = useState({});
  const today = startOfDay(new Date());
  const weekMonday = startOfWeek(today);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekMonday, i));

  let predPointer = state.gym.pointer;
  const gymWeek = weekDates.map((d) => {
    const iso = toISODate(d);
    const isPast = d < today;
    let cell;
    if (state.gym.log[iso] != null) {
      const n = state.gym.log[iso];
      cell = { n, label: state.gym.days.find((x) => x.id === n).label, done: true };
    } else if (isPast) {
      cell = null;
    } else {
      const n = predPointer;
      cell = { n, label: state.gym.days.find((x) => x.id === n).label, done: false };
      predPointer = (predPointer % 4) + 1;
    }
    return { date: d, cell };
  });

  function setHabitDone(dayId, checked) {
    const iso = toISODate(today);
    setState((s) => {
      const log = { ...s.gym.log };
      let pointer = s.gym.pointer;
      if (checked) {
        log[iso] = dayId;
        pointer = (dayId % 4) + 1;
      } else {
        delete log[iso];
        pointer = dayId;
      }
      return { ...s, gym: { ...s.gym, log, pointer } };
    });
  }

  function updateLifts(dayId, newLifts) {
    setState((s) => ({ ...s, gym: { ...s.gym, lifts: { ...s.gym.lifts, [dayId]: newLifts } } }));
  }

  return (
    <React.Fragment>
      <button className="back-btn" onClick={() => setPage("home")}>← back to today</button>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "var(--space-2)" }}>
          <div>
            <div style={{ whiteSpace: "nowrap", fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--color-accent-2-700)", fontSize: 19, transform: "rotate(-1.5deg)" }}>begin systems check.</div>
            <h2 style={{ margin: 0, background: "linear-gradient(transparent 58%, var(--color-accent-2-200) 58%)", display: "inline-block", padding: "0 10px" }}>Gym</h2>
          </div>
        </div>
        <div className="card elev-sm">
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", opacity: 0.6 }}>This week's rotation</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 6, marginBottom: "var(--space-4)" }}>
            {gymWeek.map((gw, i) => (
              <div key={i} style={{ minWidth: 0, textAlign: "center", padding: "8px 4px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-divider)", background: sameDate(gw.date, today) ? "var(--color-accent-2-100)" : "transparent" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em", opacity: 0.6 }}>{DAY_NAMES[i]}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: gw.cell ? (gw.cell.done ? "var(--color-accent-2-700)" : "var(--color-neutral-600)") : "var(--color-neutral-400)", marginTop: 4 }}>{gw.cell ? `D${gw.cell.n}` : "rest"}</div>
                <div style={{ fontSize: 10, opacity: 0.75 }}>{gw.cell ? gw.cell.label : ""}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-2)" }}>
            <span style={{ whiteSpace: "nowrap", alignSelf: "center", display: "inline-block", transform: "rotate(-3deg)", background: "var(--color-accent-2-200)", color: "var(--color-accent-2-800)", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: "var(--radius-sm)", letterSpacing: ".05em", textTransform: "uppercase" }}>pick your day →</span>
            {state.gym.days.map((d) => (
              <button key={d.id} className={"btn " + (expanded[d.id] ? "btn-primary" : "btn-secondary")} onClick={() => setExpanded((e) => ({ ...e, [d.id]: !e[d.id] }))}>
                Day {d.id} · {d.label}
              </button>
            ))}
          </div>
          <div className="text-muted" style={{ fontSize: 12, marginBottom: "var(--space-2)" }}>
            Days 1 → 4 cycle straight through the week. Skip a day (uncheck the gym habit) and it becomes a rest day — the cycle picks up on the next day.
          </div>
          {state.gym.days.map((d) => expanded[d.id] && (
            <GymDayPanel key={d.id} day={d} lifts={state.gym.lifts[d.id]} onUpdateLifts={(l) => updateLifts(d.id, l)} gymLog={state.gym.log} gymPointer={state.gym.pointer} onSetHabitDone={setHabitDone} />
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============================== School page ============================== */

function CourseCard({ course, assignments, totalAssignmentCount, onUpdate, onRemove, onAddAssignment, onRemoveAssignment, onAddRecurring }) {
  const drag = useDragReorder((from, to) => onUpdate({ todos: reorderArray(course.todos, from, to) }));
  const [editingHeader, setEditingHeader] = useState(false);
  const [code, setCode] = useState(course.code);
  const [name, setName] = useState(course.name);
  const [room, setRoom] = useState(course.room || "");
  useEffect(() => { setCode(course.code); setName(course.name); setRoom(course.room || ""); }, [course.code, course.name, course.room]);

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(toISODate(new Date()));
  const [showRecurring, setShowRecurring] = useState(false);
  const [recur, setRecur] = useState({ title: "", start: toISODate(new Date()), freq: "weekly", count: 12, numbered: true });

  function commitHeader() {
    onUpdate({ code: code.trim() || course.code, name: name.trim(), room: room.trim() });
    setEditingHeader(false);
  }

  function submitAssignment() {
    if (!newTitle.trim()) return;
    onAddAssignment(newTitle.trim(), newDate);
    setNewTitle("");
  }

  function submitRecurring() {
    if (!recur.title.trim()) return;
    onAddRecurring({ title: recur.title.trim(), start: recur.start, freq: recur.freq, count: Number(recur.count) || 1, numbered: recur.numbered });
    setRecur({ ...recur, title: "" });
    setShowRecurring(false);
  }

  function addTodo(text) { onUpdate({ todos: [...course.todos, { id: uid("t"), text, done: false }] }); }
  function patchTodo(id, patch) { onUpdate({ todos: updateItem(course.todos, id, patch) }); }
  function removeTodo(id) { onUpdate({ todos: removeItem(course.todos, id) }); }

  return (
    <div className="card elev-sm" style={{ borderTop: `4px solid ${course.color}`, position: "relative" }}>
      <IconButton title="Remove course" danger onClick={onRemove} >✕</IconButton>
      {editingHeader ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 }}>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" style={{ fontWeight: 700 }} />
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Course name (optional)" />
          <input className="input" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Room location (optional)" onKeyDown={(e) => { if (e.key === "Enter") commitHeader(); }} />
          <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={commitHeader}>Save</button>
        </div>
      ) : (
        <div onClick={() => setEditingHeader(true)} style={{ cursor: "text" }} title="Click to edit">
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: "var(--font-heading-weight)", fontSize: 28, lineHeight: 1, color: course.color }}>{course.code}</div>
          {course.name && <div style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontSize: 16, color: "var(--color-neutral-700)", marginTop: 2 }}>{course.name}</div>}
          {course.room && <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>📍 {course.room}</div>}
        </div>
      )}
      <div className="hr" style={{ margin: "var(--space-2) 0" }}></div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", opacity: 0.6 }}>Upcoming</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {assignments.length === 0 && <div className="text-muted" style={{ fontSize: 12 }}>Nothing scheduled.</div>}
        {assignments.map((a) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "7px 10px", background: "var(--color-surface)", borderRadius: "var(--radius-md)" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</span>
            <span className="tag" style={{ background: "color-mix(in srgb, " + course.color + " 20%, var(--color-bg))", color: course.color }}>{a.dueLabel}</span>
            <IconButton title="Remove" danger onClick={() => onRemoveAssignment(a.id)}>✕</IconButton>
          </div>
        ))}
        {totalAssignmentCount > assignments.length && (
          <div className="text-muted" style={{ fontSize: 11 }}>+{totalAssignmentCount - assignments.length} more scheduled</div>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
        <input className="input" placeholder="Assignment title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitAssignment(); }} style={{ flex: 2, minWidth: 120 }} />
        <input type="date" className="input" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ flex: 1, minWidth: 130 }} />
        <button className="btn btn-ghost" onClick={submitAssignment}>Add</button>
      </div>
      <button className="btn btn-ghost" style={{ fontSize: 11, marginTop: 4, alignSelf: "flex-start" }} onClick={() => setShowRecurring((v) => !v)}>
        {showRecurring ? "cancel" : "+ generate recurring assignments"}
      </button>
      {showRecurring && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4, padding: 8, border: "1px dashed var(--color-divider)", borderRadius: "var(--radius-md)" }}>
          <input className="input" placeholder="e.g. Homework" value={recur.title} onChange={(e) => setRecur({ ...recur, title: e.target.value })} style={{ flex: 2, minWidth: 100 }} />
          <input type="date" className="input" value={recur.start} onChange={(e) => setRecur({ ...recur, start: e.target.value })} style={{ minWidth: 130 }} />
          <select className="input" value={recur.freq} onChange={(e) => setRecur({ ...recur, freq: e.target.value })} style={{ minWidth: 110 }}>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every 2 weeks</option>
          </select>
          <input type="number" min="1" max="60" className="input" title="How many occurrences" value={recur.count} onChange={(e) => setRecur({ ...recur, count: e.target.value })} style={{ width: 64 }} />
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <input type="checkbox" checked={recur.numbered} onChange={(e) => setRecur({ ...recur, numbered: e.target.checked })} /> number them
          </label>
          <button className="btn btn-primary" onClick={submitRecurring}>Generate</button>
        </div>
      )}
      <div className="hr" style={{ margin: "var(--space-2) 0" }}></div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", opacity: 0.6 }}>To-do</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {course.todos.map((t) => (
          <TodoRow key={t.id} item={t} onToggle={() => patchTodo(t.id, { done: !t.done })} onRemove={() => removeTodo(t.id)} onUpdate={(p) => patchTodo(t.id, p)} dragProps={drag} />
        ))}
      </div>
      <AddInline placeholder="+ add task, press Enter" onAdd={addTodo} />
    </div>
  );
}

function SchoolPage({ state, setState, setPage }) {
  const today = startOfDay(new Date());

  function updateCourse(id, patch) {
    setState((s) => ({ ...s, courses: updateItem(s.courses, id, patch) }));
  }
  function removeCourse(id) {
    setState((s) => ({ ...s, courses: removeItem(s.courses, id), events: s.events.filter((e) => e.courseId !== id) }));
  }
  function addCourse() {
    const color = COURSE_PALETTE[state.courses.length % COURSE_PALETTE.length];
    setState((s) => ({ ...s, courses: [...s.courses, { id: uid("c"), code: "NEW101", name: "New course", room: "", color, todos: [] }] }));
  }
  function addAssignment(courseId, title, dateISO) {
    const d = parseISODate(dateISO);
    const ev = { id: uid("ev"), title, courseId, type: "deadline", repeat: "none", startDate: dateISO, day: weekdayIndex(d), start: 17, end: 18 };
    setState((s) => ({ ...s, events: [...s.events, ev] }));
  }
  function removeAssignment(id) {
    setState((s) => ({ ...s, events: removeItem(s.events, id) }));
  }
  function addRecurring(courseId, { title, start, freq, count, numbered }) {
    const startD = parseISODate(start);
    const step = freq === "biweekly" ? 14 : 7;
    const n = Math.max(1, Math.min(count, 60));
    const newEvents = Array.from({ length: n }, (_, i) => {
      const d = addDays(startD, i * step);
      return {
        id: uid("ev"), title: numbered ? `${title} ${i + 1}` : title, courseId, type: "deadline", repeat: "none",
        startDate: toISODate(d), day: weekdayIndex(d), start: 17, end: 18,
      };
    });
    setState((s) => ({ ...s, events: [...s.events, ...newEvents] }));
  }

  return (
    <React.Fragment>
      <button className="back-btn" onClick={() => setPage("home")}>← back to today</button>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "var(--space-2)" }}>
          <div>
            <div style={{ whiteSpace: "nowrap", fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--color-accent-700)", fontSize: 19, transform: "rotate(-1.5deg)" }}>knowledge intake: optimal.</div>
            <h2 style={{ margin: 0, background: "linear-gradient(transparent 58%, var(--color-accent-200) 58%)", display: "inline-block", padding: "0 10px" }}>School</h2>
          </div>
          <button className="btn btn-ghost" style={{ marginLeft: "auto" }} onClick={addCourse}>+ add course</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "var(--space-4)" }}>
          {state.courses.map((c) => {
            const linked = state.events
              .filter((e) => e.courseId === c.id && e.type === "deadline")
              .map((e) => ({ ...e, occursOn: nextOccurrenceOnOrAfter(e, today) }))
              .filter((e) => e.occursOn >= today)
              .sort((a, b) => a.occursOn - b.occursOn);
            const assignments = linked.slice(0, 5).map((e) => ({ id: e.id, title: e.title, dueLabel: formatDateLabel(e.occursOn) }));
            return (
              <CourseCard
                key={c.id}
                course={c}
                assignments={assignments}
                totalAssignmentCount={linked.length}
                onUpdate={(p) => updateCourse(c.id, p)}
                onRemove={() => removeCourse(c.id)}
                onAddAssignment={(title, dateISO) => addAssignment(c.id, title, dateISO)}
                onRemoveAssignment={removeAssignment}
                onAddRecurring={(params) => addRecurring(c.id, params)}
              />
            );
          })}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============================== Habits page ============================== */

function computeStreak(history) {
  let streak = 0;
  let d = startOfDay(new Date());
  if (!history[toISODate(d)]) d = addDays(d, -1);
  while (history[toISODate(d)]) { streak += 1; d = addDays(d, -1); }
  return streak;
}

function HabitRow({ habit, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(habit.name);
  useEffect(() => { setName(habit.name); }, [habit.name]);
  const today = toISODate(startOfDay(new Date()));
  const doneToday = !!habit.history[today];
  const streak = computeStreak(habit.history);

  function commit() { if (name.trim()) onUpdate({ name: name.trim() }); setEditing(false); }
  function toggleToday() {
    const history = { ...habit.history };
    if (doneToday) delete history[today]; else history[today] = true;
    onUpdate({ history });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "var(--space-4)", background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderLeft: `5px solid ${habit.color}`, borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" }}>
      <button key={doneToday} onClick={toggleToday} title="Mark done today" className="pop-in" style={{ width: 40, height: 40, flex: "none", borderRadius: "50%", border: `2px solid ${habit.color}`, background: doneToday ? habit.color : "transparent", color: "var(--color-bg)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>{doneToday ? "✓" : ""}</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); }} style={{ fontSize: 19 }} />
        ) : (
          <div style={{ fontSize: 19, fontWeight: 600 }}>{habit.name}</div>
        )}
      </div>
      <span className={streak > 0 ? "streak-pulse" : ""} style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontWeight: "var(--font-heading-weight)", color: "var(--color-accent-700)", fontSize: 20, whiteSpace: "nowrap", transform: "rotate(-2deg)", display: "inline-block" }}>
        {streak > 0 ? `${streak} day streak` : "start today"}
      </span>
      <IconButton title="Edit" onClick={() => setEditing((v) => !v)}>{editing ? "✓" : "✎"}</IconButton>
      <IconButton title="Remove" danger onClick={onRemove}>✕</IconButton>
    </div>
  );
}

function HabitsPage({ state, setState, setPage }) {
  const today = startOfDay(new Date());
  const weekMonday = startOfWeek(today);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekMonday, i));
  const todayISO = toISODate(today);

  const doneToday = state.habits.filter((h) => h.history[todayISO]).length;
  const total = state.habits.length || 1;
  const pct = Math.round((doneToday / total) * 100);
  const headline = pct === 100 ? "everything's checked off." : pct === 0 ? "let's get started." : "making progress.";

  function updateHabit(id, patch) { setState((s) => ({ ...s, habits: updateItem(s.habits, id, patch) })); }
  function removeHabit(id) { setState((s) => ({ ...s, habits: removeItem(s.habits, id) })); }
  function addHabit(name) {
    const color = HABIT_PALETTE[state.habits.length % HABIT_PALETTE.length];
    setState((s) => ({ ...s, habits: [...s.habits, { id: uid("h"), name, color, history: {} }] }));
  }
  function toggleHabitDate(habitId, iso) {
    setState((s) => ({
      ...s,
      habits: updateItem(s.habits, habitId, (h) => {
        const history = { ...h.history };
        if (history[iso]) delete history[iso]; else history[iso] = true;
        return { history };
      }),
    }));
  }

  return (
    <React.Fragment>
      <button className="back-btn" onClick={() => setPage("home")}>← back to today</button>
      <div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: "var(--space-3)" }}>
          <div>
            <div style={{ whiteSpace: "nowrap", fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--color-accent-700)", fontSize: 20, transform: "rotate(-1.5deg)" }}>routine maintenance, daily.</div>
            <h2 style={{ margin: 0, background: "linear-gradient(transparent 58%, var(--color-accent-200) 58%)", display: "inline-block", padding: "0 10px" }}>Habits</h2>
          </div>
        </div>

        <div className="card elev-md" style={{ padding: "var(--space-5) var(--space-6)", background: "var(--color-accent-2-100)", border: "1.5px solid var(--color-accent-2-400)", borderRadius: "var(--radius-lg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)", flexWrap: "wrap" }}>
            <div style={{ flex: "none", transform: "rotate(-3deg)", background: "var(--color-surface)", border: "2px solid var(--color-accent-2-600)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-md)", padding: "12px 18px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: "var(--font-heading-weight)", fontSize: 34, lineHeight: 1, color: "var(--color-accent-2-800)" }}>{pct}%</div>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".16em", color: "var(--color-accent-2-700)", marginTop: 4 }}>today</div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--color-accent-2-800)", fontSize: 16 }}>{headline}</div>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: "var(--font-heading-weight)", fontSize: 30, lineHeight: 1.1 }}>{doneToday} of {state.habits.length} done</div>
              <div style={{ height: 16, borderRadius: 999, background: "repeating-linear-gradient(-45deg, var(--color-accent-2-100) 0 8px, var(--color-surface) 8px 16px)", border: "1px solid var(--color-accent-2-300)", overflow: "hidden", marginTop: 12, boxShadow: "inset 0 1px 3px rgba(0,0,0,.1)" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "repeating-linear-gradient(-45deg, var(--color-accent-2-600) 0 8px, var(--color-accent-2-500) 8px 16px)", borderRadius: 999, transition: "width .5s cubic-bezier(.22,1,.36,1)" }}></div>
              </div>
            </div>
          </div>
          <AddInline placeholder="+ add a habit, press Enter" onAdd={addHabit} dashed style={{ background: "var(--color-surface)" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
          {state.habits.map((h) => (
            <HabitRow key={h.id} habit={h} onUpdate={(p) => updateHabit(h.id, p)} onRemove={() => removeHabit(h.id)} />
          ))}
        </div>

        <div className="card elev-sm" style={{ marginTop: "var(--space-4)", overflowX: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--space-3)" }}>
            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", opacity: 0.6 }}>This week at a glance</span>
            <span style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--color-accent-700)", fontSize: 14, transform: "rotate(-1.5deg)" }}>tap a day to fill it in</span>
          </div>
          <div style={{ minWidth: 540 }}>
            <div style={{ display: "grid", gridTemplateColumns: "160px repeat(7,1fr)", alignItems: "end", gap: 4, marginBottom: 4 }}>
              <div></div>
              {weekDates.map((d, i) => (
                <div key={i} style={{ textAlign: "center", padding: "3px 2px", borderRadius: "var(--radius-sm)", background: sameDate(d, today) ? "var(--color-accent-100)" : "transparent" }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em", opacity: 0.6 }}>{DAY_NAMES[i]}</div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: "var(--font-heading-weight)", fontSize: 14 }}>{d.getDate()}</div>
                </div>
              ))}
            </div>
            {state.habits.map((h) => {
              const doneInWeek = weekDates.filter((d) => h.history[toISODate(d)]).length;
              const weekPct = Math.round((doneInWeek / 7) * 100);
              return (
                <div key={h.id} style={{ display: "grid", gridTemplateColumns: "160px repeat(7,1fr)", alignItems: "center", gap: 4, padding: "6px 0", borderTop: "1px solid var(--color-divider)" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: h.color, flex: "none" }}></span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                      <span style={{ fontSize: 10, opacity: 0.55, flex: "none" }}>{doneInWeek}/7</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 999, background: "var(--color-neutral-200)", overflow: "hidden", marginTop: 3 }}>
                      <div style={{ height: "100%", width: `${weekPct}%`, background: h.color, borderRadius: 999 }}></div>
                    </div>
                  </div>
                  {weekDates.map((d, i) => {
                    const iso = toISODate(d);
                    const done = !!h.history[iso];
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "center" }}>
                        <button
                          title={`${DAY_NAMES[i]} ${d.getDate()}`}
                          onClick={() => toggleHabitDate(h.id, iso)}
                          style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${h.color}`, background: done ? h.color : "transparent", boxShadow: sameDate(d, today) ? "0 0 0 2px var(--color-accent-200)" : "none", cursor: "pointer", padding: 0 }}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============================== Personal page ============================== */

function PersonalList({ title, subtitle, items, onAdd, onUpdateItem, onRemoveItem, onReorder, onUpdateMeta, color, badgeRotate }) {
  const drag = useDragReorder(onReorder);
  const [editingHeader, setEditingHeader] = useState(false);
  const [t, setT] = useState(title);
  const [s, setS] = useState(subtitle);
  useEffect(() => { setT(title); setS(subtitle); }, [title, subtitle]);

  function commitHeader() { onUpdateMeta({ title: t.trim() || title, subtitle: s.trim() }); setEditingHeader(false); }

  return (
    <div className="card elev-sm" style={{ borderTop: `4px solid ${color}`, position: "relative" }}>
      {editingHeader ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input className="input" value={t} onChange={(e) => setT(e.target.value)} style={{ fontWeight: 700 }} />
          <input className="input" value={s} onChange={(e) => setS(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") commitHeader(); }} />
          <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={commitHeader}>Save</button>
        </div>
      ) : (
        <div onClick={() => setEditingHeader(true)} style={{ cursor: "text" }} title="Click to edit">
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: "var(--font-heading-weight)", fontSize: 28, lineHeight: 1, color }}>{title}</div>
          <div style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontSize: 15, color: "var(--color-neutral-700)", marginTop: 2 }}>{subtitle}</div>
        </div>
      )}
      <div className="hr"></div>
      {items.map((it) => (
        <TodoRow key={it.id} item={it} checkboxStyle onToggle={() => onUpdateItem(it.id, { done: !it.done })} onRemove={() => onRemoveItem(it.id)} onUpdate={(p) => onUpdateItem(it.id, p)} dragProps={drag} />
      ))}
      <AddInline placeholder="+ add task" onAdd={onAdd} />
    </div>
  );
}

function PersonalPage({ state, setState, setPage }) {
  function patch(fn) { setState((s) => ({ ...s, personal: fn({ ...s.personal }) })); }

  return (
    <React.Fragment>
      <button className="back-btn" onClick={() => setPage("home")}>← back to today</button>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "var(--space-2)" }}>
          <div>
            <div style={{ whiteSpace: "nowrap", fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--color-accent-2-700)", fontSize: 19, transform: "rotate(-1.5deg)" }}>auxiliary systems.</div>
            <h2 style={{ margin: 0, background: "linear-gradient(transparent 58%, var(--color-accent-2-200) 58%)", display: "inline-block", padding: "0 10px" }}>Personal</h2>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "var(--space-4)" }}>
          <PersonalList
            title={state.personal.utfrTitle} subtitle={state.personal.utfrSubtitle} items={state.personal.utfr} color="var(--color-accent-2-700)"
            onAdd={(text) => patch((p) => ({ ...p, utfr: [...p.utfr, { id: uid("t"), text, done: false }] }))}
            onUpdateItem={(id, pt) => patch((p) => ({ ...p, utfr: updateItem(p.utfr, id, pt) }))}
            onRemoveItem={(id) => patch((p) => ({ ...p, utfr: removeItem(p.utfr, id) }))}
            onReorder={(from, to) => patch((p) => ({ ...p, utfr: reorderArray(p.utfr, from, to) }))}
            onUpdateMeta={({ title, subtitle }) => patch((p) => ({ ...p, utfrTitle: title, utfrSubtitle: subtitle }))}
          />
          <PersonalList
            title={state.personal.generalTitle} subtitle={state.personal.generalSubtitle} items={state.personal.general} color="var(--color-accent-700)"
            onAdd={(text) => patch((p) => ({ ...p, general: [...p.general, { id: uid("t"), text, done: false }] }))}
            onUpdateItem={(id, pt) => patch((p) => ({ ...p, general: updateItem(p.general, id, pt) }))}
            onRemoveItem={(id) => patch((p) => ({ ...p, general: removeItem(p.general, id) }))}
            onReorder={(from, to) => patch((p) => ({ ...p, general: reorderArray(p.general, from, to) }))}
            onUpdateMeta={({ title, subtitle }) => patch((p) => ({ ...p, generalTitle: title, generalSubtitle: subtitle }))}
          />
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============================== App ============================== */

function App() {
  const [state, setState] = useState(loadState);
  const [page, setPage] = useState("home");
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  let content;
  if (page === "gym") content = <GymPage state={state} setState={setState} setPage={setPage} />;
  else if (page === "school") content = <SchoolPage state={state} setState={setState} setPage={setPage} />;
  else if (page === "habits") content = <HabitsPage state={state} setState={setState} setPage={setPage} />;
  else if (page === "personal") content = <PersonalPage state={state} setState={setState} setPage={setPage} />;
  else content = <HomeDashboard state={state} setState={setState} setPage={setPage} />;

  return (
    <div className="app-shell">
      <NavHeader userName={state.settings.userName} onImportClick={() => setShowImport(true)} />
      {content}
      {showImport && <DataModal state={state} setState={setState} onClose={() => setShowImport(false)} />}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
