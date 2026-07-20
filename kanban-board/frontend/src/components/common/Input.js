import React from 'react';

function Input({
  label,
  id,
  error,
  type = 'text',
  required = false,
  className = '',
  icon,
  ...rest
}) {
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span className="form-required" aria-hidden="true"> *</span>}
        </label>
      )}

      {icon ? (
        <div className="form-input-wrap">
          <span className="form-input-icon" aria-hidden="true">{icon}</span>
          <input
            id={id}
            type={type}
            className={`form-input${error ? ' form-input--error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            required={required}
            {...rest}
          />
        </div>
      ) : (
        <input
          id={id}
          type={type}
          className={`form-input${error ? ' form-input--error' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          required={required}
          {...rest}
        />
      )}

      {error && (
        <p id={`${id}-error`} className="form-error" role="alert">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  );
}

export default Input;
