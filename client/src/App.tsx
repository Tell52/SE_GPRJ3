import { Navigate, Route, Routes } from 'react-router-dom';
import { roleHome } from './api';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { EventsPage, EventDetailPage } from './events/EventPages';
import { CreateEventPage } from './events/CreateEventPage';
import { MyRegistrationsPage, RegistrationReceiptPage } from './registrations/RegistrationPages';

// The roster arrives in #6; unknown routes retain a simple fallback.
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
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route element={<ProtectedRoute role="PARTICIPANT" />}>
            <Route path="/registrations" element={<MyRegistrationsPage />} />
            <Route path="/registrations/:id" element={<RegistrationReceiptPage />} />
          </Route>
          <Route element={<ProtectedRoute role="ORGANIZER" />}>
            <Route path="/organizer/events" element={<EventsPage mine />} />
            <Route path="/organizer/events/new" element={<CreateEventPage />} />
            <Route path="/organizer/events/:id" element={<EventDetailPage organizer />} />
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
