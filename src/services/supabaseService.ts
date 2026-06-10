// Serviço centralizado para todas as operações com o banco de dados
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

// ===== TIPOS =====
export type Produto = Tables<'produtos'> & { categoria_nome?: string };
export type Categoria = Tables<'categorias'>;
export type Venda = Tables<'vendas'>;
export type ItemVenda = Tables<'itens_venda'>;
export type MovimentacaoEstoque = Tables<'movimentacoes_estoque'>;
export type LogAtividade = Tables<'logs_atividade'>;
export type Configuracao = Tables<'configuracoes'>;
export type Perfil = Tables<'perfis'>;
export type PapelUsuario = Tables<'papeis_usuarios'>;

export type VendaCompleta = Venda & { itens: ItemVenda[] };

// ===== CATEGORIAS =====
export async function buscarCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('nome');
  if (error) throw error;
  return data || [];
}

export async function salvarCategoria(categoria: TablesInsert<'categorias'>): Promise<Categoria> {
  const { data, error } = await supabase
    .from('categorias')
    .upsert(categoria)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function excluirCategoria(id: string): Promise<void> {
  const { error } = await supabase.from('categorias').delete().eq('id', id);
  if (error) throw error;
}

// ===== PRODUTOS =====
export async function buscarProdutos(): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select('*, categorias(nome)')
    .order('nome');
  if (error) throw error;
  return (data || []).map((p: any) => ({
    ...p,
    categoria_nome: p.categorias?.nome || 'Sem categoria',
  }));
}

export async function salvarProduto(produto: TablesInsert<'produtos'>): Promise<Produto> {
  const { data, error } = await supabase
    .from('produtos')
    .upsert(produto)
    .select('*, categorias(nome)')
    .single();
  if (error) throw error;
  return { ...data, categoria_nome: (data as any).categorias?.nome || 'Sem categoria' };
}

export async function excluirProduto(id: string): Promise<void> {
  const { error } = await supabase.from('produtos').delete().eq('id', id);
  if (error) throw error;
}

export async function atualizarEstoqueProduto(id: string, novoEstoque: number): Promise<void> {
  const { error } = await supabase
    .from('produtos')
    .update({ estoque: novoEstoque })
    .eq('id', id);
  if (error) throw error;
}

// ===== VENDAS =====
export async function buscarVendas(): Promise<VendaCompleta[]> {
  const { data: vendas, error } = await supabase
    .from('vendas')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const { data: itens, error: itensError } = await supabase
    .from('itens_venda')
    .select('*');
  if (itensError) throw itensError;

  return (vendas || []).map(v => ({
    ...v,
    itens: (itens || []).filter(i => i.venda_id === v.id),
  }));
}

export async function criarVenda(
  venda: TablesInsert<'vendas'>,
  itens: TablesInsert<'itens_venda'>[],
): Promise<string> {
  // Inserir venda
  const { data: vendaCriada, error: vendaError } = await supabase
    .from('vendas')
    .insert(venda)
    .select('id')
    .single();
  if (vendaError) throw vendaError;

  // Inserir itens com o ID da venda
  const itensComVendaId = itens.map(i => ({
    ...i,
    venda_id: vendaCriada.id,
  }));
  const { error: itensError } = await supabase
    .from('itens_venda')
    .insert(itensComVendaId);
  if (itensError) throw itensError;

  return vendaCriada.id;
}

export async function cancelarVenda(id: string): Promise<void> {
  const { error } = await supabase
    .from('vendas')
    .update({ cancelada: true })
    .eq('id', id);
  if (error) throw error;
}

// ===== MOVIMENTAÇÕES DE ESTOQUE =====
export async function buscarMovimentacoes(): Promise<MovimentacaoEstoque[]> {
  const { data, error } = await supabase
    .from('movimentacoes_estoque')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarMovimentacao(mov: TablesInsert<'movimentacoes_estoque'>): Promise<void> {
  const { error } = await supabase
    .from('movimentacoes_estoque')
    .insert(mov);
  if (error) throw error;
}

// ===== LOGS =====
export async function buscarLogs(): Promise<LogAtividade[]> {
  const { data, error } = await supabase
    .from('logs_atividade')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data || [];
}

export async function criarLog(log: TablesInsert<'logs_atividade'>): Promise<void> {
  const { error } = await supabase.from('logs_atividade').insert(log);
  if (error) console.error('Erro ao criar log:', error);
}

// ===== CONFIGURAÇÕES =====
export async function buscarConfiguracoes(): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('*');
  if (error) throw error;
  const configs: Record<string, any> = {};
  (data || []).forEach(c => {
    configs[c.chave] = c.valor;
  });
  return configs;
}

export async function salvarConfiguracao(chave: string, valor: any): Promise<void> {
  const { error } = await supabase
    .from('configuracoes')
    .update({ valor })
    .eq('chave', chave);
  if (error) throw error;
}

// ===== PERFIS/USUÁRIOS =====
export async function buscarPerfis(): Promise<(Perfil & { papel?: string })[]> {
  const { data: perfis, error } = await supabase
    .from('perfis')
    .select('*')
    .order('nome');
  if (error) throw error;

  const { data: papeis } = await supabase
    .from('papeis_usuarios')
    .select('*');

  return (perfis || []).map(p => ({
    ...p,
    papel: papeis?.find(r => r.user_id === p.user_id)?.papel || 'operador',
  }));
}

export async function atualizarPerfil(userId: string, dados: { nome?: string; ativo?: boolean }): Promise<void> {
  const { error } = await supabase
    .from('perfis')
    .update(dados)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function atualizarPapel(userId: string, papel: 'admin' | 'operador'): Promise<void> {
  // Verificar se já existe
  const { data } = await supabase
    .from('papeis_usuarios')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (data) {
    const { error } = await supabase
      .from('papeis_usuarios')
      .update({ papel })
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('papeis_usuarios')
      .insert({ user_id: userId, papel });
    if (error) throw error;
  }
}
