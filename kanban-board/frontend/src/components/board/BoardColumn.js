import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import Spinner from '../common/Spinner';

const COLUMN_ICONS = {
  todo:        '○',
  in_progress: '◑',
  review:      '◕',
  done:        '●',
};

/**
 * BoardColumn
 *
 * Props:
 *   column     object   — { id, title, colorClass }
 *   tasks      array    — tasks in this column
 *   onTaskClick fn      — open task detail
 *   onAddTask   fn      — open create task modal
 *   isLoading   bool
 *   isViewer    bool    — when true: hide add button, disable drag handles
 */
function BoardColumn({ column, tasks, onTaskClick, onAddTask, isLoading, isViewer = false }) {
  return (
    <section className={`board-column ${column.colorClass}`} aria-label={column.title}>
      {/* ── Column header ─────────────────────────────────────────────────── */}
      <div className="board-column__header">
        <div className="board-column__title-row">
          <span className="board-column__icon" aria-hidden="true">
            {COLUMN_ICONS[column.id] ?? '○'}
          </span>
          <h3 className="board-column__title">{column.title}</h3>
          <span
            className="board-column__count"
            aria-label={`${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
          >
            {tasks.length}
          </span>
        </div>

        {/* Hide the + button for viewers */}
        {!isViewer && (
          <button
            className="board-column__add-btn"
            onClick={() => onAddTask(column.id)}
            aria-label={`Add task to ${column.title}`}
            title={`Add to ${column.title}`}
          >
            +
          </button>
        )}
      </div>

      {/* ── Droppable tasks list ──────────────────────────────────────────── */}
      <Droppable droppableId={column.id} type="TASK">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`board-column__tasks${snapshot.isDraggingOver ? ' board-column__tasks--over' : ''}`}
            role="list"
          >
            {isLoading ? (
              <div className="board-column__loading">
                <Spinner size="small" />
              </div>
            ) : (
              <>
                {tasks.length === 0 && !snapshot.isDraggingOver && (
                  <div className="board-column__empty" aria-label="No tasks">
                    <span className="board-column__empty-icon" aria-hidden="true">📭</span>
                    <p>No tasks here</p>
                  </div>
                )}

                {tasks.map((task, index) => (
                  <Draggable
                    key={task._id}
                    draggableId={task._id}
                    index={index}
                    isDragDisabled={isViewer}
                  >
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...(!isViewer ? dragProvided.dragHandleProps : {})}
                        role="listitem"
                        style={dragProvided.draggableProps.style}
                        className={[
                          'board-column__item',
                          dragSnapshot.isDragging  ? 'task-card-dragging' : '',
                          !isViewer && !dragSnapshot.isDragging ? 'task-card-grab' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <TaskCard
                          task={task}
                          onClick={onTaskClick}
                          isDragging={dragSnapshot.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
              </>
            )}

            {/* placeholder keeps the column height stable while dragging */}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </section>
  );
}

export default BoardColumn;
