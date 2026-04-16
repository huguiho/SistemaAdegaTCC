import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buscarCategorias, salvarCategoria, excluirCategoria, criarLog, type Categoria } from '@/services/supabaseService';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

const Categories = () => {
  const { usuario } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nome: '', descricao: '', ativo: true });

  const carregar = async () => {
    setCarregando(true);
    try {
      setCategorias(await buscarCategorias());
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
    setCarregando(false);
  };

  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => {
    setEditando(null);
    setForm({ nome: '', descricao: '', ativo: true });
    setModalOpen(true);
  };

  const abrirEdicao = (c: Categoria) => {
    setEditando(c);
    setForm({ nome: c.nome, descricao: c.descricao || '', ativo: c.ativo });
    setModalOpen(true);
  };

  const handleSalvar = async () => {
    if (!form.nome) { toast.error('Preencha o nome'); return; }
    setSalvando(true);
    try {
      await salvarCategoria({
        ...(editando ? { id: editando.id } : {}),
        nome: form.nome,
        descricao: form.descricao || null,
        ativo: form.ativo,
      });
      await criarLog({
        tipo: editando ? 'categoria_atualizada' : 'categoria_criada',
        descricao: `${editando ? 'Editou' : 'Criou'} categoria: ${form.nome}`,
        usuario_id: usuario?.userId || '',
        usuario_nome: usuario?.nome || '',
      });
      toast.success(editando ? 'Categoria atualizada!' : 'Categoria criada!');
      setModalOpen(false);
      carregar();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
    setSalvando(false);
  };

  const handleExcluir = async (c: Categoria) => {
    if (!confirm(`Excluir categoria "${c.nome}"?`)) return;
    try {
      await excluirCategoria(c.id);
      toast.success('Categoria excluída');
      carregar();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  return (
    <AppLayout requireAdmin>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-primary" /> Categorias
            </h1>
            <p className="text-muted-foreground mt-1">{categorias.length} categorias cadastradas</p>
          </div>
          <Button onClick={abrirNovo} className="wine-gradient text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" /> Nova Categoria
          </Button>
        </div>

        {carregando ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorias.map(c => (
              <div key={c.id} className="glass-card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground text-lg">{c.nome}</p>
                    {c.descricao && <p className="text-xs text-muted-foreground mt-1">{c.descricao}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => abrirEdicao(c)} className="p-1.5 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleExcluir(c)} className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${c.ativo ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                  {c.ativo ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            ))}
          </div>
        )}

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-foreground">{editando ? 'Editar' : 'Nova'} Categoria</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-foreground text-xs">Nome</Label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="bg-secondary border-border" />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground text-xs">Descrição</Label>
                <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="bg-secondary border-border" placeholder="Descrição opcional" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-foreground text-xs">Ativa</Label>
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

export default Categories;
