import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from '@/components/AppSidebar';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const AppLayout = ({ children, requireAdmin = false }: AppLayoutProps) => {
  const { isAuthenticated, isAdmin, carregando } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!carregando) {
      if (!isAuthenticated) navigate('/');
      else if (requireAdmin && !isAdmin) navigate('/sales');
    }
  }, [isAuthenticated, isAdmin, requireAdmin, navigate, carregando]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
};

export default AppLayout;
