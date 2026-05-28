import { Sale, Product, DashboardMetrics, ReportFilters } from '@/types';
import { getSales, getProducts } from './storage';

export function calculateDashboardMetrics(): DashboardMetrics {
  const sales = getSales().filter(s => !s.cancelled);
  const products = getProducts();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const monthStr = todayStr.substring(0, 7);
  const yearStr = todayStr.substring(0, 4);

  const todaySalesArr = sales.filter(s => s.date.startsWith(todayStr));
  const monthSalesArr = sales.filter(s => s.date.startsWith(monthStr));
  const yearSalesArr = sales.filter(s => s.date.startsWith(yearStr));

  const todayRevenue = todaySalesArr.reduce((s, v) => s + v.grossTotal, 0);
  const monthRevenue = monthSalesArr.reduce((s, v) => s + v.grossTotal, 0);
  const yearRevenue = yearSalesArr.reduce((s, v) => s + v.grossTotal, 0);
  const avgTicket = sales.length > 0 ? sales.reduce((s, v) => s + v.grossTotal, 0) / sales.length : 0;

  const totalCost = sales.reduce((sum, sale) => sum + sale.items.reduce((is, i) => is + i.product.costPrice * i.quantity, 0), 0);
  const grossRevenue = sales.reduce((s, v) => s + v.grossTotal, 0);
  const grossProfit = grossRevenue - totalCost;
  const totalTaxes = sales.reduce((s, v) => s + v.payment.taxAmount, 0);
  const netProfit = grossProfit - totalTaxes;

  // Top products
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  sales.forEach(s => s.items.forEach(i => {
    if (!productMap[i.product.id]) productMap[i.product.id] = { name: i.product.name, qty: 0, revenue: 0 };
    productMap[i.product.id].qty += i.quantity;
    productMap[i.product.id].revenue += i.itemTotal;
  }));
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Top payment methods
  const payMap: Record<string, { name: string; value: number; count: number }> = {};
  sales.forEach(s => {
    const key = s.payment.label;
    if (!payMap[key]) payMap[key] = { name: key, value: 0, count: 0 };
    payMap[key].value += s.grossTotal;
    payMap[key].count += 1;
  });
  const topPaymentMethods = Object.values(payMap).sort((a, b) => b.value - a.value);

  // Low stock
  const lowStockProducts = products.filter(p => p.active && p.stock <= p.minStock);

  // Daily sales (last 30 days)
  const dailySales: { date: string; revenue: number; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const daySales = sales.filter(s => s.date.startsWith(key));
    dailySales.push({
      date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      revenue: daySales.reduce((s, v) => s + v.grossTotal, 0),
      count: daySales.length,
    });
  }

  // Monthly sales (last 12 months)
  const monthlySales: { month: string; revenue: number; profit: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mSales = sales.filter(s => s.date.startsWith(key));
    const rev = mSales.reduce((s, v) => s + v.grossTotal, 0);
    const cost = mSales.reduce((sum, sale) => sum + sale.items.reduce((is, it) => is + it.product.costPrice * it.quantity, 0), 0);
    monthlySales.push({
      month: d.toLocaleDateString('pt-BR', { month: 'short' }),
      revenue: rev,
      profit: rev - cost,
    });
  }

  return {
    todaySales: todaySalesArr.length,
    todayRevenue, monthRevenue, yearRevenue, averageTicket: avgTicket,
    grossProfit, netProfit, totalTaxes, topProducts, topPaymentMethods,
    lowStockProducts, dailySales, monthlySales,
  };
}

export function getFilteredSales(filters: ReportFilters): Sale[] {
  let sales = getSales().filter(s => !s.cancelled);

  if (filters.startDate) {
    sales = sales.filter(s => s.date >= filters.startDate);
  }
  if (filters.endDate) {
    sales = sales.filter(s => s.date <= filters.endDate + 'T23:59:59');
  }
  if (filters.paymentMethod && filters.paymentMethod !== 'all') {
    sales = sales.filter(s => s.payment.method === filters.paymentMethod);
  }
  if (filters.operatorId) {
    sales = sales.filter(s => s.operatorId === filters.operatorId);
  }
  if (filters.productId) {
    sales = sales.filter(s => s.items.some(i => i.product.id === filters.productId));
  }

  return sales;
}

export function exportToCSV(sales: Sale[]): string {
  const headers = ['Data', 'ID Venda', 'Operador', 'Itens', 'Bruto', 'Taxa', 'Líquido', 'Pagamento'];
  const rows = sales.map(s => [
    new Date(s.date).toLocaleString('pt-BR'),
    s.id.substring(0, 8),
    s.operatorName,
    s.items.reduce((sum, i) => sum + i.quantity, 0),
    s.grossTotal.toFixed(2),
    s.payment.taxAmount.toFixed(2),
    s.netTotal.toFixed(2),
    s.payment.label + (s.payment.installments ? ` ${s.payment.installments}x` : ''),
  ]);
  return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
}

export function generateReceiptText(sale: Sale, storeName: string, storeAddress: string, storeCNPJ: string): string {
  const line = '='.repeat(40);
  const lines: string[] = [
    line,
    storeName.toUpperCase().padStart(20 + storeName.length / 2),
    storeAddress,
    `CNPJ: ${storeCNPJ}`,
    line,
    `CUPOM NÃO FISCAL`,
    `Venda: ${sale.id.substring(0, 8)}`,
    `Data: ${new Date(sale.date).toLocaleString('pt-BR')}`,
    `Operador: ${sale.operatorName}`,
    line,
    'ITEM                QTD    VALOR',
    '-'.repeat(40),
  ];

  sale.items.forEach(item => {
    const name = item.product.name.substring(0, 18).padEnd(18);
    const qty = String(item.quantity).padStart(4);
    const val = `R$ ${item.itemTotal.toFixed(2)}`.padStart(12);
    lines.push(`${name} ${qty} ${val}`);
  });

  lines.push('-'.repeat(40));
  if (sale.totalDiscount > 0) lines.push(`Desconto:       -R$ ${sale.totalDiscount.toFixed(2)}`);
  if (sale.totalSurcharge > 0) lines.push(`Acréscimo:      +R$ ${sale.totalSurcharge.toFixed(2)}`);
  lines.push(`TOTAL:           R$ ${sale.grossTotal.toFixed(2)}`);
  lines.push(`Pagamento: ${sale.payment.label}${sale.payment.installments ? ` ${sale.payment.installments}x` : ''}`);
  lines.push(line);
  lines.push('OBRIGADO PELA PREFERÊNCIA!');
  lines.push(line);

  return lines.join('\n');
}
