// ===== USER & AUTH =====
export type UserRole = 'admin' | 'operator';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  loginAt: string;
}

// ===== PRODUCT =====
export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  costPrice: number;
  salePrice: number;
  profitMargin: number;
  stock: number;
  minStock: number;
  active: boolean;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormData {
  name: string;
  barcode: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  active: boolean;
  image?: string;
}

// ===== STOCK =====
export type StockMovementType = 'entry' | 'exit' | 'adjustment';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  operatorId: string;
  operatorName: string;
  date: string;
}

// ===== CART & SALE =====
export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  discountType: 'value' | 'percent';
  surcharge: number;
  itemTotal: number;
}

export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'pix';

export interface PaymentConfig {
  method: PaymentMethod;
  label: string;
  taxPercent: number;
  taxFixed: number;
  creditInstallmentTaxes: Record<number, number>; // installments -> tax%
  active: boolean;
}

export interface SalePayment {
  method: PaymentMethod;
  label: string;
  installments?: number;
  grossAmount: number;
  taxPercent: number;
  taxFixed: number;
  taxAmount: number;
  netAmount: number;
}

export interface Sale {
  id: string;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  totalSurcharge: number;
  grossTotal: number;
  payment: SalePayment;
  netTotal: number;
  operatorId: string;
  operatorName: string;
  date: string;
  cancelled: boolean;
}

// ===== ACTIVITY LOG =====
export type ActivityType = 'login' | 'logout' | 'sale' | 'cancel_sale' | 'product_create' | 'product_update' | 'product_delete' | 'stock_entry' | 'stock_exit' | 'stock_adjustment' | 'user_create' | 'user_update' | 'settings_update' | 'backup';

export interface ActivityLog {
  id: string;
  type: ActivityType;
  description: string;
  userId: string;
  userName: string;
  date: string;
  metadata?: Record<string, unknown>;
}

// ===== SETTINGS =====
export interface AppSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeCNPJ: string;
  paymentConfigs: PaymentConfig[];
  darkMode: boolean;
}

// ===== REPORT FILTERS =====
export interface ReportFilters {
  startDate: string;
  endDate: string;
  paymentMethod?: PaymentMethod | 'all';
  productId?: string;
  operatorId?: string;
}

// ===== DASHBOARD METRICS =====
export interface DashboardMetrics {
  todaySales: number;
  todayRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  averageTicket: number;
  grossProfit: number;
  netProfit: number;
  totalTaxes: number;
  topProducts: { name: string; qty: number; revenue: number }[];
  topPaymentMethods: { name: string; value: number; count: number }[];
  lowStockProducts: Product[];
  dailySales: { date: string; revenue: number; count: number }[];
  monthlySales: { month: string; revenue: number; profit: number }[];
}

// ===== DEFAULT DATA =====
export const DEFAULT_CATEGORIES = [
  'Vinho Tinto', 'Vinho Branco', 'Rosé', 'Espumante', 'Destilados', 'Cerveja', 'Licor', 'Acessórios', 'Outros'
];

export const DEFAULT_PAYMENT_CONFIGS: PaymentConfig[] = [
  { method: 'cash', label: 'Dinheiro', taxPercent: 0, taxFixed: 0, creditInstallmentTaxes: {}, active: true },
  { method: 'debit', label: 'Cartão Débito', taxPercent: 1.49, taxFixed: 0, creditInstallmentTaxes: {}, active: true },
  { method: 'credit', label: 'Cartão Crédito', taxPercent: 2.99, taxFixed: 0, creditInstallmentTaxes: { 2: 4.49, 3: 5.49, 4: 6.49, 5: 7.49, 6: 8.49, 7: 9.99, 8: 10.99, 9: 11.99, 10: 12.99, 11: 13.99, 12: 14.99 }, active: true },
  { method: 'pix', label: 'PIX', taxPercent: 0.99, taxFixed: 0, creditInstallmentTaxes: {}, active: true },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Vinho Tinto Reserva Especial', barcode: '7891000100101', category: 'Vinho Tinto', costPrice: 45, salePrice: 89.90, profitMargin: 99.78, stock: 24, minStock: 5, active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p2', name: 'Vinho Branco Suave', barcode: '7891000100102', category: 'Vinho Branco', costPrice: 22, salePrice: 45.50, profitMargin: 106.82, stock: 18, minStock: 5, active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p3', name: 'Espumante Brut Premium', barcode: '7891000100103', category: 'Espumante', costPrice: 55, salePrice: 120.00, profitMargin: 118.18, stock: 12, minStock: 3, active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p4', name: 'Rosé Provence', barcode: '7891000100104', category: 'Rosé', costPrice: 32, salePrice: 65.00, profitMargin: 103.13, stock: 15, minStock: 4, active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p5', name: 'Whisky 12 Anos', barcode: '7891000100105', category: 'Destilados', costPrice: 95, salePrice: 189.90, profitMargin: 99.89, stock: 8, minStock: 2, active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p6', name: 'Cerveja Artesanal IPA', barcode: '7891000100106', category: 'Cerveja', costPrice: 9, salePrice: 22.90, profitMargin: 154.44, stock: 48, minStock: 12, active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p7', name: 'Gin London Dry', barcode: '7891000100107', category: 'Destilados', costPrice: 65, salePrice: 135.00, profitMargin: 107.69, stock: 10, minStock: 3, active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p8', name: 'Vinho Cabernet Sauvignon', barcode: '7891000100108', category: 'Vinho Tinto', costPrice: 28, salePrice: 55.00, profitMargin: 96.43, stock: 30, minStock: 8, active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p9', name: 'Champagne Francês', barcode: '7891000100109', category: 'Espumante', costPrice: 160, salePrice: 320.00, profitMargin: 100.0, stock: 5, minStock: 2, active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p10', name: 'Vodka Premium', barcode: '7891000100110', category: 'Destilados', costPrice: 48, salePrice: 98.00, profitMargin: 104.17, stock: 14, minStock: 3, active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p11', name: 'Cerveja Stout Artesanal', barcode: '7891000100111', category: 'Cerveja', costPrice: 8, salePrice: 18.90, profitMargin: 136.25, stock: 36, minStock: 10, active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p12', name: 'Vinho do Porto Ruby', barcode: '7891000100112', category: 'Vinho Tinto', costPrice: 72, salePrice: 145.00, profitMargin: 101.39, stock: 3, minStock: 3, active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p13', name: 'Licor de Chocolate', barcode: '7891000100113', category: 'Licor', costPrice: 35, salePrice: 68.00, profitMargin: 94.29, stock: 9, minStock: 3, active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p14', name: 'Saca-Rolhas Profissional', barcode: '7891000100114', category: 'Acessórios', costPrice: 15, salePrice: 39.90, profitMargin: 166.0, stock: 20, minStock: 5, active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 'p15', name: 'Rum Envelhecido 8 Anos', barcode: '7891000100115', category: 'Destilados', costPrice: 55, salePrice: 115.00, profitMargin: 109.09, stock: 7, minStock: 2, active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
];

export const DEFAULT_USERS: User[] = [
  { id: 'u1', name: 'Administrador', email: 'admin@adega.com', password: 'admin123', role: 'admin', active: true, createdAt: '2025-01-01' },
  { id: 'u2', name: 'Operador Caixa', email: 'caixa@adega.com', password: 'caixa123', role: 'operator', active: true, createdAt: '2025-01-01' },
];
