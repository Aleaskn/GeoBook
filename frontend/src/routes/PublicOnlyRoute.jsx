import { Navigate, Outlet } from 'react-router-dom';
import { PageState } from '../components/PageState.jsx';
import { useAuth } from '../hooks/useAuth.js';

export function PublicOnlyRoute() {
  const { status, sessionNotice } = useAuth();

  if (status === 'loading') {
    return <PageState title="Verifica della sessione" message="Accesso in corso…" />;
  }

  if (status === 'authenticated') {
    return (
      <Navigate
        to="/profile"
        replace
        state={sessionNotice ? { notice: sessionNotice } : undefined}
      />
    );
  }

  return <Outlet />;
}
