import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ApiError, NETWORK_ERROR_MESSAGE, roleLabel } from '../api';
import { useAuth } from '../auth/AuthContext';

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState('');

  if (!user) return null;

  async function handleLogout() {
    setBusy(true);
    setAlert('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      setAlert(error instanceof ApiError ? error.message : NETWORK_ERROR_MESSAGE);
      setBusy(false);
    }
  }

  const links = user.role === 'ORGANIZER'
    ? [{ to: '/organizer/events', label: 'My events' }, { to: '/events', label: 'Events' }]
    : [{ to: '/events', label: 'Events' }, { to: '/registrations', label: 'My registrations' }];

  return (
    <>
      <header className="app-header">
        <span className="brand">Event Planner</span>
        <nav aria-label="Main">
          {links.map((link) => <NavLink key={link.to} to={link.to} end>{link.label}</NavLink>)}
        </nav>
        <div className="account">
          <span className="user-name">{user.name}</span>
          <span className="role-badge">{roleLabel(user.role)}</span>
          <button type="button" className="secondary" onClick={handleLogout} disabled={busy}>
            {busy ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </header>
      {alert && <div className="alert page-alert" role="alert">{alert}</div>}
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
