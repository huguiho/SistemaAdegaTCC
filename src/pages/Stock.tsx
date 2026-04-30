import { useState, useEffect } from 'react';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buscarProdutos, buscarMovimentacoes, criarMovimentacao, atualizarEstoqueProduto, criarLog, type Produto, type MovimentacaoEstoque } from '@/services/supabaseService';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TipoMovimentacao = 'entrada' | 'saida' | 'ajuste';

const Stock = () => {
  const { usuario } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [tipo, setTipo] = useState<TipoMovimentacao>('entrada');
  const [quantidade, setQuantidade] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    try {
      const [prods, movs] = await Promise.all([buscarProdutos(), buscarMovimentacoes()]);
      setProdutos(prods);
      setMovimentacoes(movs);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
    setCarregando(false);
  };

  useEffect(() => { carregar(); }, []);

  const estoqueBaixo = produtos.filter(p => p.ativo && p.estoque <= p.estoque_minimo);

  const handleMovimentacao = async () => {
    const produto = produtos.find(p => p.id === produtoSelecionado);
    if (!produto) { toast.error('Selecione um produto'); return; }
    if (quantidade <= 0 && tipo !== 'ajuste') { toast.error('Quantidade inválida'); return; }

    setSalvando(true);
    try {
      let novoEstoque = produto.estoque;
      if (tipo === 'entrada') novoEstoque += quantidade;
      else if (tipo === 'saida') novoEstoque = Math.max(0, novoEstoque - quantidade);
      else novoEstoque = quantidade;

      await criarMovimentacao({
        produto_id: produto.id,
        produto_nome: produto.nome,
        tipo,
        quantidade: tipo === 'ajuste' ? Math.abs(quantidade - produto.estoque) : quantidade,
        estoque_anterior: produto.estoque,
        estoque_novo: novoEstoque,
        motivo: motivo || (tipo === 'entrada' ? 'Entrada de mercadoria' : tipo === 'saida' ? 'Saída manual' : 'Ajuste de estoque'),
        usuario_id: usuario?.userId || '',
        usuario_nome: usuario?.nome || '',
      });

      await atualizarEstoqueProduto(produto.id, novoEstoque);

      await criarLog({
        tipo: `estoque_${tipo}`,
        descricao: `${tipo === 'entrada' ? 'Entrada' : tipo === 'saida' ? 'Saída' : 'Ajuste'}: ${produto.nome} (${produto.estoque} → ${novoEstoque})`,
        usuario_id: usuario?.userId || '',
        usuario_nome: usuario?.nome || '',
      });

      toast.success('Movimentação registrada!');
      setModalOpen(false);
      setProdutoSelecionado('');
      setQuantidade(0);
      setMotivo('');
      carregar();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
    setSalvando(false);
  };

  const tipoLabel: Record<TipoMovimentacao, string> = { entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste' };
  const tipoCor: Record<TipoMovimentacao, string> = { entrada: 'text-success', saida: 'text-destructive', ajuste: 'text-gold' };
  const tipoIcone: Record<TipoMovimentacao, React.ReactNode> = {
    entrada: <ArrowDownCircle className="w-4 h-4 text-success" />,
    saida: <ArrowUpCircle className="w-4 h-4 text-destructive" />,
    ajuste: <RefreshCw className="w-4 h-4 text-gold" />,
  };

  return (
    <AppLayout requireAdmin>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Controle de Estoque</h1>
            <p className="text-muted-foreground mt-1">{movimentacoes.length} movimentações registradas</p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="wine-gradient text-primary-foreground hover:opacity-90">Nova Movimentação</Button>
        </div>

        {estoqueBaixo.length > 0 && (
          <div className="glass-card p-4 border-destructive/30">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Estoque Baixo ({estoqueBaixo.length} produtos)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {estoqueBaixo.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded bg-destructive/10 border border-destructive/20">
                  <span className="text-xs text-foreground truncate">{p.nome}</span>
                  <span className="text-xs font-bold text-destructive ml-2">{p.estoque}/{p.estoque_minimo}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {carregando ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-display font-semibold text-foreground">Histórico de Movimentações</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Data</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Produto</th>
                    <th className="px-4 py-3 text-right text-xs text-muted-foreground font-medium">Qtd</th>
                    <th className="px-4 py-3 text-right text-xs text-muted-foreground font-medium">Estoque</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Motivo</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movimentacoes.slice(0, 50).map(m => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 text-xs text-foreground">{new Date(m.created_at).toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-2">
                        <span className={`flex items-center gap-1 text-xs font-medium ${tipoCor[m.tipo as TipoMovimentacao] || ''}`}>
                          {tipoIcone[m.tipo as TipoMovimentacao]} {tipoLabel[m.tipo as TipoMovimentacao] || m.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-foreground">{m.produto_nome}</td>
                      <td className="px-4 py-2 text-sm text-right text-foreground">{m.quantidade}</td>
                      <td className="px-4 py-2 text-xs text-right text-muted-foreground">{m.estoque_anterior} → {m.estoque_novo}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{m.motivo}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{m.usuario_nome}</td>
                    </tr>
                  ))}
                  {movimentacoes.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação registrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader><DialogTitle className="font-display text-foreground">Nova Movimentação</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-foreground text-xs">Tipo</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['entrada', 'saida', 'ajuste'] as TipoMovimentacao[]).map(t => (
                    <button key={t} onClick={() => setTipo(t)}
                      className={`p-2 rounded-lg border text-xs font-medium transition-all flex items-center gap-1 justify-center ${tipo === t ? 'border-primary bg-primary/20 text-primary' : 'border-border bg-secondary text-foreground'}`}>
                      {tipoIcone[t]} {tipoLabel[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-foreground text-xs">Produto</Label>
                <Select value={produtoSelecionado} onValueChange={setProdutoSelecionado}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-48">
                    {produtos.filter(p => p.ativo).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome} (Estoque: {p.estoque})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-foreground text-xs">{tipo === 'ajuste' ? 'Novo Estoque' : 'Quantidade'}</Label>
                <Input type="number" value={quantidade || ''} onChange={e => setQuantidade(parseInt(e.target.value) || 0)} className="bg-secondary border-border" min={0} />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground text-xs">Motivo (opcional)</Label>
                <Input value={motivo} onChange={e => setMotivo(e.target.value)} className="bg-secondary border-border" placeholder="Motivo da movimentação" />
              </div>
              <Button onClick={handleMovimentacao} disabled={salvando} className="w-full wine-gradient text-primary-foreground hover:opacity-90">
                {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Registrar Movimentação
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Stock;
