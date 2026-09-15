export default function ConfirmDialog({ open, title, description, confirmLabel = 'Delete', danger = true, onConfirm, onCancel, busy }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="card w-full max-w-sm p-5">
        <h2 className="text-base font-semibold mb-2">{title}</h2>
        {description && <p className="text-sm text-ink-faint mb-5">{description}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
