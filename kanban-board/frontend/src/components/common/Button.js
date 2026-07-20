import React from 'react';
import Spinner from './Spinner';

function Button({
  children,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${className}`}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...rest}
    >
      {isLoading ? (
        <>
          <Spinner size="small" color="white" />
          <span>Loading…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;
