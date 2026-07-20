import React, { useState, useEffect } from 'react';
import { STATUSES, PRIORITIES, SORT_OPTIONS } from '../../utils/constants';
import useDebounce from '../../hooks/useDebounce';
import Button from '../common/Button';

function SearchFilterBar({ filters, onFilterChange, onReset }) {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFilterChange({ search: debouncedSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const hasActiveFilters =
    filters.search || filters.status || filters.priority || filters.assignee;

  return (
    <div className="filter-bar" role="search" aria-label="Search and filter tasks">
      {/* Search */}
      <div className="filter-bar__search">
        <span className="filter-bar__search-icon" aria-hidden="true">🔍</span>
        <input
          type="search"
          className="filter-bar__input"
          placeholder="Search tasks…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search tasks by title or description"
        />
      </div>

      {/* Status */}
      <select
        className="filter-bar__select"
        value={filters.status}
        onChange={(e) => onFilterChange({ status: e.target.value })}
        aria-label="Filter by status"
      >
        <option value="">All Statuses</option>
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {/* Priority */}
      <select
        className="filter-bar__select"
        value={filters.priority}
        onChange={(e) => onFilterChange({ priority: e.target.value })}
        aria-label="Filter by priority"
      >
        <option value="">All Priorities</option>
        {PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      {/* Sort field */}
      <select
        className="filter-bar__select"
        value={filters.sortBy}
        onChange={(e) => onFilterChange({ sortBy: e.target.value })}
        aria-label="Sort tasks by"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Sort order */}
      <select
        className="filter-bar__select filter-bar__select--narrow"
        value={filters.order}
        onChange={(e) => onFilterChange({ order: e.target.value })}
        aria-label="Sort order"
      >
        <option value="desc">↓ Desc</option>
        <option value="asc">↑ Asc</option>
      </select>

      {/* Active-filter indicator + reset */}
      {hasActiveFilters && (
        <>
          <span className="filter-bar__active-indicator" aria-live="polite">
            <span aria-hidden="true">⚡</span> Filtered
          </span>
          <Button
            variant="ghost"
            size="small"
            onClick={() => { setSearchInput(''); onReset(); }}
            aria-label="Clear all filters"
          >
            ✕ Clear
          </Button>
        </>
      )}
    </div>
  );
}

export default SearchFilterBar;
