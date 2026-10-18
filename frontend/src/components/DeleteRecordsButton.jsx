import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";
import { deleteRecords } from "../data/delete-records.js";

export default function DeleteRecordsButton({ scope, id, sessionId, label, message, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setBusy(true); setError("");
    try { await deleteRecords({ scope, id, sessionId }); setOpen(false); }
    catch (error) {
      const message = error.message || "Couldn't delete these records. Please retry.";
      setError(message);
      window.dispatchEvent(new CustomEvent("records-delete-error", { detail: message }));
    }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" disabled={disabled || busy} onClick={() => { setError(""); setOpen(true); }} className="rounded-xl border border-rose-400 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50">{label}</button>
    {open && <ConfirmDialog message={message} error={error} confirmLabel="Delete permanently" busy={busy} onCancel={() => setOpen(false)} onConfirm={remove} />}
  </>;
}
