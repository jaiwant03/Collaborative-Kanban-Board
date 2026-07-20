import React from 'react';
import { formatDate, isOverdue, getInitials } from '../../utils/formatters';
import { PRIORITIES } from '../../utils/constants';
import Badge from '../common/Badge';

const PRIORITY_STRIPE_COLORS = {
  low:    '#94A3B8',
  medium: '#4F46E5',
  high:   '#F59E0B',
  urgent: '#EF4444',
};

function TaskCard({ task, onClick }) {
  const overdue   = isOverdue(task);
  const priority  = PRIORITIES.find((p) => p.value === task.priority);
  const stripeColor = PRIORITY_STRIPE_COLORS[task.priority] ?? '#94A3B8';

  return (
    <article
      className={`task-card${overdue ? ' task-card--overdue' : ''}`}
      onClick={() => onClick(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick(task)}
      aria-label={`Task: ${task.title}`}
    >
      {/* Priority colour stripe */}
      <div
        className="task-card__priority-stripe"
        style={{ backgroundColor: stripeColor }}
        aria-hidden="true"
      />

      <div className="task-card__body">
        {/* Labels */}
        {task.labels?.length > 0 && (
          <div className="task-card__labels">
            {task.labels.slice(0, 3).map((label) => (
              <Badge key={label} variant="label">{label}</Badge>
            ))}
            {task.labels.length > 3 && (
              <Badge variant="default">+{task.labels.length - 3}</Badge>
            )}
          </div>
        )}

        <h4 className="task-card__title">{task.title}</h4>

        {task.description && (
          <p className="task-card__description">
            {task.description.length > 85
              ? task.description.slice(0, 85) + '…'
              : task.description}
          </p>
        )}

        {/* Footer */}
        <div className="task-card__footer">
          <div className="task-card__meta">
            <Badge variant={`priority-${task.priority}`} size="small">
              {priority?.label ?? task.priority}
            </Badge>

            {task.dueDate && (
              <span className={`task-card__due${overdue ? ' task-card__due--overdue' : ''}`}>
                <span className="task-card__due-icon" aria-hidden="true">
                  {overdue ? '🔴' : '📅'}
                </span>
                {formatDate(task.dueDate)}
              </span>
            )}
          </div>

          {task.assignee && (
            <div
              className="task-card__assignee"
              title={task.assignee.name ?? 'Assigned'}
              aria-label={`Assigned to ${task.assignee.name ?? 'user'}`}
            >
              {getInitials(task.assignee.name ?? '')}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default TaskCard;
