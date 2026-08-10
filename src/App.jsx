import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { ThemeProvider } from '@/lib/ThemeContext';
import { ModeProvider } from '@/lib/ModeContext';
import Dashboard from '@/pages/Dashboard';
import PanicMode from '@/pages/PanicMode';
import Statistics from '@/pages/Statistics';
import Settings from '@/pages/Settings';
import Community from '@/pages/Community';
import AICoach from '@/pages/AICoach';
import Login from '@/pages/Welcome';
import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import SplashScreen from '@/components/SplashScreen';
import Onboarding from '@/pages/Onboarding';
import ErrorBoundary from '@/components/ErrorBoundary';
import AlarmSystem from '@/components/AlarmSystem';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated: isAuthed } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(t);
  }, []);

  if (isLoadingAuth || showSplash) {
    return (
      <>
        <SplashScreen />
        {isLoadingAuth && (
          <div className="fixed inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        )}
      </>
    );
  }

  return (
    <Routes>
      <Route path="/welcome" element={isAuthed ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/welcome" replace />} />}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/panic" element={<PanicMode />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/community" element={<Community />} />
          <Route path="/ai-coach" element={<AICoach />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
        <ThemeProvider>
          <ModeProvider>
            <Router>
              <ScrollToTop />
              <AlarmSystem>
                <AuthenticatedApp />
              </AlarmSystem>
            </Router>
            <Toaster />
          </ModeProvider>
        </ThemeProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
