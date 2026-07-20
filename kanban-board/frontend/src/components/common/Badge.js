import React from 'react';

function Badge({ children, variant = 'default', size = 'small' }) {
  return (
    <span className={`badge badge--${variant} badge--${size}`}>
      {children}
    </span>
  );
}

export default Badge;
