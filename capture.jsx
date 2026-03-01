import { useState, useEffect, useRef, useCallback } from "react";

const TYPES = ["prospect", "task", "idea", "reminder"];
const COLORS = {
  prospect: { bg: "#e7f0f5", border: "#2a6b8a", text: "#2a6b8a", bar: "#2a6b8a" },
  task:     { bg: "#eaf2e8", border: "#4a7c3f", text: "#4a7c3f", bar: "#4a7c3f" },
  idea:     { bg: "#f2eaf5", border: "#7a4a8a", text: "#7a4a8a", bar: "#7a4a8a" },
  reminder: { bg: "#f5ede7", border: "#c85a2a", text: "#c85a2a", bar: "#c85a2a" },
};

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function formatReminder(dt) {
  return new Date(dt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function today() { return new Date().toDateString(); }

export default function Capture() {
  const [captures, setCaptures] = useState(() => {
    try { return JSON.parse(localStorage.getItem("captures_v2") || "[]"); } catch { return []; }
  });
  const [text, setText] = useState("");
  const [type, setType] = useState("prospect");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [image, setImage] = useState(null);
  const [reminderTime, setReminderTime] = useState("");
  const [notif, setNotif] = useState("");
  const [showEOD, setShowEOD] = useState(false);
  const [reminderAlert, setReminderAlert] = useState(null);
  const textRef = useRef();
  const fileRef = useRef();

  // Save to storage
  useEffect(() => {
    localStorage.setItem("captures_v2", JSON.stringify(captures));
  }, [captures]);

  // Paste image handler
  useEffect(() => {
    const handler = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (ev) => {
            setImage(ev.target.result);
            showNotif("Image pasted!");
            textRef.current?.focus();
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, []);

  // Reminder scheduler
  useEffect(() => {
    const timers = captures
      .filter(c => c.reminderTime && !c.done)
      .map(c => {
        const ms = new Date(c.reminderTime).getTime() - Date.now();
        if (ms > 0 && ms < 7 * 86400000) {
          return setTimeout(() => setReminderAlert(c), ms);
        }
        return null;
      })
      .filter(Boolean);
    return () => timers.forEach(clearTimeout);
  }, [captures]);

  function showNotif(msg) {
    setNotif(msg);
    setTimeout(() => setNotif(""), 1800);
  }

  function save() {
    if (!text.trim() && !image) return;
    const item = {
      id: Date.now(),
      type,
      text: text.trim(),
      image,
      timestamp: new Date().toISOString(),
      reminderTime: type === "reminder" ? reminderTime : null,
      done: false,
    };
    setCaptures(prev => [item, ...prev]);
    setText("");
    setImage(null);
    setReminderTime("");
    if (fileRef.current) fileRef.current.value = "";
    showNotif("Saved!");
    textRef.current?.focus();
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImage(ev.target.result);
    reader.readAsDataURL(file);
  }

  function toggleDone(id) {
    setCaptures(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));
  }
  function del(id) {
    setCaptures(prev => prev.filter(c => c.id !== id));
  }

  const todayItems = captures.filter(c => new Date(c.timestamp).toDateString() === today());
  const stats = TYPES.reduce((acc, t) => ({ ...acc, [t]: todayItems.filter(c => c.type === t).length }), {});

  const filtered = captures.filter(c => {
    if (filter === "done") return c.done;
    if (filter !== "all" && c.type !== filter) return false;
    if (search && !c.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div style={{ background: "#f5f2eb", minHeight: "100vh", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: "#1a1714", color: "#f5f2eb", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontFamily: "Instrument Serif, serif", fontSize: 22 }}>Capture</span>
        <span style={{ color: "#a09888", fontSize: 11 }}>{dateStr}</span>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px 80px" }}>

        {/* STATS */}
        <div style={{ background: "#1a1714", color: "#f5f2eb", borderRadius: 10, padding: "14px 18px", display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <span style={{ fontFamily: "Instrument Serif, serif", fontSize: 16, marginRight: "auto" }}>Today</span>
          {TYPES.map(t => (
            <div key={t} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 24 }}>{stats[t]}</div>
              <div style={{ fontSize: 10, color: "#a09888", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t}s</div>
            </div>
          ))}
          <button onClick={() => setShowEOD(true)} style={{ background: "#c85a2a", color: "white", border: "none", padding: "6px 14px", borderRadius: 6, fontFamily: "DM Mono, monospace", fontSize: 11, cursor: "pointer" }}>
            End of Day
          </button>
        </div>

        {/* CAPTURE BAR */}
        <div style={{ background: "#faf8f3", border: "1.5px solid #e0d9cc", borderRadius: 10, padding: 14, marginBottom: 20 }}>
          <textarea
            ref={textRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Drop anything here — a name, a thought, a to-do, a prospect... (⌘V to paste screenshot)"
            rows={2}
            style={{ width: "100%", border: "none", background: "transparent", fontFamily: "DM Mono, monospace", fontSize: 13, color: "#1a1714", resize: "none", outline: "none", lineHeight: 1.6 }}
          />

          {image && (
            <div style={{ position: "relative", display: "inline-block", marginTop: 8 }}>
              <img src={image} alt="preview" style={{ maxWidth: 200, borderRadius: 6, border: "1px solid #e0d9cc" }} />
              <button onClick={() => setImage(null)} style={{ position: "absolute", top: 4, right: 4, background: "#1a1714", color: "#f5f2eb", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 10, cursor: "pointer" }}>✕</button>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {TYPES.map(t => {
              const active = type === t;
              return (
                <button key={t} onClick={() => setType(t)} style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer", fontFamily: "DM Mono, monospace",
                  background: active ? COLORS[t].bg : "transparent",
                  border: `1.5px solid ${active ? COLORS[t].border : "#e0d9cc"}`,
                  color: active ? COLORS[t].text : "#8a8178",
                }}>
                  {t}
                </button>
              );
            })}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{ cursor: "pointer", color: "#8a8178", fontSize: 11, padding: "5px 10px", border: "1.5px solid #e0d9cc", borderRadius: 6 }}>
                + Image
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
              </label>
              <button onClick={save} style={{ background: "#1a1714", color: "#f5f2eb", border: "none", padding: "6px 16px", borderRadius: 6, fontFamily: "DM Mono, monospace", fontSize: 11, cursor: "pointer" }}>
                Save ↵
              </button>
            </div>
          </div>

          {type === "reminder" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <span style={{ color: "#8a8178", fontSize: 11 }}>Remind me:</span>
              <input type="datetime-local" value={reminderTime} onChange={e => setReminderTime(e.target.value)}
                style={{ border: "1.5px solid #e0d9cc", background: "transparent", borderRadius: 6, padding: "4px 8px", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#1a1714", outline: "none" }} />
            </div>
          )}
        </div>

        {/* FILTERS */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          {["all", ...TYPES, "done"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "4px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer", fontFamily: "DM Mono, monospace",
              background: filter === f ? "#1a1714" : "transparent",
              border: `1.5px solid ${filter === f ? "#1a1714" : "#e0d9cc"}`,
              color: filter === f ? "#f5f2eb" : "#8a8178",
            }}>{f}</button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ marginLeft: "auto", border: "1.5px solid #e0d9cc", background: "#faf8f3", borderRadius: 6, padding: "4px 10px", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#1a1714", outline: "none", width: 160 }} />
        </div>

        {/* CARDS */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#8a8178", padding: "40px 20px", lineHeight: 2 }}>Nothing here yet.<br />Drop something above to get started.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(c => (
              <div key={c.id} style={{ background: "#faf8f3", border: "1.5px solid #e0d9cc", borderRadius: 10, padding: 14, display: "flex", gap: 12, opacity: c.done ? 0.45 : 1 }}>
                <div style={{ width: 3, borderRadius: 2, flexShrink: 0, alignSelf: "stretch", background: COLORS[c.type].bar }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", padding: "2px 7px", borderRadius: 10, background: COLORS[c.type].bg, color: COLORS[c.type].text }}>{c.type}</span>
                    <span style={{ color: "#8a8178", fontSize: 10, marginLeft: "auto" }}>{formatTime(c.timestamp)}</span>
                  </div>
                  {c.text && <div style={{ color: "#1a1714", lineHeight: 1.6, whiteSpace: "pre-wrap", textDecoration: c.done ? "line-through" : "none" }}>{c.text}</div>}
                  {c.image && <img src={c.image} alt="screenshot" style={{ maxWidth: 180, borderRadius: 6, border: "1px solid #e0d9cc", marginTop: 8 }} />}
                  {c.reminderTime && <div style={{ marginTop: 6, fontSize: 10, color: "#c85a2a" }}>⏰ {formatReminder(c.reminderTime)}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggleDone(c.id)} style={{ background: "none", border: "1.5px solid #e0d9cc", borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer", fontFamily: "DM Mono, monospace", color: "#8a8178" }}>{c.done ? "Undo" : "Done"}</button>
                  <button onClick={() => del(c.id)} style={{ background: "none", border: "1.5px solid #e0d9cc", borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer", fontFamily: "DM Mono, monospace", color: "#8a8178" }}>Del</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EOD MODAL */}
      {showEOD && (
        <div onClick={() => setShowEOD(false)} style={{ position: "fixed", inset: 0, background: "rgba(26,23,20,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#faf8f3", borderRadius: 12, padding: 24, maxWidth: 500, width: "100%", maxHeight: "80vh", overflowY: "auto", border: "1.5px solid #e0d9cc" }}>
            <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 20, marginBottom: 4 }}>End of Day</div>
            <div style={{ color: "#8a8178", fontSize: 11, marginBottom: 16 }}>{dateStr}</div>
            {TYPES.map(t => {
              const items = todayItems.filter(c => c.type === t);
              if (!items.length) return null;
              return (
                <div key={t} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#8a8178", marginBottom: 8 }}>{t}s ({items.length})</div>
                  {items.map(c => (
                    <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid #e0d9cc", fontSize: 12, lineHeight: 1.5 }}>
                      {c.done ? "✓ " : ""}{c.text || "[image]"}
                    </div>
                  ))}
                </div>
              );
            })}
            {!todayItems.length && <p style={{ color: "#8a8178", fontSize: 12 }}>Nothing captured today yet.</p>}
            <button onClick={() => setShowEOD(false)} style={{ background: "#1a1714", color: "#f5f2eb", border: "none", padding: "8px 20px", borderRadius: 6, fontFamily: "DM Mono, monospace", fontSize: 12, cursor: "pointer", width: "100%", marginTop: 8 }}>Close</button>
          </div>
        </div>
      )}

      {/* NOTIF */}
      {notif && (
        <div style={{ position: "fixed", bottom: 20, right: 20, background: "#1a1714", color: "#f5f2eb", padding: "10px 16px", borderRadius: 8, fontSize: 12, zIndex: 300 }}>{notif}</div>
      )}

      {/* REMINDER ALERT */}
      {reminderAlert && (
        <div style={{ position: "fixed", top: 60, right: 16, background: "#c85a2a", color: "white", padding: "12px 16px", borderRadius: 10, fontSize: 12, zIndex: 300, maxWidth: 280, lineHeight: 1.5 }}>
          <strong style={{ display: "block", marginBottom: 4, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>⏰ Reminder</strong>
          {reminderAlert.text || "You have a reminder."}
          <br />
          <button onClick={() => setReminderAlert(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", padding: "4px 10px", borderRadius: 4, fontSize: 10, cursor: "pointer", marginTop: 8, fontFamily: "DM Mono, monospace" }}>Dismiss</button>
        </div>
      )}
    </div>
  );
}
