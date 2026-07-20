import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, isOverdue } from '../../utils/formatters';
import { PRIORITIES, STATUSES } from '../../utils/constants';
import Badge from '../common/Badge';
import Button from '../common/Button';

function RecentTasks({ tasks }) {
  const navigate = useNavigate();

  if (!tasks?.length) {
    return (
      <div className="chart-card">
        <h3 className="chart-card__title">Recent Tasks</h3>
        <p className="chart-card__empty">No tasks yet — create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="chart-card chart-card--wide">
      <div className="chart-card__header">
        <h3 className="chart-card__title">Recent Tasks</h3>
        <Button variant="ghost" size="small" onClick={() => navigate('/board')}>
          View Board →
        </Button>
      </div>

      <div className="recent-tasks">
        {tasks.map((task) => {
          const priority = PRIORITIES.find((p) => p.value === task.priority);
          const status   = STATUSES.find((s) => s.value === task.status);
          const overdue  = isOverdue(task);
          const initials = task.assignee?.name
            ?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

          return (
            <div
              key={task._id}
              className={`recent-task${overdue ? ' recent-task--overdue' : ''}`}
              role="article"
            >
              <div className="recent-task__left">
                <p className="recent-task__title">{task.title}</p>
                <div className="recent-task__meta">
                  <Badge variant={`priority-${task.priority}`} size="small">
                    {priority?.label}
                  </Badge>
                  <Badge variant={`status-${task.status}`} size="small">
                    {status?.label}
                  </Badge>
                  {task.dueDate && (
                    <span
                      className={`recent-task__due${overdue ? ' recent-task__due--overdue' : ''}`}
                    >
                      {overdue ? '🔴' : '📅'} {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </div>

              {task.assignee && (
                <div
                  className="recent-task__assignee"
                  title={task.assignee.name ?? 'Assigned'}
                  aria-label={`Assigned to ${task.assignee.name ?? 'user'}`}
                >
                  {initials}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecentTasks;
