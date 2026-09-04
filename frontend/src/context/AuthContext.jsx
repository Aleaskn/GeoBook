import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from '../api/auth-api.js';
import { ApiError } from '../api/api-client.js';
import { AuthContext } from './auth-context.js';

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    status: 'loading',
    user: null,
    error: null,
    sessionNotice: null,
  });

  const loadSession = useCallback(async () => {
    setState({ status: 'loading', user: null, error: null, sessionNotice: null });

    try {
      const user = await getCurrentUser();
      setState({ status: 'authenticated', user, error: null, sessionNotice: null });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setState({ status: 'anonymous', user: null, error: null, sessionNotice: null });
        return;
      }

      setState({ status: 'error', user: null, error, sessionNotice: null });
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const login = useCallback(async (credentials) => {
    const user = await loginRequest(credentials);
    setState({
      status: 'authenticated',
      user,
      error: null,
      sessionNotice: 'Accesso effettuato.',
    });
    return user;
  }, []);

  const register = useCallback(async (account) => {
    const user = await registerRequest(account);
    setState({
      status: 'authenticated',
      user,
      error: null,
      sessionNotice: 'Registrazione completata. Benvenuto in GeoBook!',
    });
    return user;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    // Il messaggio permette ai guard di conservare l'esito anche se reagiscono prima della pagina.
    setState({
      status: 'anonymous',
      user: null,
      error: null,
      sessionNotice: 'Disconnessione completata.',
    });
  }, []);

  const updateUser = useCallback((user) => {
    setState({ status: 'authenticated', user, error: null, sessionNotice: null });
  }, []);

  const clearSession = useCallback(() => {
    setState({ status: 'anonymous', user: null, error: null, sessionNotice: null });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      login,
      register,
      logout,
      updateUser,
      clearSession,
      retry: loadSession,
    }),
    [clearSession, loadSession, login, logout, register, state, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
