import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';

function CreateWorkspaceModal({ isOpen, onClose }) {
  const { createWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', description: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Workspace name is required.';
    else if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
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
    setIsLoading(true);
    const result = await createWorkspace(form);
    setIsLoading(false);
    if (result.success) {
      toast.success(`Workspace "${result.workspace.name}" created!`);
      setForm({ name: '', description: '' });
      onClose();
    } else {
      toast.error(result.message);
    }
  };

  const handleClose = () => {
    setForm({ name: '', description: '' });
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Workspace"
      titleIcon="🏢"
    >
      <form onSubmit={handleSubmit} noValidate>
        <Input
          id="ws-name"
          name="name"
          label="Workspace Name"
          placeholder="e.g. Product Team"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          required
          autoFocus
          icon="✦"
        />
        <div className="form-group">
          <label htmlFor="ws-desc" className="form-label">
            Description <span className="form-optional">(optional)</span>
          </label>
          <textarea
            id="ws-desc"
            name="description"
            className="form-input form-textarea"
            placeholder="What is this workspace for?"
            value={form.description}
            onChange={handleChange}
            rows={3}
            maxLength={500}
          />
        </div>
        <div className="modal-actions">
          <div className="modal-actions__right">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Create Workspace
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default CreateWorkspaceModal;
