import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { api, User } from './lib/api';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import MechanicDashboard from './pages/MechanicDashboard';
import PublicRepairRequestForm from './pages/PublicRepairRequestForm';
import { TrackRepair } from './pages/TrackRepair';
import { Toaster } from './components/ui/toaster';

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await api.getCurrentUser();
        setUser(currentUser);
      } catch {
        console.error('Not authenticated');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    await api.login(email, password);
    const currentUser = await api.getCurrentUser();
    setUser(currentUser);
  };

  const handleLogout = () => {
    api.clearToken();
    setUser(null);
  };

  const isPublicRoute = location.pathname === '/solicitar' || location.pathname === '/schedule' || location.pathname.startsWith('/track/');

  if (loading && !isPublicRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/solicitar" element={<PublicRepairRequestForm />} />
        <Route path="/schedule" element={<PublicRepairRequestForm />} />
        <Route path="/track/:token" element={<TrackRepair />} />
        <Route
          path="/"
          element={
            !user ? (
              <LoginPage onLogin={handleLogin} />
            ) : user.role === 'admin' ? (
              <AdminDashboard user={user} onLogout={handleLogout} />
            ) : user.role === 'cliente' ? (
              <ClientDashboard user={user} onLogout={handleLogout} />
            ) : user.role === 'mecanico' ? (
              <MechanicDashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
