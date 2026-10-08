import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (tokenStore.get()) {
        try {
          const { admin: a } = await api.me();
          if (alive) setAdmin(a);
        } catch { tokenStore.clear(); }
      }
      if (alive) setReady(true);
    })();
    const onLogout = () => setAdmin(null);
    const onPwd = () => setAdmin((a) => (a ? { ...a, mustChangePassword: true } : a));
    window.addEventListener('frameshop:logout', onLogout);
    window.addEventListener('frameshop:password-required', onPwd);
    return () => {
      alive = false;
      window.removeEventListener('frameshop:logout', onLogout);
      window.removeEventListener('frameshop:password-required', onPwd);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, admin: a } = await api.login(email, password);
    tokenStore.set(token);
    setAdmin(a);
    return a;
  }, []);

  const changePassword = useCallback(async (current, next) => {
    const { token, admin: a } = await api.changePassword(current, next);
    tokenStore.set(token);
    setAdmin(a);
  }, []);

  const logout = useCallback(() => { tokenStore.clear(); setAdmin(null); }, []);

  const value = useMemo(() => ({ admin, ready, login, logout, changePassword }), [admin, ready, login, logout, changePassword]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
