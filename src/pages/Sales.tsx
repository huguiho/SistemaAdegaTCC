import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Printer, X, Smartphone, Loader2, History, FolderOpen, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buscarProdutos, buscarConfiguracoes, buscarCategorias, buscarVendas, criarVenda, atualizarEstoqueProduto, criarLog, type Produto, type Categoria, type VendaCompleta } from '@/services/supabaseService';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type FormaPagamento = 'dinheiro' | 'debito' | 'credito' | 'pix';

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  desconto: number;
  tipoDesconto: 'valor' | 'percentual';
  totalItem: number;
}

interface PagamentoMisto {
  forma: FormaPagamento;
  valor: number;
  parcelas: number;
}

const Sales = () => {
  const { usuario } = useAuth();
  const [search, setSearch] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [modalPagamento, setModalPagamento] = useState(false);
  const [modalCupom, setModalCupom] = useState(false);
  const [modalHistorico, setModalHistorico] = useState(false);
  const [textoCupom, setTextoCupom] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('dinheiro');
  const [parcelas, setParcelas] = useState(1);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [carregando, setCarregando] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Pagamento misto
  const [pagamentoMisto, setPagamentoMisto] = useState(false);
  const [pagamentos, setPagamentos] = useState<PagamentoMisto[]>([]);
  const [formaMistoAtual, setFormaMistoAtual] = useState<FormaPagamento>('dinheiro');
  const [valorMistoAtual, setValorMistoAtual] = useState('');
  const [parcelasMistoAtual, setParcelasMistoAtual] = useState(1);

  // Histórico
  const [vendasHistorico, setVendasHistorico] = useState<VendaCompleta[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      try {
        const [prods, confs, cats] = await Promise.all([buscarProdutos(), buscarConfiguracoes(), buscarCategorias()]);
        setProdutos(prods.filter(p => p.ativo));
        setConfigs(confs);
        setCategorias(cats.filter(c => c.ativo));
      } catch (e: any) {
        toast.error('Erro ao carregar: ' + e.message);
      }
      setCarregando(false);
    };
    carregar();
  }, []);

  const produtosFiltrados = useMemo(() => {
    let lista = produtos;
    if (filtroCategoria && filtroCategoria !== 'todas') {
      lista = lista.filter(p => p.categoria_id === filtroCategoria);
    }
    if (!search) return lista;
    const q = search.toLowerCase();
    return lista.filter(p =>
      p.nome.toLowerCase().includes(q) || (p.codigo_barras || '').includes(q) || (p.categoria_nome || '').toLowerCase().includes(q)
    );
  }, [search, produtos, filtroCategoria]);

  const calcularTotalItem = (preco: number, qtd: number, desconto: number, tipoDesc: 'valor' | 'percentual'): number => {
    const subtotal = preco * qtd;
    const descVal = tipoDesc === 'percentual' ? subtotal * (desconto / 100) : desconto;
    return Math.max(0, subtotal - descVal);
  };

  const adicionarAoCarrinho = (produto: Produto) => {
    setCarrinho(prev => {
      const existente = prev.find(i => i.produto.id === produto.id);
      if (existente) {
        return prev.map(i =>
          i.produto.id === produto.id
            ? { ...i, quantidade: i.quantidade + 1, totalItem: calcularTotalItem(i.produto.preco_venda, i.quantidade + 1, i.desconto, i.tipoDesconto) }
            : i
        );
      }
      return [...prev, { produto, quantidade: 1, desconto: 0, tipoDesconto: 'valor' as const, totalItem: produto.preco_venda }];
    });
  };

  const atualizarQtd = (produtoId: string, delta: number) => {
    setCarrinho(prev => prev.map(i => {
      if (i.produto.id === produtoId) {
        const novaQtd = Math.max(0, i.quantidade + delta);
        if (novaQtd === 0) return i;
        return { ...i, quantidade: novaQtd, totalItem: calcularTotalItem(i.produto.preco_venda, novaQtd, i.desconto, i.tipoDesconto) };
      }
      return i;
    }).filter(i => i.quantidade > 0));
  };

  const atualizarDesconto = (produtoId: string, desconto: number, tipoDesconto: 'valor' | 'percentual') => {
    setCarrinho(prev => prev.map(i => {
      if (i.produto.id === produtoId) {
        return { ...i, desconto, tipoDesconto, totalItem: calcularTotalItem(i.produto.preco_venda, i.quantidade, desconto, tipoDesconto) };
      }
      return i;
    }));
  };

  const removerItem = (produtoId: string) => {
    setCarrinho(prev => prev.filter(i => i.produto.id !== produtoId));
  };

  const subtotal = carrinho.reduce((s, i) => s + i.produto.preco_venda * i.quantidade, 0);
  const totalDesconto = carrinho.reduce((s, i) => {
    return s + (i.tipoDesconto === 'percentual' ? (i.produto.preco_venda * i.quantidade) * (i.desconto / 100) : i.desconto);
  }, 0);
  const totalBruto = subtotal - totalDesconto;

  const obterTaxa = (forma?: FormaPagamento, numParcelas?: number) => {
    const fp = forma || formaPagamento;
    const np = numParcelas || parcelas;
    const mapaConfig: Record<FormaPagamento, string> = {
      dinheiro: 'pagamento_dinheiro',
      debito: 'pagamento_debito',
      credito: np > 1 ? 'pagamento_credito_parcelado' : 'pagamento_credito_avista',
      pix: 'pagamento_pix',
    };
    const config = configs[mapaConfig[fp]];
    if (!config) return 0;
    if (fp === 'credito' && np > 1 && config.taxas?.[String(np)]) {
      return config.taxas[String(np)];
    }
    return config.taxa || 0;
  };

  const taxa = obterTaxa();
  const valorTaxa = totalBruto * (taxa / 100);
  const valorLiquido = totalBruto - valorTaxa;

  const labelPagamento: Record<FormaPagamento, string> = { dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito', pix: 'PIX' };

  // Pagamento misto helpers
  const totalPagoMisto = pagamentos.reduce((s, p) => s + p.valor, 0);
  const restanteMisto = totalBruto - totalPagoMisto;

  const adicionarPagamentoMisto = () => {
    const valor = parseFloat(valorMistoAtual);
    if (!valor || valor <= 0) { toast.error('Informe um valor válido'); return; }
    if (valor > restanteMisto + 0.01) { toast.error('Valor excede o restante'); return; }
    setPagamentos(prev => [...prev, { forma: formaMistoAtual, valor, parcelas: formaMistoAtual === 'credito' ? parcelasMistoAtual : 1 }]);
    setValorMistoAtual('');
    setParcelasMistoAtual(1);
  };

  const removerPagamentoMisto = (index: number) => {
    setPagamentos(prev => prev.filter((_, i) => i !== index));
  };

  const calcularTaxaMista = () => {
    return pagamentos.reduce((total, p) => {
      const t = obterTaxa(p.forma, p.parcelas);
      return total + p.valor * (t / 100);
    }, 0);
  };

  const finalizarVenda = async () => {
    if (carrinho.length === 0) { toast.error('Carrinho vazio'); return; }

    if (pagamentoMisto && totalPagoMisto < totalBruto - 0.01) {
      toast.error('O valor total dos pagamentos não cobre o valor da venda');
      return;
    }

    setFinalizando(true);
    try {
      const taxaFinal = pagamentoMisto ? calcularTaxaMista() : valorTaxa;
      const liquidoFinal = totalBruto - taxaFinal;
      const formaPgto = pagamentoMisto
        ? pagamentos.map(p => `${labelPagamento[p.forma]}${p.parcelas > 1 ? ` ${p.parcelas}x` : ''}: R$ ${p.valor.toFixed(2)}`).join(' + ')
        : formaPagamento;

      const vendaId = await criarVenda(
        {
          usuario_id: usuario?.userId || '',
          usuario_nome: usuario?.nome || '',
          subtotal,
          desconto: totalDesconto,
          total: totalBruto,
          forma_pagamento: formaPgto,
          taxa_valor: taxaFinal,
          valor_liquido: liquidoFinal,
          parcelas: !pagamentoMisto && formaPagamento === 'credito' ? parcelas : 1,
        },
        carrinho.map(i => ({
          venda_id: '',
          produto_id: i.produto.id,
          produto_nome: i.produto.nome,
          quantidade: i.quantidade,
          preco_unitario: i.produto.preco_venda,
          preco_custo: i.produto.preco_custo,
          subtotal: i.totalItem,
        }))
      );

      for (const item of carrinho) {
        await atualizarEstoqueProduto(item.produto.id, Math.max(0, item.produto.estoque - item.quantidade));
      }

      await criarLog({
        tipo: 'venda',
        descricao: `Venda de R$ ${totalBruto.toFixed(2)} via ${typeof formaPgto === 'string' ? formaPgto : 'misto'}`,
        usuario_id: usuario?.userId || '',
        usuario_nome: usuario?.nome || '',
      });

      const loja = configs.loja || {};
      const linhas = [
        '='.repeat(40),
        (loja.nome || 'Adega PDV').toUpperCase(),
        loja.endereco || '',
        loja.cnpj ? `CNPJ: ${loja.cnpj}` : '',
        '='.repeat(40),
        `Venda: ${vendaId.substring(0, 8)}`,
        `Data: ${new Date().toLocaleString('pt-BR')}`,
        `Operador: ${usuario?.nome}`,
        '='.repeat(40),
        ...carrinho.map(i => `${i.produto.nome.substring(0, 20).padEnd(20)} ${String(i.quantidade).padStart(3)} R$ ${i.totalItem.toFixed(2).padStart(8)}`),
        '-'.repeat(40),
        totalDesconto > 0 ? `Desconto:      -R$ ${totalDesconto.toFixed(2)}` : '',
        `TOTAL:          R$ ${totalBruto.toFixed(2)}`,
        pagamentoMisto
          ? `Pagamentos:\n${pagamentos.map(p => `  ${labelPagamento[p.forma]}${p.parcelas > 1 ? ` ${p.parcelas}x` : ''}: R$ ${p.valor.toFixed(2)}`).join('\n')}`
          : `Pagamento: ${labelPagamento[formaPagamento]}${formaPagamento === 'credito' && parcelas > 1 ? ` ${parcelas}x` : ''}`,
        '='.repeat(40),
        'OBRIGADO PELA PREFERÊNCIA!',
      ].filter(Boolean);
      setTextoCupom(linhas.join('\n'));

      setCarrinho([]);
      setPagamentos([]);
      setPagamentoMisto(false);
      setModalPagamento(false);
      setModalCupom(true);
      toast.success(`Venda de R$ ${totalBruto.toFixed(2)} finalizada!`);

      const prods = await buscarProdutos();
      setProdutos(prods.filter(p => p.ativo));
    } catch (e: any) {
      toast.error('Erro ao finalizar venda: ' + e.message);
    }
    setFinalizando(false);
  };

  const limparCarrinho = () => { setCarrinho([]); toast.info('Carrinho limpo'); };
  const fmt = (v: number) => `R$ ${v.toFixed(2)}`;

  useKeyboardShortcuts({
    'F2': () => searchRef.current?.focus(),
    'F4': () => carrinho.length > 0 && setModalPagamento(true),
    'escape': () => { setModalPagamento(false); setModalCupom(false); },
    'F8': limparCarrinho,
  });

  const iconesPagamento: Record<FormaPagamento, React.ReactNode> = {
    dinheiro: <Banknote className="w-5 h-5" />,
    debito: <CreditCard className="w-5 h-5" />,
    credito: <CreditCard className="w-5 h-5" />,
    pix: <Smartphone className="w-5 h-5" />,
  };

  const abrirHistorico = async () => {
    setModalHistorico(true);
    setCarregandoHistorico(true);
    try {
      const vendas = await buscarVendas();
      setVendasHistorico(vendas.slice(0, 50));
    } catch (e: any) {
      toast.error('Erro ao buscar histórico');
    }
    setCarregandoHistorico(false);
  };

  const gerarCupomHistorico = (venda: VendaCompleta) => {
    const loja = configs.loja || {};
    const linhas = [
      '='.repeat(40),
      (loja.nome || 'Adega PDV').toUpperCase(),
      loja.endereco || '',
      loja.cnpj ? `CNPJ: ${loja.cnpj}` : '',
      '='.repeat(40),
      `Venda: ${venda.id.substring(0, 8)}`,
      `Data: ${new Date(venda.created_at).toLocaleString('pt-BR')}`,
      `Operador: ${venda.usuario_nome}`,
      '='.repeat(40),
      ...venda.itens.map(i => `${i.produto_nome.substring(0, 20).padEnd(20)} ${String(i.quantidade).padStart(3)} R$ ${i.subtotal.toFixed(2).padStart(8)}`),
      '-'.repeat(40),
      venda.desconto > 0 ? `Desconto:      -R$ ${venda.desconto.toFixed(2)}` : '',
      `TOTAL:          R$ ${venda.total.toFixed(2)}`,
      `Pagamento: ${venda.forma_pagamento}`,
      venda.cancelada ? '*** VENDA CANCELADA ***' : '',
      '='.repeat(40),
      'OBRIGADO PELA PREFERÊNCIA!',
      '(REIMPRESSÃO)',
    ].filter(Boolean);
    setTextoCupom(linhas.join('\n'));
    setModalHistorico(false);
    setModalCupom(true);
  };

  if (carregando) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </AppLayout>
    );
  }

  // Carrinho component for reuse (mobile sheet + desktop sidebar)
  const CarrinhoContent = () => (
    <>
      <div className="p-3 md:p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-foreground text-sm md:text-base">Carrinho</h2>
          <p className="text-xs text-muted-foreground">{carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}</p>
        </div>
        {carrinho.length > 0 && (
          <button onClick={limparCarrinho} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2">
        {carrinho.length === 0 && <p className="text-center text-muted-foreground text-sm py-12">Nenhum item adicionado</p>}
        {carrinho.map(item => (
          <div key={item.produto.id} className="bg-secondary rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground flex-1 leading-tight">{item.produto.nome}</p>
              <button onClick={() => removerItem(item.produto.id)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button onClick={() => atualizarQtd(item.produto.id, -1)} className="w-7 h-7 md:w-6 md:h-6 rounded bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-95">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-medium w-6 text-center text-foreground">{item.quantidade}</span>
                <button onClick={() => atualizarQtd(item.produto.id, 1)} className="w-7 h-7 md:w-6 md:h-6 rounded bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-95">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <span className="font-semibold text-sm text-foreground">{fmt(item.totalItem)}</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
              <span className="text-[10px] text-muted-foreground">Desc:</span>
              <Input type="number" value={item.desconto || ''} onChange={e => atualizarDesconto(item.produto.id, parseFloat(e.target.value) || 0, item.tipoDesconto)} className="h-6 w-16 text-xs bg-muted border-border px-2" placeholder="0" min={0} />
              <button onClick={() => atualizarDesconto(item.produto.id, item.desconto, item.tipoDesconto === 'valor' ? 'percentual' : 'valor')} className="text-[10px] text-muted-foreground hover:text-foreground bg-muted px-1.5 py-0.5 rounded">
                {item.tipoDesconto === 'valor' ? 'R$' : '%'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 md:p-4 border-t border-border space-y-3">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          {totalDesconto > 0 && <div className="flex justify-between text-destructive"><span>Desconto</span><span>-{fmt(totalDesconto)}</span></div>}
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-lg font-display font-semibold text-foreground">Total</span>
          <span className="text-2xl font-bold gold-text">{fmt(totalBruto)}</span>
        </div>
        <Button onClick={() => { setModalPagamento(true); setCarrinhoAberto(false); }} disabled={carrinho.length === 0} className="w-full wine-gradient hover:opacity-90 text-primary-foreground font-semibold h-12 text-base active:scale-[0.97]">
          Finalizar Venda (F4)
        </Button>
      </div>
    </>
  );

  return (
    <AppLayout>
      <div className="flex h-screen overflow-hidden flex-col md:flex-row">
        {/* Produtos */}
        <div className="flex-1 flex flex-col p-3 md:p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h1 className="text-lg md:text-xl font-display font-bold text-foreground whitespace-nowrap">PDV</h1>
            <div className="flex gap-1 items-center">
              <Button variant="outline" size="sm" onClick={abrirHistorico} className="border-border text-muted-foreground h-8 px-2 md:px-3">
                <History className="w-4 h-4 md:mr-1" />
                <span className="hidden md:inline text-xs">Histórico</span>
              </Button>
              <span className="hidden lg:inline text-[10px] text-muted-foreground bg-secondary px-2 py-1 rounded">F2 Buscar</span>
              <span className="hidden lg:inline text-[10px] text-muted-foreground bg-secondary px-2 py-1 rounded">F4 Pagar</span>
              <span className="hidden lg:inline text-[10px] text-muted-foreground bg-secondary px-2 py-1 rounded">F8 Limpar</span>
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..." className="pl-10 bg-secondary border-border h-10" autoFocus />
            </div>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-[140px] md:w-[180px] bg-secondary border-border h-10">
                <Filter className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="todas">Todas</SelectItem>
                {categorias.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 content-start">
            {produtosFiltrados.map(produto => (
              <button key={produto.id} onClick={() => adicionarAoCarrinho(produto)} className="glass-card p-3 text-left hover:border-primary/40 transition-all group active:scale-[0.97]">
                <p className="font-medium text-foreground text-sm group-hover:text-primary transition-colors truncate">{produto.nome}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{produto.categoria_nome}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm md:text-base font-bold text-gold">{fmt(produto.preco_venda)}</span>
                  <span className="text-[10px] text-muted-foreground">Est: {produto.estoque}</span>
                </div>
              </button>
            ))}
            {produtosFiltrados.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground text-sm">Nenhum produto encontrado</div>
            )}
          </div>

          {/* Mobile: floating cart button */}
          <div className="md:hidden fixed bottom-4 right-4 z-50">
            <Sheet open={carrinhoAberto} onOpenChange={setCarrinhoAberto}>
              <SheetTrigger asChild>
                <Button className="wine-gradient text-primary-foreground h-14 w-14 rounded-full shadow-lg relative active:scale-95">
                  <CreditCard className="w-6 h-6" />
                  {carrinho.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gold text-background text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {carrinho.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-card border-border h-[85vh] flex flex-col p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Carrinho</SheetTitle>
                </SheetHeader>
                <CarrinhoContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Desktop: sidebar cart */}
        <div className="hidden md:flex w-[340px] lg:w-[380px] bg-card border-l border-border flex-col">
          <CarrinhoContent />
        </div>
      </div>

      {/* Modal Pagamento */}
      <Dialog open={modalPagamento} onOpenChange={(open) => { setModalPagamento(open); if (!open) { setPagamentoMisto(false); setPagamentos([]); } }}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle className="font-display text-foreground">Forma de Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => { setPagamentoMisto(false); setPagamentos([]); }}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all ${!pagamentoMisto ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-muted'}`}>
                Simples
              </button>
              <button onClick={() => setPagamentoMisto(true)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all ${pagamentoMisto ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-muted'}`}>
                Misto (dividir)
              </button>
            </div>

            {!pagamentoMisto ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {(['dinheiro', 'debito', 'credito', 'pix'] as FormaPagamento[]).map(fp => (
                    <button key={fp} onClick={() => { setFormaPagamento(fp); setParcelas(1); }}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all active:scale-[0.97] ${formaPagamento === fp ? 'border-primary bg-primary/20 text-primary' : 'border-border bg-secondary text-foreground hover:bg-muted'}`}>
                      {iconesPagamento[fp]}
                      <div className="text-left">
                        <p className="text-sm font-medium">{labelPagamento[fp]}</p>
                        <p className="text-[10px] text-muted-foreground">Taxa: {obterTaxa(fp, 1)}%</p>
                      </div>
                    </button>
                  ))}
                </div>

                {formaPagamento === 'credito' && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Parcelas</label>
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4, 5, 6].map(n => (
                        <button key={n} onClick={() => setParcelas(n)}
                          className={`p-1.5 rounded text-xs transition-all active:scale-95 ${parcelas === n ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-muted'}`}>
                          {n}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Valor Bruto</span><span className="text-foreground font-medium">{fmt(totalBruto)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxa ({taxa}%)</span><span className="text-destructive font-medium">-{fmt(valorTaxa)}</span></div>
                  <div className="flex justify-between text-base pt-2 border-t border-border"><span className="text-foreground font-semibold">Valor Líquido</span><span className="font-bold gold-text">{fmt(valorLiquido)}</span></div>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Total da venda</span>
                    <span className="text-foreground font-bold">{fmt(totalBruto)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Restante</span>
                    <span className={`font-bold ${restanteMisto > 0.01 ? 'text-gold' : 'text-success'}`}>{fmt(Math.max(0, restanteMisto))}</span>
                  </div>
                </div>

                {pagamentos.length > 0 && (
                  <div className="space-y-1">
                    {pagamentos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          {iconesPagamento[p.forma]}
                          <span className="text-sm text-foreground">{labelPagamento[p.forma]}{p.parcelas > 1 ? ` ${p.parcelas}x` : ''}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{fmt(p.valor)}</span>
                          <button onClick={() => removerPagamentoMisto(i)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {restanteMisto > 0.01 && (
                  <div className="space-y-2 p-3 rounded-lg border border-border">
                    <div className="grid grid-cols-2 gap-1">
                      {(['dinheiro', 'debito', 'credito', 'pix'] as FormaPagamento[]).map(fp => (
                        <button key={fp} onClick={() => setFormaMistoAtual(fp)}
                          className={`flex items-center gap-1.5 p-2 rounded text-xs transition-all ${formaMistoAtual === fp ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary text-foreground'}`}>
                          {iconesPagamento[fp]}
                          {labelPagamento[fp]}
                        </button>
                      ))}
                    </div>
                    {formaMistoAtual === 'credito' && (
                      <div className="grid grid-cols-6 gap-1">
                        {[1, 2, 3, 4, 5, 6].map(n => (
                          <button key={n} onClick={() => setParcelasMistoAtual(n)}
                            className={`p-1 rounded text-xs ${parcelasMistoAtual === n ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                            {n}x
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input type="number" value={valorMistoAtual} onChange={e => setValorMistoAtual(e.target.value)}
                        placeholder={`Máx: ${fmt(restanteMisto)}`} className="bg-muted border-border h-9 flex-1" />
                      <Button onClick={() => { setValorMistoAtual(restanteMisto.toFixed(2)); }} variant="outline" size="sm" className="border-border text-xs h-9 whitespace-nowrap">
                        Restante
                      </Button>
                    </div>
                    <Button onClick={adicionarPagamentoMisto} variant="outline" className="w-full border-border h-9 text-sm">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                )}

                {pagamentos.length > 0 && (
                  <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-1">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Taxas</span><span className="text-destructive font-medium">-{fmt(calcularTaxaMista())}</span></div>
                    <div className="flex justify-between text-base pt-1 border-t border-border"><span className="text-foreground font-semibold">Líquido</span><span className="font-bold gold-text">{fmt(totalBruto - calcularTaxaMista())}</span></div>
                  </div>
                )}
              </>
            )}

            <Button onClick={finalizarVenda} disabled={finalizando || (pagamentoMisto && restanteMisto > 0.01)} className="w-full wine-gradient hover:opacity-90 text-primary-foreground font-semibold h-11 active:scale-[0.97]">
              {finalizando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirmar Pagamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Cupom */}
      <Dialog open={modalCupom} onOpenChange={setModalCupom}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground flex items-center gap-2"><Printer className="w-5 h-5" /> Cupom</DialogTitle>
          </DialogHeader>
          <pre className="bg-secondary p-4 rounded-lg text-xs text-foreground font-mono whitespace-pre-wrap max-h-80 overflow-auto">{textoCupom}</pre>
          <Button onClick={() => { window.print(); }} variant="outline" className="w-full border-border text-foreground">
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </Button>
        </DialogContent>
      </Dialog>

      {/* Modal Histórico */}
      <Dialog open={modalHistorico} onOpenChange={setModalHistorico}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground flex items-center gap-2"><History className="w-5 h-5" /> Histórico de Vendas</DialogTitle>
          </DialogHeader>
          {carregandoHistorico ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : vendasHistorico.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma venda encontrada</p>
          ) : (
            <div className="space-y-2">
              {vendasHistorico.map(v => (
                <div key={v.id} className={`p-3 rounded-lg border transition-all ${v.cancelada ? 'bg-destructive/10 border-destructive/20' : 'bg-secondary border-border hover:border-primary/30'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm font-medium text-foreground">{fmt(v.total)}</span>
                      {v.cancelada && <span className="text-[10px] text-destructive ml-2 font-medium">CANCELADA</span>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => gerarCupomHistorico(v)} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                      <Printer className="w-3.5 h-3.5 mr-1" /> Cupom
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{new Date(v.created_at).toLocaleString('pt-BR')}</span>
                    <span>{v.forma_pagamento}</span>
                    <span>{v.usuario_nome}</span>
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground">
                    {v.itens.map(i => `${i.produto_nome} (${i.quantidade}x)`).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Sales;
