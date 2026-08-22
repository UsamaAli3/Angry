import { useEffect, useState } from "react";
import {
  getCheckins,
  getVisitCount,
  updateCheckin,
  deleteCheckin,
  deleteAllCheckins,
} from "../data/api.js";
import { logout } from "../auth.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { questions } from "../data/questions.js";

function formatTimestamp(isoString) {
  const date = new Date(isoString);
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

export default function MyRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [visitCount, setVisitCount] = useState(0);

  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editAnswers, setEditAnswers] = useState({});

  async function loadRecords() {
    setLoading(true);
    setLoadError("");
    try {
      const [{ checkins }, visits] = await Promise.all([getCheckins(), getVisitCount()]);
      setRecords(checkins);
      setVisitCount(visits);
    } catch (err) {
      console.error(err);
      setLoadError("We couldn't load your records. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
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
          <h1 className="font-display font-bold text-2xl text-ink mb-1">📋 My Records</h1>
          <p className="text-mist text-sm">Total Check-Ins: {records.length}</p>
          <p className="text-mist text-sm">Website Visits: {visitCount}</p>
        </div>

        {records.length > 0 && (
          <button
            type="button"
            onClick={() => setClearAllOpen(true)}
            className="shrink-0 px-3.5 py-2 rounded-2xl font-display font-semibold text-sm text-bloomDark bg-bloom/10 hover:bg-bloom/20 transition-colors"
          >
            Clear All Records
          </button>
        )}
      </header>

      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={logout}
          className="text-mist text-sm font-medium hover:text-ink transition-colors"
        >
          Sign out
        </button>
      </div>

      {loading && <p className="text-mist text-center py-10">Loading records…</p>}

      {!loading && loadError && (
        <p className="text-bloomDark bg-bloom/10 rounded-2xl px-4 py-3 text-sm font-medium text-center">
          {loadError}
        </p>
      )}

      {!loading && !loadError && records.length === 0 && (
        <div className="text-center py-14">
          <p className="font-display font-semibold text-lg text-ink mb-1">No check-ins yet</p>
          <p className="text-mist text-sm">Submitted check-ins will appear here.</p>
        </div>
      )}

      {!loading && !loadError && records.length > 0 && (
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
                    return (
                      <label key={field} className="block">
                        <span className="text-mist text-xs uppercase tracking-wide font-medium">
                          {question.title}
                        </span>
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
                  <RecordField label="What happened?" value={record.what_happened} />
                  <RecordField label="How angry?" value={record.anger_level} />
                  <RecordField label="What do you want?" value={record.what_wants} />
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
