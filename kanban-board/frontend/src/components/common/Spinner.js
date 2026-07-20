import React from 'react';

function Spinner({ size = 'medium', color = 'primary' }) {
  return (
    <div
      className={`spinner spinner--${size} spinner--${color}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export default Spinner;
