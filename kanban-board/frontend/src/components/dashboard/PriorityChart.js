import React from 'react';
import { PRIORITIES } from '../../utils/constants';

const PRIORITY_COLORS = {
  low:    '#94A3B8',
  medium: '#4F46E5',
  high:   '#F59E0B',
  urgent: '#EF4444',
};

function PriorityChart({ tasksByPriority, total }) {
  if (!tasksByPriority || total === 0) {
    return (
      <div className="chart-card">
        <h3 className="chart-card__title">Priority Distribution</h3>
        <p className="chart-card__empty">No tasks yet — create one to see stats.</p>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h3 className="chart-card__title">Priority Distribution</h3>
      <div className="priority-chart" role="list">
        {PRIORITIES.map(({ value, label }) => {
          const count = tasksByPriority[value] || 0;
          const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
          const color = PRIORITY_COLORS[value] ?? '#94A3B8';
          return (
            <div key={value} className="priority-chart__item" role="listitem">
              <div
                className="priority-chart__dot"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="priority-chart__label">{label}</span>
              <div className="priority-chart__track">
                <div
                  className="priority-chart__fill"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <span className="priority-chart__count">{count} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PriorityChart;
