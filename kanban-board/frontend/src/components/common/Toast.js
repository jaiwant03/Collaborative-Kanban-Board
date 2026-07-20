import React from 'react';
import { useToast } from '../../context/ToastContext';

const TOAST_ICONS = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

function Toast() {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="toast-container" role="alert" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          <span className="toast__icon" aria-hidden="true">
            {TOAST_ICONS[t.type] ?? 'ℹ'}
          </span>
          <span className="toast__message">{t.message}</span>
          <button
            className="toast__close"
            onClick={() => removeToast(t.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default Toast;
