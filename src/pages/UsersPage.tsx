import { useState, useEffect } from 'react';
import { Shield, UserIcon, Edit2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { buscarPerfis, atualizarPerfil, atualizarPapel, criarLog, type Perfil } from '@/services/supabaseService';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

const UsersPage = () => {
  const { usuario } = useAuth();
  const [perfis, setPerfis] = useState<(Perfil & { papel?: string })[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<(Perfil & { papel?: string }) | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nome: '', papel: 'operador' as 'admin' | 'operador', ativo: true });

  const carregar = async () => {
    setCarregando(true);
    try {
      setPerfis(await buscarPerfis());
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
    setCarregando(false);
  };

  useEffect(() => { carregar(); }, []);

  const abrirEdicao = (p: Perfil & { papel?: string }) => {
    setEditando(p);
    setForm({ nome: p.nome, papel: (p.papel as 'admin' | 'operador') || 'operador', ativo: p.ativo });
    setModalOpen(true);
  };

  const handleSalvar = async () => {
    if (!editando) return;
    setSalvando(true);
    try {
      await atualizarPerfil(editando.user_id, { nome: form.nome, ativo: form.ativo });
      await atualizarPapel(editando.user_id, form.papel);
      await criarLog({
        tipo: 'usuario_atualizado',
        descricao: `Editou usuário: ${form.nome}`,
        usuario_id: usuario?.userId || '',
        usuario_nome: usuario?.nome || '',
      });
      toast.success('Usuário atualizado!');
      setModalOpen(false);
      carregar();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
    setSalvando(false);
  };

  return (
    <AppLayout requireAdmin>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground mt-1">{perfis.length} usuários cadastrados</p>
          <p className="text-xs text-muted-foreground mt-2">Novos usuários são criados pela tela de registro. Aqui você pode editar permissões.</p>
        </div>

        {carregando ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {perfis.map(p => (
              <div key={p.id} className="glass-card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold">
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </div>
                  </div>
                  <button onClick={() => abrirEdicao(p)} className="p-1.5 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${p.papel === 'admin' ? 'bg-gold/20 text-gold' : 'bg-primary/20 text-primary'}`}>
                    {p.papel === 'admin' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                    {p.papel === 'admin' ? 'Administrador' : 'Operador'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${p.ativo ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-foreground">Editar Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-foreground text-xs">Nome</Label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="bg-secondary border-border" />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground text-xs">Função</Label>
                <Select value={form.papel} onValueChange={v => setForm(f => ({ ...f, papel: v as 'admin' | 'operador' }))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="operador">Operador de Caixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-foreground text-xs">Ativo</Label>
                <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
              </div>
              <Button onClick={handleSalvar} disabled={salvando} className="w-full wine-gradient text-primary-foreground hover:opacity-90">
                {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default UsersPage;
