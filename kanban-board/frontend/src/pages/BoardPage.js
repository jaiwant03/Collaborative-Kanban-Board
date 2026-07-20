import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { useWorkspace } from '../context/WorkspaceContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/common/Layout';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import BoardColumn from '../components/board/BoardColumn';
import TaskModal from '../components/board/TaskModal';
import SearchFilterBar from '../components/board/SearchFilterBar';
import ChatPanel from '../components/board/ChatPanel';
import useTasks from '../hooks/useTasks';
import useModal from '../hooks/useModal';
import { BOARD_COLUMNS } from '../utils/constants';

function BoardPage() {
  const { activeWorkspace, getMemberRole } = useWorkspace();
  const { user }             = useAuth();
  const navigate             = useNavigate();
  const taskModal            = useModal();
  const [isSaving, setIsSaving] = useState(false);
  const [chatOpen, setChatOpen]   = useState(false);
  const [unread,   setUnread]     = useState(0);

  // Derive role — viewer gets read-only UI
  const userRole  = getMemberRole(user?._id);
  const isViewer  = userRole === 'viewer';

  const {
    tasks,
    isLoading,
    filters,
    createTask,
    updateTask,
    deleteTask,
    updateFilters,
    resetFilters,
    setTasksLocally,
  } = useTasks(activeWorkspace?._id);

  // ── WebSocket task sync ──────────────────────────────────────────────────────
  const { joinWorkspace, leaveWorkspace, subscribe } = useSocket();

  useEffect(() => {
    if (!activeWorkspace?._id) return;
    const wsId = activeWorkspace._id;
    joinWorkspace(wsId);
    return () => leaveWorkspace(wsId);
  }, [activeWorkspace?._id, joinWorkspace, leaveWorkspace]);

  // Stable handler refs so socket.off() always removes the right listener
  const onTaskCreated = useCallback(({ task }) => {
    setTasksLocally((prev) => prev.find((t) => t._id === task._id) ? prev : [task, ...prev]);
  }, [setTasksLocally]);

  const onTaskUpdated = useCallback(({ task }) => {
    setTasksLocally((prev) => prev.map((t) => t._id === task._id ? task : t));
  }, [setTasksLocally]);

  const onTaskDeleted = useCallback(({ taskId }) => {
    setTasksLocally((prev) => prev.filter((t) => t._id !== taskId));
  }, [setTasksLocally]);

  useEffect(() => {
    const unsubs = [
      subscribe('task:created', onTaskCreated),
      subscribe('task:updated', onTaskUpdated),
      subscribe('task:deleted', onTaskDeleted),
    ];
    return () => unsubs.forEach((fn) => fn && fn());
  }, [subscribe, onTaskCreated, onTaskUpdated, onTaskDeleted]);

  // Increment unread badge when a chat message arrives and panel is closed
  const onChatMessage = useCallback(() => {
    setChatOpen((open) => {
      if (!open) setUnread((n) => n + 1);
      return open;
    });
  }, []);

  useEffect(() => {
    return subscribe('chat:message', onChatMessage);
  }, [subscribe, onChatMessage]);

  // Redirect if no workspace — must be after hooks
  useEffect(() => {
    if (!activeWorkspace) navigate('/workspaces');
  }, [activeWorkspace, navigate]);

  // ── Drag-and-drop ────────────────────────────────────────────────────────────
  const handleDragEnd = useCallback(async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;

    const newStatus  = destination.droppableId;
    const prevStatus = source.droppableId;

    // Optimistic update
    setTasksLocally((prev) =>
      prev.map((t) => t._id === draggableId ? { ...t, status: newStatus } : t)
    );

    const res = await updateTask(draggableId, { status: newStatus });
    if (!res.success) {
      // Revert on failure
      setTasksLocally((prev) =>
        prev.map((t) => t._id === draggableId ? { ...t, status: prevStatus } : t)
      );
    }
  }, [updateTask, setTasksLocally]);

  const handleAddTask  = useCallback((status) => taskModal.open({ status }), [taskModal]);
  const handleTaskClick = useCallback((task)   => taskModal.open(task),       [taskModal]);

  const handleSave = useCallback(async (formData) => {
    setIsSaving(true);
    const editingTask = taskModal.modalData;
    const isEdit = editingTask?._id;

    let result;
    if (isEdit) {
      result = await updateTask(editingTask._id, formData);
    } else {
      const status = formData.status || editingTask?.status || 'todo';
      result = await createTask({ ...formData, status });
    }

    setIsSaving(false);
    if (result.success) taskModal.close();
  }, [taskModal, updateTask, createTask]);

  const handleDelete = useCallback(async (id) => {
    setIsSaving(true);
    await deleteTask(id);
    setIsSaving(false);
    taskModal.close();
  }, [deleteTask, taskModal]);

  // ── Render ───────────────────────────────────────────────────────────────────
  if (!activeWorkspace) return null;

  const tasksByStatus = BOARD_COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter((t) => t.status === col.id);
    return acc;
  }, {});

  const modalTask    = taskModal.modalData?._id ? taskModal.modalData : null;
  const modalDefault = !modalTask && taskModal.modalData ? taskModal.modalData : null;

  return (
    <Layout>
      <div className="page">
        {/* Header */}
        <div className="page__header">
          <div>
            <h1 className="page__title">{activeWorkspace.name}</h1>
            <p className="page__subtitle">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              {tasks.some((t) => t.isOverdue) && (
                <span className="page__overdue-badge">
                  · {tasks.filter((t) => t.isOverdue).length} overdue
                </span>
              )}
            </p>
          </div>
          {!isViewer && (
            <button
              className="btn btn--primary btn--medium"
              onClick={() => handleAddTask('todo')}
            >
              + Add Task
            </button>
          )}
        </div>

        {/* Filter bar */}
        <SearchFilterBar
          filters={filters}
          onFilterChange={updateFilters}
          onReset={resetFilters}
        />

        {/* Board */}
        {isLoading && tasks.length === 0 ? (
          <div className="page__loading">
            <Spinner size="large" />
          </div>
        ) : tasks.length === 0 && (filters.search || filters.status || filters.priority) ? (
          <EmptyState
            icon="🔍"
            title="No tasks match your filters"
            description="Try adjusting your search or filter criteria."
            actionLabel="Clear Filters"
            onAction={resetFilters}
          />
        ) : (
          <DragDropContext onDragEnd={isViewer ? () => {} : handleDragEnd}>
            <div className="board">
              {BOARD_COLUMNS.map((col) => (
                <BoardColumn
                  key={col.id}
                  column={col}
                  tasks={tasksByStatus[col.id] || []}
                  onTaskClick={handleTaskClick}
                  onAddTask={handleAddTask}
                  isLoading={isLoading}
                  isViewer={isViewer}
                />
              ))}
            </div>
          </DragDropContext>
        )}

        {/* Task modal */}
        <TaskModal
          isOpen={taskModal.isOpen}
          onClose={taskModal.close}
          task={
            modalTask
              ? { ...modalTask }
              : modalDefault
                ? { status: modalDefault.status }
                : null
          }
          onSave={handleSave}
          onDelete={handleDelete}
          isLoading={isSaving}
        />

        {/* Chat panel (slides up from bottom-right) */}
        <ChatPanel
          workspaceId={activeWorkspace._id}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />

        {/* Chat toggle FAB — hidden when panel is open */}
        {!chatOpen && (
          <button
            className="chat-toggle-btn"
            onClick={() => { setChatOpen(true); setUnread(0); }}
            aria-label="Open team chat"
            title="Team Chat"
          >
            💬
            {unread > 0 && (
              <span className="chat-toggle-btn__badge" aria-label={`${unread} unread messages`}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        )}
      </div>
    </Layout>
  );
}

export default BoardPage;
