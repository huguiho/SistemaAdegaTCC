import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buscarProdutos, salvarProduto, excluirProduto, buscarCategorias, criarLog, type Produto, type Categoria } from '@/services/supabaseService';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const ITEMS_PER_PAGE = 10;

const Products = () => {
  const { usuario } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const [sortBy, setSortBy] = useState<'nome' | 'preco' | 'estoque'>('nome');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    nome: '', codigo_barras: '', categoria_id: '', preco_custo: 0, preco_venda: 0,
    estoque: 0, estoque_minimo: 5, ativo: true,
  });

  const carregar = async () => {
    setCarregando(true);
    try {
      const [prods, cats] = await Promise.all([buscarProdutos(), buscarCategorias()]);
      setProdutos(prods);
      setCategorias(cats);
    } catch (e: any) {
      toast.error('Erro ao carregar produtos: ' + e.message);
    }
    setCarregando(false);
  };

  useEffect(() => { carregar(); }, []);

  const filtrados = useMemo(() => {
    let lista = produtos;
    if (search) {
      const q = search.toLowerCase();
      lista = lista.filter(p => p.nome.toLowerCase().includes(q) || (p.codigo_barras || '').includes(q));
    }
    if (filtroCategoria !== 'Todos') {
      lista = lista.filter(p => p.categoria_id === filtroCategoria);
    }
    lista = [...lista].sort((a, b) => {
      if (sortBy === 'nome') return a.nome.localeCompare(b.nome);
      if (sortBy === 'preco') return b.preco_venda - a.preco_venda;
      return a.estoque - b.estoque;
    });
    return lista;
  }, [produtos, search, filtroCategoria, sortBy]);

  const totalPages = Math.ceil(filtrados.length / ITEMS_PER_PAGE);
  const paginados = filtrados.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const abrirNovo = () => {
    setEditando(null);
    setForm({ nome: '', codigo_barras: '', categoria_id: categorias[0]?.id || '', preco_custo: 0, preco_venda: 0, estoque: 0, estoque_minimo: 5, ativo: true });
    setModalOpen(true);
  };

  const abrirEdicao = (p: Produto) => {
    setEditando(p);
    setForm({
      nome: p.nome, codigo_barras: p.codigo_barras || '', categoria_id: p.categoria_id || '',
      preco_custo: p.preco_custo, preco_venda: p.preco_venda, estoque: p.estoque,
      estoque_minimo: p.estoque_minimo, ativo: p.ativo,
    });
    setModalOpen(true);
  };

  const handleSalvar = async () => {
    if (!form.nome) { toast.error('Preencha o nome do produto'); return; }
    setSalvando(true);
    try {
      await salvarProduto({
        ...(editando ? { id: editando.id } : {}),
        nome: form.nome,
        codigo_barras: form.codigo_barras || null,
        categoria_id: form.categoria_id || null,
        preco_custo: form.preco_custo,
        preco_venda: form.preco_venda,
        estoque: form.estoque,
        estoque_minimo: form.estoque_minimo,
        ativo: form.ativo,
      });
      await criarLog({
        tipo: editando ? 'produto_atualizado' : 'produto_criado',
        descricao: `${editando ? 'Editou' : 'Criou'} produto: ${form.nome}`,
        usuario_id: usuario?.userId || '',
        usuario_nome: usuario?.nome || '',
      });
      toast.success(editando ? 'Produto atualizado!' : 'Produto criado!');
      setModalOpen(false);
      carregar();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
    setSalvando(false);
  };

  const handleExcluir = async (p: Produto) => {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    try {
      await excluirProduto(p.id);
      await criarLog({
        tipo: 'produto_excluido',
        descricao: `Excluiu produto: ${p.nome}`,
        usuario_id: usuario?.userId || '',
        usuario_nome: usuario?.nome || '',
      });
      toast.success('Produto excluído');
      carregar();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  const margem = form.preco_custo > 0 ? ((form.preco_venda - form.preco_custo) / form.preco_custo) * 100 : 0;

  return (
    <AppLayout requireAdmin>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Produtos</h1>
            <p className="text-muted-foreground mt-1">{produtos.length} produtos cadastrados</p>
          </div>
          <Button onClick={abrirNovo} className="wine-gradient text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" /> Novo Produto
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por nome ou código..." className="pl-10 bg-secondary border-border" />
          </div>
          <Select value={filtroCategoria} onValueChange={v => { setFiltroCategoria(v); setPage(1); }}>
            <SelectTrigger className="w-[180px] bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="Todos">Todas Categorias</SelectItem>
              {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[150px] bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="nome">Nome</SelectItem>
              <SelectItem value="preco">Preço</SelectItem>
              <SelectItem value="estoque">Estoque</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {carregando ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Produto</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Código</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Categoria</th>
                    <th className="px-4 py-3 text-right text-xs text-muted-foreground font-medium">Custo</th>
                    <th className="px-4 py-3 text-right text-xs text-muted-foreground font-medium">Venda</th>
                    <th className="px-4 py-3 text-right text-xs text-muted-foreground font-medium">Margem</th>
                    <th className="px-4 py-3 text-right text-xs text-muted-foreground font-medium">Estoque</th>
                    <th className="px-4 py-3 text-center text-xs text-muted-foreground font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-xs text-muted-foreground font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginados.map(p => {
                    const m = p.preco_custo > 0 ? ((p.preco_venda - p.preco_custo) / p.preco_custo) * 100 : 0;
                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-foreground font-medium">{p.nome}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{p.codigo_barras || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{p.categoria_nome}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-muted-foreground">R$ {p.preco_custo.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gold font-medium">R$ {p.preco_venda.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right text-success">{m.toFixed(1)}%</td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${p.estoque <= p.estoque_minimo ? 'text-destructive' : 'text-foreground'}`}>{p.estoque}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded ${p.ativo ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                            {p.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => abrirEdicao(p)} className="p-1.5 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleExcluir(p)} className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">{filtrados.length} resultados</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronLeft className="w-4 h-4 text-foreground" /></button>
                  <span className="text-sm text-foreground">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronRight className="w-4 h-4 text-foreground" /></button>
                </div>
              </div>
            )}
          </div>
        )}

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-foreground">{editando ? 'Editar' : 'Novo'} Produto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-foreground text-xs">Nome</Label>
                  <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="bg-secondary border-border" />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Código de Barras</Label>
                  <Input value={form.codigo_barras} onChange={e => setForm(f => ({ ...f, codigo_barras: e.target.value }))} className="bg-secondary border-border" />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Categoria</Label>
                  <Select value={form.categoria_id} onValueChange={v => setForm(f => ({ ...f, categoria_id: v }))}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {categorias.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Preço de Custo</Label>
                  <Input type="number" value={form.preco_custo || ''} onChange={e => setForm(f => ({ ...f, preco_custo: parseFloat(e.target.value) || 0 }))} className="bg-secondary border-border" min={0} step={0.01} />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Preço de Venda</Label>
                  <Input type="number" value={form.preco_venda || ''} onChange={e => setForm(f => ({ ...f, preco_venda: parseFloat(e.target.value) || 0 }))} className="bg-secondary border-border" min={0} step={0.01} />
                </div>
                <div className="col-span-2 p-2 rounded bg-secondary/50 text-sm text-muted-foreground">
                  Margem de lucro: <span className={`font-bold ${margem > 0 ? 'text-success' : 'text-destructive'}`}>{margem.toFixed(1)}%</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Estoque Atual</Label>
                  <Input type="number" value={form.estoque || ''} onChange={e => setForm(f => ({ ...f, estoque: parseInt(e.target.value) || 0 }))} className="bg-secondary border-border" min={0} />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Estoque Mínimo</Label>
                  <Input type="number" value={form.estoque_minimo || ''} onChange={e => setForm(f => ({ ...f, estoque_minimo: parseInt(e.target.value) || 0 }))} className="bg-secondary border-border" min={0} />
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <Label className="text-foreground text-xs">Produto Ativo</Label>
                  <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
                </div>
              </div>
              <Button onClick={handleSalvar} disabled={salvando} className="w-full wine-gradient text-primary-foreground hover:opacity-90">
                {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Salvar Produto
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Products;
