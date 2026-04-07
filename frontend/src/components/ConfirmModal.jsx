import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ title, message, variant = 'primary', onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <AlertTriangle size={22} color={variant === 'danger' ? 'var(--danger)' : 'var(--primary)'} />
          <h3>{title}</h3>
        </div>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onCancel}>No, Go Back</button>
          <button className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            Yes, Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
