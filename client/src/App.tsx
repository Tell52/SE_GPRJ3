import { Navigate, Route, Routes } from 'react-router-dom';
import { roleHome } from './api';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';

// Placeholders until the feature screens arrive in #4 (events), #5 (registrations) and #6 (roster).
function Placeholder({ title, text }: { title: string; text: string }) {
  return <section><h1>{title}</h1><p>{text}</p></section>;
}

function RoleHomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? roleHome(user.role) : '/login'} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<RoleHomeRedirect />} />
          <Route path="/events" element={<Placeholder title="Events" text="No upcoming events" />} />
          <Route element={<ProtectedRoute role="PARTICIPANT" />}>
            <Route path="/registrations" element={<Placeholder title="My registrations" text="You have not registered for any events" />} />
          </Route>
          <Route element={<ProtectedRoute role="ORGANIZER" />}>
            <Route path="/organizer/events" element={<Placeholder title="My events" text="You have not created any events yet" />} />
          </Route>
          <Route path="*" element={<Placeholder title="Page not found" text="This page does not exist." />} />
        </Route>
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
