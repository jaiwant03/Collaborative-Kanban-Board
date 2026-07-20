import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTheme } from '../../context/ThemeContext';
import { getInitials } from '../../utils/formatters';
import InviteModal from '../workspace/InviteModal';

const NAV_ICONS = {
  '/workspaces': '🏢',
  '/board':      '📋',
  '/dashboard':  '📊',
};

function Navbar() {
  const { user, logout }          = useAuth();
  const { activeWorkspace }       = useWorkspace();
  const { resolved, toggleTheme } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [inviteOpen,  setInviteOpen]  = useState(false);

  const userMenuRef = useRef(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const myRole = React.useMemo(() => {
    if (!activeWorkspace || !user) return null;
    const membership = activeWorkspace.members?.find(
      (m) => (m.user?._id || m.user?.toString?.()) === user._id?.toString()
    );
    return membership?.role ?? null;
  }, [activeWorkspace, user]);

  const canInvite = myRole && ['owner', 'admin', 'manager'].includes(myRole);

  const handleLogout = async () => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/workspaces', label: 'Workspaces' },
    ...(activeWorkspace
      ? [
          { to: '/board',     label: 'Board'     },
          { to: '/dashboard', label: 'Dashboard' },
        ]
      : []),
  ];

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Main navigation">

        {/* ── Brand ──────────────────────────────────────────────────────── */}
        <div className="navbar__brand">
          <Link to="/workspaces" className="navbar__logo" aria-label="Collaborative Kanban Board home">
            <img
              src="/Kanban login logo.png"
              alt="Collaborative Kanban Board"
              className="navbar__logo-img"
            />
            <span className="navbar__logo-text">Collaborative Kanban Board</span>
          </Link>

          {activeWorkspace && (
            <div
              className="navbar__workspace-pill"
              aria-label={`Active workspace: ${activeWorkspace.name}`}
            >
              <span className="navbar__workspace-dot" aria-hidden="true" />
              <span className="navbar__workspace-name">{activeWorkspace.name}</span>
            </div>
          )}
        </div>

        {/* ── Desktop nav links ───────────────────────────────────────────── */}
        <ul className="navbar__links">
          {navLinks.map(({ to, label }) => (
            <li key={to}>
              <Link
                to={to}
                className={`navbar__link${location.pathname === to ? ' navbar__link--active' : ''}`}
              >
                <span className="navbar__link-icon" aria-hidden="true">{NAV_ICONS[to]}</span>
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* ── Right-side controls ────────────────────────────────────────── */}
        <div className="navbar__controls">

          {/* Invite button */}
          {canInvite && activeWorkspace && (
            <button
              className="navbar__invite-btn"
              onClick={() => setInviteOpen(true)}
              aria-label="Invite team members"
              title="Invite Members"
            >
              <span aria-hidden="true">👥</span>
              <span className="navbar__invite-label">Invite</span>
            </button>
          )}

          {/* Theme toggle */}
          <button
            className="navbar__theme-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}
            title={`${resolved === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {resolved === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* User avatar + dropdown */}
          <div className="navbar__user" ref={userMenuRef}>
            <button
              className="navbar__avatar"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-label="Open user menu"
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
            >
              {getInitials(user?.name)}
            </button>

            {userMenuOpen && (
              <div className="navbar__dropdown" role="menu">
                <div className="navbar__dropdown-info">
                  <strong>{user?.name}</strong>
                  <small>{user?.email}</small>
                  {myRole && (
                    <small style={{ textTransform: 'capitalize', color: 'var(--primary)', fontWeight: 600 }}>
                      {myRole}
                    </small>
                  )}
                </div>
                <button
                  className="navbar__dropdown-item navbar__dropdown-item--danger"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <span aria-hidden="true">🚪</span> Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            className={`navbar__hamburger${mobileOpen ? ' navbar__hamburger--open' : ''}`}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="navbar__mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        id="mobile-menu"
        className={`navbar__mobile-menu${mobileOpen ? ' navbar__mobile-menu--open' : ''}`}
        role="navigation"
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
      >
        {/* User info header */}
        <div className="navbar__mobile-user">
          <div className="navbar__mobile-avatar">{getInitials(user?.name)}</div>
          <div className="navbar__mobile-user-info">
            <strong>{user?.name}</strong>
            <small>{user?.email}</small>
            {myRole && (
              <small className="navbar__mobile-role">{myRole}</small>
            )}
          </div>
        </div>

        {/* Workspace pill in drawer */}
        {activeWorkspace && (
          <div className="navbar__mobile-workspace">
            <span className="navbar__workspace-dot" aria-hidden="true" />
            <span>{activeWorkspace.name}</span>
          </div>
        )}

        {/* Divider */}
        <div className="navbar__mobile-divider" />

        {/* Nav links */}
        <ul className="navbar__mobile-links">
          {navLinks.map(({ to, label }) => (
            <li key={to}>
              <Link
                to={to}
                className={`navbar__mobile-link${location.pathname === to ? ' navbar__mobile-link--active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <span className="navbar__mobile-link-icon" aria-hidden="true">{NAV_ICONS[to]}</span>
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Divider */}
        <div className="navbar__mobile-divider" />

        {/* Action buttons */}
        <div className="navbar__mobile-actions">
          {canInvite && activeWorkspace && (
            <button
              className="navbar__mobile-action-btn"
              onClick={() => { setMobileOpen(false); setInviteOpen(true); }}
            >
              <span aria-hidden="true">👥</span>
              <span>Invite Members</span>
            </button>
          )}

          <button
            className="navbar__mobile-action-btn"
            onClick={() => { toggleTheme(); }}
          >
            <span aria-hidden="true">{resolved === 'dark' ? '☀️' : '🌙'}</span>
            <span>{resolved === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            className="navbar__mobile-action-btn navbar__mobile-action-btn--danger"
            onClick={handleLogout}
          >
            <span aria-hidden="true">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <InviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}

export default Navbar;
