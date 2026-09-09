import { Outlet } from 'react-router-dom';
import { PageState } from '../components/PageState.jsx';
import { useAuth } from '../hooks/useAuth.js';

export function AdminRoute() {
  const { user } = useAuth();

  if (user?.role !== 'ADMIN') {
    return (
      <PageState
        title="Area riservata"
        message="Questa pagina è accessibile soltanto agli amministratori."
        kind="error"
      />
    );
  }

  return <Outlet />;
}
