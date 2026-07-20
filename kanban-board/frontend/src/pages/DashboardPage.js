import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import Layout from '../components/common/Layout';
import Spinner from '../components/common/Spinner';
import StatCard from '../components/dashboard/StatCard';
import StatusChart from '../components/dashboard/StatusChart';
import PriorityChart from '../components/dashboard/PriorityChart';
import RecentTasks from '../components/dashboard/RecentTasks';
import Button from '../components/common/Button';
import useDashboard from '../hooks/useDashboard';

function DashboardPage() {
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { stats, isLoading, refetch } = useDashboard(activeWorkspace?._id);

  useEffect(() => {
    if (!activeWorkspace) navigate('/workspaces');
  }, [activeWorkspace, navigate]);

  if (!activeWorkspace) return null;

  return (
    <Layout>
      <div className="page">
        {/* Header */}
        <div className="page__header">
          <div>
            <h1 className="page__title">Dashboard</h1>
            <p className="page__subtitle">{activeWorkspace.name} — Overview</p>
          </div>
          <div className="page__header-actions">
            <Button
              variant="ghost"
              size="small"
              onClick={refetch}
              isLoading={isLoading}
              disabled={isLoading}
              aria-label="Refresh dashboard data"
            >
              {isLoading ? 'Refreshing…' : '↻ Refresh'}
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={() => navigate('/board')}
            >
              Open Board
            </Button>
          </div>
        </div>

        {/* Full-page loading on first load */}
        {isLoading && !stats ? (
          <div className="page__loading">
            <Spinner size="large" />
          </div>
        ) : stats ? (
          <>
            {/* ── Stat cards ── */}
            <div className="stats-grid">
              <StatCard
                title="Total Tasks"
                value={stats.totalTasks}
                icon="📋"
                colorClass="stat-card--blue"
              />
              <StatCard
                title="To Do"
                value={stats.tasksByStatus?.todo ?? 0}
                icon="○"
                colorClass="stat-card--purple"
              />
              <StatCard
                title="In Progress"
                value={stats.tasksByStatus?.in_progress ?? 0}
                icon="⚡"
                colorClass="stat-card--orange"
              />
              <StatCard
                title="Under Review"
                value={stats.tasksByStatus?.review ?? 0}
                icon="👁️"
                colorClass="stat-card--yellow"
              />
              <StatCard
                title="Completed"
                value={stats.tasksByStatus?.done ?? 0}
                icon="✅"
                colorClass="stat-card--green"
              />
              <StatCard
                title="Overdue"
                value={stats.overdueTasks}
                icon="🔴"
                colorClass={stats.overdueTasks > 0 ? 'stat-card--red' : 'stat-card--green'}
                subtitle={stats.overdueTasks > 0 ? 'Needs attention' : 'All on track'}
              />
              <StatCard
                title="My Tasks"
                value={stats.myTasksCount}
                icon="👤"
                colorClass="stat-card--cyan"
              />
            </div>

            {/* ── Charts ── */}
            <div className="charts-grid">
              <StatusChart
                tasksByStatus={stats.tasksByStatus}
                total={stats.totalTasks}
              />
              <PriorityChart
                tasksByPriority={stats.tasksByPriority}
                total={stats.totalTasks}
              />
            </div>

            {/* ── Recent tasks ── */}
            <RecentTasks tasks={stats.recentTasks} />
          </>
        ) : (
          <p className="page__empty">No data available. Create a task to get started.</p>
        )}
      </div>
    </Layout>
  );
}

export default DashboardPage;
