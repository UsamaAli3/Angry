import { useEffect, useRef, useState } from "react";
import { getInvitationResponses, setFollowupAccess } from "../data/invitations.js";
import { readFollowupToken } from "../lib/followup.js";
import DeleteRecordsButton from "./DeleteRecordsButton.jsx";

const choiceLabels = { yes: "Yes, ask me", no: "No, thank you", coffee: "Coffee", dinner: "Dinner", maybe: "Maybe another time" };

function groupResponses(responses) {
  const grouped = new Map();
  // Prefer the newest value for legacy sessions with multiple entries for a stage.
  for (const response of [...responses].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))) {
    const reference = response.session_id || response.$id;
    if (!grouped.has(reference)) grouped.set(reference, { reference, values: {}, events: [], updated: "" });
    const group = grouped.get(reference);
    group.values[response.stage] = response.answer;
    group.events.push(response);
    group.updated = response.created_at || group.updated;
  }
  return [...grouped.values()].sort((a, b) => b.updated.localeCompare(a.updated));
}

function contactLink(method, value = "") {
  if (method === "Email" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${encodeURIComponent(value)}`;
  const phone = value.replace(/[\s().-]/g, "");
  if (["Phone", "WhatsApp"].includes(method) && /^\+?\d{7,15}$/.test(phone)) {
    return method === "WhatsApp" ? `https://wa.me/${phone.replace(/^\+/, "")}` : `tel:${phone}`;
  }
  const username = value.replace(/^@/, "");
  if (method === "Instagram" && /^[\w.]{1,30}$/.test(username)) return `https://www.instagram.com/${encodeURIComponent(username)}/`;
  return null;
}

export default function InvitationRecords() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [savingNotice, setSavingNotice] = useState("");
  const [changingLink, setChangingLink] = useState(null);
  const [accessError, setAccessError] = useState("");
  const loadSequence = useRef(0);

  async function load() {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError("");
    try {
      const responses = await getInvitationResponses({ all: true });
      if (sequence === loadSequence.current) setSessions(groupResponses(responses));
    }
    catch { if (sequence === loadSequence.current) setError("We couldn't load invitation responses. Check your connection and your admin's database read permission, then refresh."); }
    finally { if (sequence === loadSequence.current) setLoading(false); }
  }
  useEffect(() => {
    void load();
    const refresh = () => { if (document.visibilityState !== "hidden") void load(); };
    window.addEventListener("records-changed", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { window.removeEventListener("records-changed", refresh); window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/invitations?status=1", { cache: "no-store", signal: AbortSignal.timeout(10000) })
      .then(async response => {
        if (!response.ok) throw new Error("Status unavailable");
        const status = await response.json();
        if (typeof status.configured !== "boolean") throw new Error("Status unavailable");
        if (active && !status.configured) setSavingNotice("New answers cannot be saved yet. Configure APPWRITE_API_KEY and APPWRITE_ADMIN_USER_ID in the server environment, then restart or redeploy the app. Answers that failed to send will not appear here; retry them from the invitation page if it is still open.");
      }).catch(() => { if (active) setSavingNotice("Unable to verify the saving service. Make sure the invitation API is running before collecting new answers."); });
    return () => { active = false; };
  }, []);

  async function copyContact(value) {
    try { await navigator.clipboard.writeText(value); setCopyMessage("Contact copied."); }
    catch { setCopyMessage("Unable to copy automatically. You can select and copy the contact text."); }
  }

  async function changeAccess(reference, allowed) {
    setChangingLink(reference);
    setAccessError("");
    try { await setFollowupAccess(reference, allowed); await load(); }
    catch (error) { setAccessError(error.message); }
    finally { setChangingLink(null); }
  }

  return <section aria-labelledby="invitation-records-title">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><h2 id="invitation-records-title" className="font-display text-xl font-bold text-white">One Another Try — answers & contact details</h2><p className="mt-1 text-sm text-white/60">{loading ? "Loading responses…" : `${sessions.length} saved session${sessions.length === 1 ? "" : "s"}`}. Details are grouped by reference, not by name.</p></div>
      <button type="button" onClick={load} disabled={loading} className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white disabled:opacity-50">Refresh invitations</button>
    </div>
    {savingNotice && <p role="alert" className="mb-5 rounded-2xl border border-sunny/30 bg-sunny/10 p-4 text-sm leading-6 text-sunny">{savingNotice}</p>}
    {loading && <p role="status" className="py-8 text-center text-white/60">Loading invitation responses…</p>}
    {error && <p role="alert" className="rounded-2xl bg-bloom/10 p-4 text-bloom">{error}</p>}
    {accessError && <p role="alert" className="mb-4 rounded-2xl bg-bloom/10 p-4 text-bloom">{accessError}</p>}
    {!loading && !error && sessions.length > 0 && <div className="mb-4"><DeleteRecordsButton scope="invitations" label="Delete all invitations" message="Delete all invitation answers, contact details, and private links? Their follow-up links will stop working. This cannot be undone." /></div>}
    <p role="status" className="mb-3 text-sm text-calm">{copyMessage}</p>
    {!loading && !error && !sessions.length && <p className="rounded-2xl bg-white/5 p-6 text-white/70">No invitation responses yet. Submitted answers and any shared contact details will appear here.</p>}
    {!loading && !error && <ul className="space-y-5">{sessions.map(session => {
      const values = session.values;
      const method = values.contact_method || values.delivery_method;
      const contact = values.contact || values.delivery_contact;
      const href = contactLink(method, contact);
      const followup = readFollowupToken(values.next_link);
      const availableAt = followup?.s === session.reference ? followup.a : null;
      const ready = values.link_access?.startsWith("allowed.") === true;
      const nextLink = availableAt ? `${window.location.origin}/invitation?next=${encodeURIComponent(values.next_link)}` : null;
      return <li key={session.reference} className="rounded-3xl bg-white p-5 shadow-soft sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="font-display text-lg font-bold text-ink">{choiceLabels[values.invitation] || (values.permission === "no" ? "Declined" : availableAt ? ready ? "Next question allowed" : "Waiting for your approval" : "Awaiting final choice")}</h3><p className="mt-1 break-all font-mono text-xs text-mist">Reference: {session.reference}</p></div>
          <p className="text-xs text-mist">{session.updated ? new Date(session.updated).toLocaleString() : "Time unavailable"}</p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="Initial answer" value={choiceLabels[values.permission]} />
          <Field label="Final choice" value={choiceLabels[values.invitation]} />
          <Field label="Next link delivery method" value={values.delivery_method} />
          <Field label="Next link delivery contact" value={values.delivery_contact} />
          {availableAt && <Field label="Next question access" value={ready ? "Allowed" : "Blocked until you allow it"} />}
          <Field label="Preferred date" value={values.date} />
          <Field label="Preferred time" value={values.time} />
          <Field label="Time zone" value={values.timezone} />
          <Field label="Contact method" value={values.contact_method} />
          <div className="sm:col-span-2"><Field label="Contact details" value={values.contact} /></div>
        </dl>
        <div className="mt-5"><DeleteRecordsButton scope="invitations" sessionId={session.reference} label="Delete invitation" message="Delete this invitation's answers, contact details, and private link? Its follow-up link will stop working. This cannot be undone." /></div>
        {nextLink && <div className="mt-5 rounded-2xl bg-cloud p-4 text-sm text-ink"><p>{ready ? "Her copied link can now open the coffee-or-dinner question." : "She can copy her link now, but it stays closed until you allow it here. Time passing will not open it automatically."}</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={changingLink !== null} onClick={() => changeAccess(session.reference, !ready)} className={`rounded-xl px-4 py-2 font-semibold text-white ${ready ? "bg-bloomDark" : "bg-calm"} disabled:opacity-50`}>{changingLink === session.reference ? "Updating…" : ready ? "Block next question" : "Allow next question"}</button><button type="button" onClick={() => copyContact(nextLink)} className="rounded-xl border border-ink/20 px-4 py-2 font-semibold">Copy next question link</button></div></div>}
        {contact && <div className="mt-5 flex flex-wrap gap-3">
          {href && <a href={href} {...(href.startsWith("https:") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="rounded-xl bg-calm px-4 py-2 text-sm font-semibold text-white">{method === "Email" ? "Write email" : method === "Phone" ? "Call" : `Open ${method}`}</a>}
          <button type="button" onClick={() => copyContact(contact)} className="rounded-xl bg-cloud px-4 py-2 text-sm font-semibold text-ink">Copy contact</button>
        </div>}
        <details className="mt-5 border-t border-ink/10 pt-4"><summary className="cursor-pointer text-sm font-medium text-mist">All saved entries ({session.events.length})</summary><ul className="mt-3 space-y-2 text-xs text-ink">{session.events.map(event => <li key={event.$id} className="break-words"><span className="font-semibold">{event.stage}:</span> {event.answer} <span className="text-mist">{event.created_at ? ` · ${new Date(event.created_at).toLocaleString()}` : ""}</span></li>)}</ul></details>
      </li>;
    })}</ul>}
  </section>;
}

function Field({ label, value }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-mist">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-ink">{value || "Not shared"}</dd></div>;
}
