import React from 'react';

function StatCard({ title, value, icon, colorClass, subtitle }) {
  return (
    <div className={`stat-card ${colorClass ?? ''}`} role="article">
      <div className="stat-card__icon-wrap" aria-hidden="true">
        <span className="stat-card__icon">{icon}</span>
      </div>
      <div className="stat-card__body">
        <p className="stat-card__title">{title}</p>
        <p className="stat-card__value">{value ?? '—'}</p>
        {subtitle && <p className="stat-card__subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}

export default StatCard;
