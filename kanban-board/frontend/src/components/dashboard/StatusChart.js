import React from 'react';
import { STATUSES } from '../../utils/constants';

const STATUS_COLORS = {
  todo:        '#94A3B8',
  in_progress: '#4F46E5',
  review:      '#F59E0B',
  done:        '#10B981',
};

function StatusChart({ tasksByStatus, total }) {
  if (!tasksByStatus || total === 0) {
    return (
      <div className="chart-card">
        <h3 className="chart-card__title">Tasks by Status</h3>
        <p className="chart-card__empty">No tasks yet — create one to see stats.</p>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h3 className="chart-card__title">Tasks by Status</h3>
      <div className="bar-chart" role="list">
        {STATUSES.map(({ value, label }) => {
          const count = tasksByStatus[value] || 0;
          const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
          const color = STATUS_COLORS[value] ?? '#94A3B8';
          return (
            <div key={value} className="bar-chart__row" role="listitem">
              <span className="bar-chart__label">{label}</span>
              <div
                className="bar-chart__track"
                aria-label={`${label}: ${count} tasks`}
              >
                <div
                  className="bar-chart__fill"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <span className="bar-chart__count">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StatusChart;
