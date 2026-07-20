import React from 'react';
import Button from './Button';

function EmptyState({ title, description, actionLabel, onAction, icon = '📋' }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon-wrap" aria-hidden="true">
        <span className="empty-state__icon">{icon}</span>
      </div>
      <h3 className="empty-state__title">{title}</h3>
      {description && (
        <p className="empty-state__description">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="medium">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
