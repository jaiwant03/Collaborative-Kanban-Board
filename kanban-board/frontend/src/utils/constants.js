export const STATUSES = [
  { value: 'todo',        label: 'To Do',       color: '#6b7280' },
  { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { value: 'review',      label: 'Review',      color: '#f59e0b' },
  { value: 'done',        label: 'Done',        color: '#10b981' },
];

export const PRIORITIES = [
  { value: 'low',    label: 'Low',    color: '#6b7280' },
  { value: 'medium', label: 'Medium', color: '#3b82f6' },
  { value: 'high',   label: 'High',   color: '#f59e0b' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

export const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Creation Date' },
  { value: 'dueDate',   label: 'Due Date' },
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'priority',  label: 'Priority' },
  { value: 'title',     label: 'Title' },
];

export const BOARD_COLUMNS = [
  { id: 'todo',        title: 'To Do',       colorClass: 'col-todo' },
  { id: 'in_progress', title: 'In Progress', colorClass: 'col-in-progress' },
  { id: 'review',      title: 'Review',      colorClass: 'col-review' },
  { id: 'done',        title: 'Done',        colorClass: 'col-done' },
];
