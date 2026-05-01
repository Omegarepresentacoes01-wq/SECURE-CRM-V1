import React from 'react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Login from './pages/Login';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
const SuperAdminPage = Pages['SuperAdmin'];

// Páginas que NÃO precisam de layout (sidebar)
const PAGINAS_SEM_LAYOUT = ['Login', 'SuperAdmin'];

const LayoutWrapper = ({ children, currentPageName }) => {
  if (PAGINAS_SEM_LAYOUT.includes(currentPageName) || !Layout) {
    return <>{children}</>;
  }
  return <Layout currentPageName={currentPageName}>{children}</Layout>;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, user } = useAuth();
  const location = useLocation();

  const isLoginPage = location.pathname === '/Login';
  const isSuperAdmin = user?.role === 'super_admin';

  if ((isLoadingAuth || (isAuthenticated && !user)) && !isLoginPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/Login" element={<Login />} />

      <Route path="/SuperAdmin" element={
        !isAuthenticated
          ? <Navigate to="/Login" replace />
          : !isSuperAdmin
            ? <Navigate to="/Dashboard" replace />
            : <SuperAdminPage />
      } />

      <Route path="/" element={
        !isAuthenticated
          ? <Navigate to="/Login" replace />
          : isSuperAdmin
            ? <Navigate to="/SuperAdmin" replace />
            : <LayoutWrapper currentPageName={mainPageKey}><MainPage /></LayoutWrapper>
      } />

      {Object.entries(Pages)
        .filter(([path]) => !['Login', 'SuperAdmin'].includes(path))
        .map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              !isAuthenticated
                ? <Navigate to="/Login" replace />
                : isSuperAdmin
                  ? <Navigate to="/SuperAdmin" replace />
                  : <LayoutWrapper currentPageName={path}><Page /></LayoutWrapper>
            }
          />
        ))}

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace' }}>
          <h2 style={{ color: 'red' }}>Erro na aplicação</h2>
          <pre style={{ background: '#fee', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button onClick={() => { localStorage.clear(); window.location.href = '/'; }}
            style={{ marginTop: 16, padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: 6, cursor: 'pointer' }}>
            Limpar e recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="securecrm-theme">
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
