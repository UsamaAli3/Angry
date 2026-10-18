import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getCheckins,
  getVisits,
  updateCheckin,
  deleteCheckin,
  deleteAllCheckins,
} from "../data/api.js";
import { logout } from "../auth.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { questions } from "../data/questions.js";
import InvitationRecords from "../components/InvitationRecords.jsx";
import WebsiteVisits from "../components/WebsiteVisits.jsx";
import DeleteRecordsButton from "../components/DeleteRecordsButton.jsx";

function formatTimestamp(isoString) {
  const date = new Date(isoString);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  const datePart = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timePart = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} — ${timePart}`;
}

export default function MyRecords({ visitSaveError = "" }) {
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [recordErrors, setRecordErrors] = useState({ checkins: "", visits: "" });
  const loadSequence = useRef(0);
  const [visitCount, setVisitCount] = useState(0);
  const [visits, setVisits] = useState([]);
  const [activeTab, setActiveTab] = useState(["checkins", "visits", "invitations"].includes(searchParams.get("tab")) ? searchParams.get("tab") : "all");
  const showInvitations = activeTab === "all" || activeTab === "invitations";
  const showCheckins = activeTab === "all" || activeTab === "checkins";
  const showVisits = activeTab === "all" || activeTab === "visits";

  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editAnswers, setEditAnswers] = useState({});

  async function loadRecords() {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setLoadError("");
    const [checkinResult, visitResult] = await Promise.allSettled([getCheckins(), getVisits()]);
    if (sequence !== loadSequence.current) return;
    const errors = { checkins: "", visits: "" };
    if (checkinResult.status === "fulfilled") setRecords(checkinResult.value.checkins);
    else errors.checkins = "Check-ins couldn't be loaded. Refresh to retry.";
    if (visitResult.status === "fulfilled") { setVisits(visitResult.value); setVisitCount(visitResult.value.length); }
    else errors.visits = "Website visits couldn't be loaded. Check your admin Read permission and refresh to retry.";
    setRecordErrors(errors);
    setLoading(false);
  }

  useEffect(() => {
    loadRecords();
    const refresh = () => { if (document.visibilityState !== "hidden") void loadRecords(); };
    window.addEventListener("records-changed", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { window.removeEventListener("records-changed", refresh); window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const report = event => setDeleteError(event.detail);
    window.addEventListener("records-delete-error", report);
    return () => window.removeEventListener("records-delete-error", report);
  }, []);

  async function confirmDeleteOne() {
    setBusyAction(true);
    try {
      await deleteCheckin(pendingDeleteId);
      setRecords((prev) => prev.filter((r) => r.id !== pendingDeleteId));
      setPendingDeleteId(null);
    } catch (err) {
      console.error(err);
      setLoadError("We couldn't delete that check-in. Please try again.");
    } finally {
      setBusyAction(false);
    }
  }

  async function confirmClearAll() {
    setBusyAction(true);
    try {
      await deleteAllCheckins();
      setRecords([]);
      setClearAllOpen(false);
    } catch (err) {
      console.error(err);
      setLoadError("We couldn't clear your records. Please try again.");
    } finally {
      setBusyAction(false);
    }
  }

  function startEditing(record) {
    setEditingId(record.id);
    setEditAnswers({
      whatHappened: record.what_happened ?? "",
      angerLevel: record.anger_level ?? "",
      whatWants: record.what_wants ?? "",
      whatHappenedHeader: record.what_happened_header ?? questions[0].title,
      angerLevelHeader: record.anger_level_header ?? questions[1].title,
      whatWantsHeader: record.what_wants_header ?? questions[2].title,
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditAnswers({});
  }

  async function saveEditing() {
    setBusyAction(true);
    try {
      await updateCheckin(editingId, editAnswers);
      setRecords((prev) =>
        prev.map((record) =>
          record.id === editingId
            ? {
                ...record,
                what_happened: editAnswers.whatHappened || null,
                anger_level: editAnswers.angerLevel || null,
                what_wants: editAnswers.whatWants || null,
                what_happened_header: editAnswers.whatHappenedHeader,
                anger_level_header: editAnswers.angerLevelHeader,
                what_wants_header: editAnswers.whatWantsHeader,
              }
            : record,
        ),
      );
      cancelEditing();
    } catch (err) {
      console.error(err);
      setLoadError("We couldn't update that check-in. Please try again.");
    } finally {
      setBusyAction(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <header className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white mb-1">📋 My Records</h1>
          <p className="text-white/60 text-sm">View check-ins, invitation answers and contact details, and website visits.</p>
        </div>

        {activeTab === "checkins" && records.length > 0 && (
          <button
            type="button"
            onClick={() => setClearAllOpen(true)}
            className="shrink-0 px-3.5 py-2 rounded-2xl font-display font-semibold text-sm text-bloomDark bg-bloom/10 hover:bg-bloom/20 transition-colors"
          >
            Delete all check-ins
          </button>
        )}
      </header>

      {visitSaveError && <p role="alert" className="mb-4 rounded-2xl bg-bloom/10 p-4 text-sm text-bloom">{visitSaveError}</p>}
      {deleteError && <p role="alert" className="mb-4 rounded-2xl bg-rose-100 p-4 text-sm text-rose-900">{deleteError}<button type="button" className="ml-3 underline" onClick={() => setDeleteError("")}>Dismiss</button></p>}
      <div className="mb-4"><DeleteRecordsButton scope="all" label="Delete all records" disabled={loading} message="Delete ALL check-ins, invitation answers, contact details, private links, and website visits? Invitation links will stop working. This cannot be undone." /></div>
      <div className="flex justify-end gap-4 mb-4">
        <button type="button" onClick={() => window.dispatchEvent(new Event("records-changed"))} disabled={loading} className="text-calm text-sm font-medium disabled:opacity-50">Refresh all records</button>
        <button
          type="button"
          onClick={logout}
          className="text-mist text-sm font-medium hover:text-ink transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4" role="tablist" aria-label="Record type">
        <button type="button" role="tab" aria-selected={activeTab === "all"} onClick={() => setActiveTab("all")} className={`rounded-2xl p-4 text-left ${activeTab === "all" ? "bg-bloom text-white" : "bg-white text-ink"}`}><span className="block font-display text-2xl font-bold">All</span><span className="text-sm font-semibold">All Records</span></button>
        <button type="button" role="tab" aria-selected={activeTab === "invitations"} onClick={() => setActiveTab("invitations")} className={`rounded-2xl p-4 text-left transition-colors ${activeTab === "invitations" ? "bg-bloom text-white shadow-soft" : "bg-white text-ink hover:bg-bloom/5"}`}><span className="block text-2xl font-display font-bold">♡</span><span className="text-sm font-semibold">One Another Try</span><span className="mt-1 block text-xs">Answers & contact</span></button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "checkins"}
          onClick={() => setActiveTab("checkins")}
          className={`rounded-2xl p-4 text-left transition-colors ${
            activeTab === "checkins"
              ? "bg-bloom text-white shadow-soft"
              : "bg-white text-ink hover:bg-bloom/5"
          }`}
        >
          <span className="block text-2xl font-display font-bold">{records.length}</span>
          <span className="text-sm font-semibold">Check-Ins</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "visits"}
          onClick={() => setActiveTab("visits")}
          className={`rounded-2xl p-4 text-left transition-colors ${
            activeTab === "visits"
              ? "bg-calm text-white shadow-soft"
              : "bg-white text-ink hover:bg-calm/5"
          }`}
        >
          <span className="block text-2xl font-display font-bold">{visitCount}</span>
          <span className="text-sm font-semibold">Website Visits</span>
        </button>
      </div>

      {showInvitations && <div className="mb-8"><InvitationRecords /></div>}

      {loading && activeTab !== "invitations" && <p className="text-mist text-center py-10">Loading records…</p>}

      {!loading && loadError && activeTab !== "invitations" && (
        <p className="text-bloomDark bg-bloom/10 rounded-2xl px-4 py-3 text-sm font-medium text-center">
          {loadError}
        </p>
      )}
      {!loading && showCheckins && recordErrors.checkins && <p role="alert" className="my-4 rounded-2xl bg-bloom/10 p-4 text-bloom">{recordErrors.checkins}</p>}
      {!loading && showVisits && recordErrors.visits && <p role="alert" className="my-4 rounded-2xl bg-bloom/10 p-4 text-bloom">{recordErrors.visits}</p>}

      {!loading && !recordErrors.checkins && showCheckins && records.length === 0 && (
        <div className="text-center py-14">
          <p className="font-display font-semibold text-lg text-white mb-1">No check-ins yet</p>
          <p className="text-mist text-sm">Submitted check-ins will appear here.</p>
        </div>
      )}

      {!loading && !recordErrors.checkins && showCheckins && records.length > 0 && (
        <ul className="space-y-4">
          {records.map((record) => (
            <li key={record.id} className="bg-white rounded-3xl shadow-soft p-5">
              <p className="text-mist text-xs font-medium mb-3">
                {formatTimestamp(record.created_at)}
              </p>

              {editingId === record.id ? (
                <div className="space-y-3">
                  {questions.map((question) => {
                    const field = question.id;
                    const headerField = `${field}Header`;
                    return (
                      <label key={field} className="block">
                        <span className="text-mist text-xs uppercase tracking-wide font-medium">Header</span>
                        <input
                          value={editAnswers[headerField]}
                          onChange={(event) =>
                            setEditAnswers((prev) => ({
                              ...prev,
                              [headerField]: event.target.value,
                            }))
                          }
                          className="mt-1 mb-2 w-full px-3 py-2.5 rounded-xl border border-ink/10 bg-white text-ink"
                        />
                        <select
                          value={editAnswers[field]}
                          onChange={(event) =>
                            setEditAnswers((prev) => ({ ...prev, [field]: event.target.value }))
                          }
                          className="mt-1 w-full px-3 py-2.5 rounded-xl border border-ink/10 bg-white text-ink"
                        >
                          <option value="">Not answered</option>
                          {question.options.map((option) => (
                            <option key={option.label} value={option.label}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  })}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={saveEditing}
                      disabled={busyAction}
                      className="px-3.5 py-2 rounded-2xl font-display font-semibold text-sm text-white bg-calm hover:bg-calmDark disabled:opacity-50"
                    >
                      {busyAction ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={busyAction}
                      className="px-3.5 py-2 rounded-2xl font-display font-semibold text-sm text-ink bg-cloud hover:bg-ink/5 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <RecordField label={record.what_happened_header || questions[0].title} value={record.what_happened} />
                  <RecordField label={record.anger_level_header || questions[1].title} value={record.anger_level} />
                  <RecordField label={record.what_wants_header || questions[2].title} value={record.what_wants} />
                </>
              )}

              {editingId !== record.id && (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEditing(record)}
                    className="px-3.5 py-2 rounded-2xl font-display font-semibold text-sm text-calm bg-calm/10 hover:bg-calm/20 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(record.id)}
                    className="px-3.5 py-2 rounded-2xl font-display font-semibold text-sm text-bloomDark bg-bloom/10 hover:bg-bloom/20 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!loading && !recordErrors.visits && showVisits && (
        <WebsiteVisits visits={visits} formatTimestamp={formatTimestamp} />
      )}

      {pendingDeleteId !== null && (
        <ConfirmDialog
          message="Are you sure you want to delete this check-in?"
          confirmLabel="Delete"
          busy={busyAction}
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={confirmDeleteOne}
        />
      )}

      {clearAllOpen && (
        <ConfirmDialog
          message="Are you sure you want to delete all check-ins? This cannot be undone."
          confirmLabel="Delete Everything"
          busy={busyAction}
          onCancel={() => setClearAllOpen(false)}
          onConfirm={confirmClearAll}
        />
      )}
    </div>
  );
}

function RecordField({ label, value }) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="text-mist text-xs uppercase tracking-wide font-medium mb-0.5">{label}</p>
      <p className="text-ink font-medium text-[15px]">{value || "Not answered yet"}</p>
    </div>
  );
}
