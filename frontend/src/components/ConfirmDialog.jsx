export default function ConfirmDialog({
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  busy = false,
}) {
  return (
    <div
      className="fixed inset-0 z-20 bg-ink/40 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full sm:max-w-sm bg-white rounded-3xl shadow-soft p-6">
        <p className="text-ink font-medium text-[15px] sm:text-base mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-2xl font-display font-semibold text-sm bg-cloud text-ink hover:bg-ink/5 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-2xl font-display font-semibold text-sm bg-bloom text-white hover:bg-bloomDark transition-colors disabled:opacity-50"
          >
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
