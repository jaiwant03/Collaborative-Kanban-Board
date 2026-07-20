import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import CommentSection from './CommentSection';
import AttachmentSection from './AttachmentSection';
import ActivityLog from './ActivityLog';
import { STATUSES, PRIORITIES } from '../../utils/constants';
import { formatDate, isOverdue } from '../../utils/formatters';
import { useWorkspace } from '../../context/WorkspaceContext';

const TABS = [
  { id: 'details',     label: 'Details',     icon: '📝' },
  { id: 'comments',    label: 'Comments',    icon: '💬' },
  { id: 'attachments', label: 'Attachments', icon: '📎' },
  { id: 'activity',    label: 'Activity',    icon: '📋' },
];

function TaskModal({ isOpen, onClose, task, onSave, onDelete, isLoading }) {
  const { activeWorkspace } = useWorkspace();
  const isEditing = !!task?._id;

  const [activeTab, setActiveTab] = useState('details');

  const members = React.useMemo(() => {
    if (!activeWorkspace?.members?.length) return [];
    return activeWorkspace.members
      .map((m) => {
        const user = m.user || m;
        return {
          _id:   user._id || user,
          name:  user.name  || '',
          email: user.email || '',
        };
      })
      .filter((m) => m._id);
  }, [activeWorkspace]);

  const emptyForm = {
    title:       '',
    description: '',
    status:      'todo',
    priority:    'medium',
    assignee:    '',
    dueDate:     '',
    labels:      '',
    workspaceId: activeWorkspace?._id || '',
  };

  const [form,          setForm]          = useState(emptyForm);
  const [errors,        setErrors]        = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen) setActiveTab('details');
    if (task) {
      const rawAssignee = task.assignee?._id || task.assignee || '';
      setForm({
        title:       task.title       || '',
        description: task.description || '',
        status:      task.status      || 'todo',
        priority:    task.priority    || 'medium',
        assignee:    rawAssignee,
        dueDate:     task.dueDate ? task.dueDate.slice(0, 10) : '',
        labels:      Array.isArray(task.labels) ? task.labels.join(', ') : '',
        workspaceId: activeWorkspace?._id || '',
      });
    } else {
      const defaultAssignee = members.length === 1 ? members[0]._id : '';
      setForm({ ...emptyForm, workspaceId: activeWorkspace?._id || '', assignee: defaultAssignee });
    }
    setErrors({});
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, isOpen]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required.';
    else if (form.title.trim().length < 2) e.title = 'Title must be at least 2 characters.';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload = {
      title:       form.title.trim(),
      description: form.description.trim(),
      status:      form.status,
      priority:    form.priority,
      assignee:    form.assignee || null,
      dueDate:     form.dueDate  || null,
      labels:      form.labels
        ? form.labels.split(',').map((l) => l.trim()).filter(Boolean)
        : [],
      workspaceId: form.workspaceId,
    };

    await onSave(payload);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await onDelete(task._id);
    onClose();
  };

  const overdue = task && isOverdue(task);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Task' : 'New Task'}
      size="large"
    >
      {/* Tab bar — only show when editing an existing task */}
      {isEditing && (
        <div className="task-modal__tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`task-modal__tab${activeTab === tab.id ? ' task-modal__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span aria-hidden="true">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Details tab (always shown for new tasks) ───────────────────────── */}
      {(activeTab === 'details' || !isEditing) && (
        <form onSubmit={handleSubmit} noValidate>
          <Input
            id="task-title"
            name="title"
            label="Title"
            placeholder="What needs to be done?"
            value={form.title}
            onChange={handleChange}
            error={errors.title}
            required
            autoFocus={!isEditing}
          />

          <div className="form-group">
            <label htmlFor="task-description" className="form-label">
              Description <span className="form-optional">(optional)</span>
            </label>
            <textarea
              id="task-description"
              name="description"
              className="form-input form-textarea"
              placeholder="Add more details..."
              value={form.description}
              onChange={handleChange}
              rows={3}
              maxLength={2000}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="task-status" className="form-label">Status</label>
              <select
                id="task-status"
                name="status"
                className="form-input form-select"
                value={form.status}
                onChange={handleChange}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="task-priority" className="form-label">Priority</label>
              <select
                id="task-priority"
                name="priority"
                className="form-input form-select"
                value={form.priority}
                onChange={handleChange}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <Input
              id="task-due"
              name="dueDate"
              type="date"
              label="Due Date"
              value={form.dueDate}
              onChange={handleChange}
              className={overdue ? 'input--overdue' : ''}
            />
            <div className="form-group">
              <label htmlFor="task-assignee" className="form-label">
                Assignee <span className="form-optional">(optional)</span>
              </label>
              {members.length === 0 ? (
                <select id="task-assignee" name="assignee" className="form-input form-select" disabled>
                  <option value="">No members available</option>
                </select>
              ) : (
                <select
                  id="task-assignee"
                  name="assignee"
                  className="form-input form-select"
                  value={form.assignee}
                  onChange={handleChange}
                >
                  <option value="">— Select Member —</option>
                  {form.assignee && !members.find((m) => String(m._id) === String(form.assignee)) && (
                    <option value={form.assignee} disabled>Unknown User</option>
                  )}
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>{m.name || m.email}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <Input
            id="task-labels"
            name="labels"
            label="Labels"
            placeholder="design, bug, frontend (comma-separated)"
            value={form.labels}
            onChange={handleChange}
          />

          {overdue && (
            <div className="alert alert--warning" role="alert">
              ⚠️ This task is overdue (due {formatDate(task.dueDate)})
            </div>
          )}

          <div className="modal-actions">
            {isEditing && (
              <Button
                type="button"
                variant={confirmDelete ? 'danger' : 'ghost'}
                onClick={handleDelete}
                isLoading={isLoading && confirmDelete}
                className="modal-actions__delete"
              >
                {confirmDelete ? 'Confirm Delete' : 'Delete'}
              </Button>
            )}
            <div className="modal-actions__right">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="primary" isLoading={isLoading && !confirmDelete}>
                {isEditing ? 'Save Changes' : 'Create Task'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* ── Comments tab ──────────────────────────────────────────────────── */}
      {activeTab === 'comments' && isEditing && (
        <div role="tabpanel">
          <CommentSection taskId={task._id} />
        </div>
      )}

      {/* ── Attachments tab ───────────────────────────────────────────────── */}
      {activeTab === 'attachments' && isEditing && (
        <div role="tabpanel">
          <AttachmentSection taskId={task._id} />
        </div>
      )}

      {/* ── Activity tab ──────────────────────────────────────────────────── */}
      {activeTab === 'activity' && isEditing && (
        <div role="tabpanel">
          <ActivityLog taskId={task._id} />
        </div>
      )}
    </Modal>
  );
}

export default TaskModal;
