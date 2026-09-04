import { useContext } from 'react';
import { AuthContext } from '../context/auth-context.js';

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve essere usato all’interno di AuthProvider.');
  }

  return context;
}
