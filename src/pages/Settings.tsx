import { useState, useEffect } from 'react';
import { Save, Store, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buscarConfiguracoes, salvarConfiguracao, criarLog } from '@/services/supabaseService';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

const Settings = () => {
  const { usuario } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [loja, setLoja] = useState({ nome: '', endereco: '', telefone: '', cnpj: '' });
  const [pagamentos, setPagamentos] = useState<Record<string, any>>({});

  useEffect(() => {
    const carregar = async () => {
      try {
        const configs = await buscarConfiguracoes();
        if (configs.loja) setLoja(configs.loja);
        // Carregar configs de pagamento
        const pags: Record<string, any> = {};
        ['pagamento_dinheiro', 'pagamento_debito', 'pagamento_credito_avista', 'pagamento_credito_parcelado', 'pagamento_pix'].forEach(k => {
          if (configs[k]) pags[k] = configs[k];
        });
        setPagamentos(pags);
      } catch (e: any) {
        toast.error('Erro: ' + e.message);
      }
      setCarregando(false);
    };
    carregar();
  }, []);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await salvarConfiguracao('loja', loja);
      for (const [chave, valor] of Object.entries(pagamentos)) {
        await salvarConfiguracao(chave, valor);
      }
      await criarLog({
        tipo: 'configuracoes_atualizadas',
        descricao: 'Configurações atualizadas',
        usuario_id: usuario?.userId || '',
        usuario_nome: usuario?.nome || '',
      });
      toast.success('Configurações salvas!');
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
    setSalvando(false);
  };

  const atualizarPagamento = (chave: string, updates: Record<string, any>) => {
    setPagamentos(prev => ({ ...prev, [chave]: { ...prev[chave], ...updates } }));
  };

  const configsPagamento = [
    { chave: 'pagamento_dinheiro', label: 'Dinheiro' },
    { chave: 'pagamento_debito', label: 'Cartão Débito' },
    { chave: 'pagamento_credito_avista', label: 'Crédito à Vista' },
    { chave: 'pagamento_credito_parcelado', label: 'Crédito Parcelado' },
    { chave: 'pagamento_pix', label: 'PIX' },
  ];

  if (carregando) {
    return <AppLayout requireAdmin><div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout requireAdmin>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground mt-1">Gerencie seu sistema</p>
          </div>
          <Button onClick={handleSalvar} disabled={salvando} className="wine-gradient text-primary-foreground hover:opacity-90">
            {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Salvar
          </Button>
        </div>

        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" /> Dados da Loja
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nome da Loja</Label>
              <Input value={loja.nome} onChange={e => setLoja(l => ({ ...l, nome: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">CNPJ</Label>
              <Input value={loja.cnpj} onChange={e => setLoja(l => ({ ...l, cnpj: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Endereço</Label>
              <Input value={loja.endereco} onChange={e => setLoja(l => ({ ...l, endereco: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Telefone</Label>
              <Input value={loja.telefone} onChange={e => setLoja(l => ({ ...l, telefone: e.target.value }))} className="bg-secondary border-border" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gold" /> Taxas de Pagamento
          </h2>
          <div className="space-y-4">
            {configsPagamento.map(({ chave, label }) => {
              const config = pagamentos[chave] || { ativo: true, taxa: 0 };
              return (
                <div key={chave} className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">{label}</h3>
                    <Switch checked={config.ativo ?? true} onCheckedChange={v => atualizarPagamento(chave, { ativo: v })} />
                  </div>
                  {chave === 'pagamento_credito_parcelado' ? (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Taxas por Parcela</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {[2, 3, 4, 5, 6].map(n => (
                          <div key={n} className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">{n}x</Label>
                            <Input type="number" value={config.taxas?.[String(n)] || ''} onChange={e => {
                              const taxas = { ...(config.taxas || {}), [String(n)]: parseFloat(e.target.value) || 0 };
                              atualizarPagamento(chave, { taxas });
                            }} className="bg-secondary border-border h-7 text-xs" min={0} step={0.01} placeholder="%" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Taxa Percentual (%)</Label>
                      <Input type="number" value={config.taxa || ''} onChange={e => atualizarPagamento(chave, { taxa: parseFloat(e.target.value) || 0 })} className="bg-secondary border-border" min={0} step={0.01} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
