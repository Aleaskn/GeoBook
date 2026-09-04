import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageState } from '../components/PageState.jsx';
import { useAuth } from '../hooks/useAuth.js';

export function ProtectedRoute() {
  const { status, retry, sessionNotice } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <PageState title="Verifica della sessione" message="Accesso in corso…" />;
  }

  if (status === 'error') {
    return (
      <PageState
        title="Sessione non disponibile"
        message="Non è stato possibile verificare la sessione. Controlla che il backend sia attivo."
        kind="error"
        action={{ label: 'Riprova', onClick: retry }}
      />
    );
  }

  if (status === 'anonymous') {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
          notice: sessionNotice ?? 'Effettua l’accesso per aprire questa pagina.',
        }}
      />
    );
  }

  return <Outlet />;
}
