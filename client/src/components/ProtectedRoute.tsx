import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { roleHome, type Role } from '../api';
import { useAuth } from '../auth/AuthContext';

/** Convenience only: the API enforces every permission. */
export function ProtectedRoute({ role }: { role?: Role }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <p className="page">Loading...</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <AccessDenied home={roleHome(user.role)} />;
  return <Outlet />;
}

export function AccessDenied({ home }: { home: string }) {
  return (
    <section className="page">
      <h1>Access denied</h1>
      <p>You do not have access to this page.</p>
      <Link to={home}>Go to your home page</Link>
    </section>
  );
}
