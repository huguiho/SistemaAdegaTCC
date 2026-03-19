import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface PerfilUsuario {
  id: string;
  userId: string;
  nome: string;
  email: string;
  papel: 'admin' | 'operador';
  ativo: boolean;
}

interface AuthContextType {
  session: Session | null;
  usuario: PerfilUsuario | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<{ sucesso: boolean; erro?: string }>;
  registrar: (nome: string, email: string, senha: string) => Promise<{ sucesso: boolean; erro?: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<PerfilUsuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregarPerfil = async (user: User) => {
    const { data: perfil } = await supabase
      .from('perfis')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: papelData } = await supabase
      .from('papeis_usuarios')
      .select('papel')
      .eq('user_id', user.id)
      .single();

    if (perfil) {
      setUsuario({
        id: perfil.id,
        userId: perfil.user_id,
        nome: perfil.nome,
        email: perfil.email,
        papel: papelData?.papel || 'operador',
        ativo: perfil.ativo,
      });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          setTimeout(() => carregarPerfil(session.user), 0);
        } else {
          setUsuario(null);
        }
        setCarregando(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        carregarPerfil(session.user);
      }
      setCarregando(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, senha: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password: senha });
    
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        return { sucesso: false, erro: 'Email não confirmado. Verifique sua caixa de entrada.' };
      }
      return { sucesso: false, erro: error.message };
    }

    // Log de atividade
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: perfil } = await supabase.from('perfis').select('nome').eq('user_id', user.id).single();
      await supabase.from('logs_atividade').insert({
        tipo: 'login',
        descricao: `${perfil?.nome || email} fez login`,
        usuario_id: user.id,
        usuario_nome: perfil?.nome || email,
      });
    }

    return { sucesso: true };
  };

  const registrar = async (nome: string, email: string, senha: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });
    if (error) return { sucesso: false, erro: error.message };

    // Se o email precisa ser confirmado, não navegar automaticamente
    // O papel será atribuído quando o usuário confirmar o email e fizer login
    if (data.user && !data.session) {
      // Email confirmation required - papel será criado após confirmação
      // Tentamos criar o papel agora, mas se falhar, o trigger criará depois
      try {
        await supabase.from('papeis_usuarios').insert({
          user_id: data.user.id,
          papel: 'operador',
        });
      } catch (e) {
        console.log('Papel será atribuído após confirmação');
      }
    } else if (data.user && data.session) {
      // Auto-confirm está ativado
      setTimeout(async () => {
        await supabase.from('papeis_usuarios').insert({
          user_id: data.user!.id,
          papel: 'operador',
        });
      }, 1000);
    }

    return { sucesso: true };
  };

  const logout = async () => {
    if (usuario) {
      await supabase.from('logs_atividade').insert({
        tipo: 'logout',
        descricao: `${usuario.nome} fez logout`,
        usuario_id: usuario.userId,
        usuario_nome: usuario.nome,
      });
    }
    await supabase.auth.signOut();
    setSession(null);
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{
      session,
      usuario,
      carregando,
      login,
      registrar,
      logout,
      isAdmin: usuario?.papel === 'admin',
      isAuthenticated: !!session && !!usuario,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
