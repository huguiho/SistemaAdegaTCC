import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Wine, Mail, Lock, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import logo from "../assets/favicon.ico"
const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirecionar se já estiver logado
  if (isAuthenticated) {
    navigate('/dashboard');
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    const resultado = await login(email, senha);
    setCarregando(false);
    if (resultado.sucesso) {
      toast.success('Bem-vindo!');
      navigate('/dashboard');
    } else {
      toast.error(resultado.erro || 'Email ou senha incorretos');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
  <img
    src={logo}
    alt="Logo do Sistema"
    className="w-56 object-contain"
  />
</div>
          <h1 className="text-3xl font-display font-bold text-foreground">Adega<span className="gold-text">PDV</span></h1>
          <p className="text-muted-foreground mt-2">Sistema de Ponto de Venda</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="pl-10 bg-secondary border-border" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha" className="text-foreground">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" className="pl-10 bg-secondary border-border" required />
              </div>
            </div>
            <Button type="submit" disabled={carregando} className="w-full wine-gradient hover:opacity-90 text-primary-foreground font-semibold h-11">
              {carregando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
              Entrar
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Não tem conta?{' '}
              <Link to="/register" className="text-gold hover:text-gold-light transition-colors font-medium">Registre-se</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
