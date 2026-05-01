import React, { createContext, useState, useContext, useEffect } from 'react';
import auth from '@/api/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState({ id: null, public_settings: {} });

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    if (!auth.isAuthenticated()) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      return;
    }

    try {
      // Usa usuário em cache para resposta imediata
      const cached = auth.usuarioLocal();
      if (cached) {
        setUser(cached);
        setIsAuthenticated(true);
      }

      // Valida token com a API
      const usuario = await auth.me();
      setUser(usuario);
      setIsAuthenticated(true);
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);
      if (err.response?.status === 401) {
        setAuthError({ type: 'auth_required', message: 'Sessão expirada' });
      } else {
        setAuthError({ type: 'unknown', message: err.message });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    auth.logout(shouldRedirect ? window.location.href : undefined);
  };

  const navigateToLogin = () => {
    auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
