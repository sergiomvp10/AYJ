import { useState, useEffect } from 'react';
import { api, User } from './lib/api';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import MechanicDashboard from './pages/MechanicDashboard';
import { Toaster } from './components/ui/toaster';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      {user.role === 'admin' && <AdminDashboard user={user} onLogout={handleLogout} />}
      {user.role === 'cliente' && <ClientDashboard user={user} onLogout={handleLogout} />}
      {user.role === 'mecanico' && <MechanicDashboard user={user} onLogout={handleLogout} />}
      <Toaster />
    </>
  );
}

export default App;
