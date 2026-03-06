import {
  Product, Sale, StockMovement, User, ActivityLog, AppSettings,
  DEFAULT_PAYMENT_CONFIGS, MOCK_PRODUCTS, DEFAULT_USERS,
  ActivityType, StockMovementType
} from '@/types';

const KEYS = {
  products: 'adega_products',
  sales: 'adega_sales',
  stockMovements: 'adega_stock_movements',
  users: 'adega_users',
  activityLogs: 'adega_activity_logs',
  settings: 'adega_settings',
  session: 'adega_session',
} as const;

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ===== INITIALIZATION =====
export function initializeData(): void {
  if (!localStorage.getItem(KEYS.products)) {
    set(KEYS.products, MOCK_PRODUCTS);
  }
  if (!localStorage.getItem(KEYS.users)) {
    set(KEYS.users, DEFAULT_USERS);
  }
  if (!localStorage.getItem(KEYS.settings)) {
    set<AppSettings>(KEYS.settings, {
      storeName: 'Adega Premium',
      storeAddress: 'Rua das Vinhas, 123',
      storePhone: '(11) 99999-9999',
      storeCNPJ: '12.345.678/0001-90',
      paymentConfigs: DEFAULT_PAYMENT_CONFIGS,
      darkMode: true,
    });
  }
  if (!localStorage.getItem(KEYS.sales)) set(KEYS.sales, []);
  if (!localStorage.getItem(KEYS.stockMovements)) set(KEYS.stockMovements, []);
  if (!localStorage.getItem(KEYS.activityLogs)) set(KEYS.activityLogs, []);
}

// ===== PRODUCTS =====
export const getProducts = (): Product[] => get(KEYS.products, []);
export const setProducts = (p: Product[]): void => set(KEYS.products, p);

export function saveProduct(product: Product): void {
  const products = getProducts();
  const idx = products.findIndex(p => p.id === product.id);
  if (idx >= 0) {
    products[idx] = { ...product, updatedAt: new Date().toISOString() };
  } else {
    products.push(product);
  }
  setProducts(products);
}

export function deleteProduct(id: string): void {
  setProducts(getProducts().filter(p => p.id !== id));
}

// ===== SALES =====
export const getSales = (): Sale[] => get(KEYS.sales, []);

export function saveSale(sale: Sale): void {
  const sales = getSales();
  sales.push(sale);
  set(KEYS.sales, sales);
  // Update stock
  const products = getProducts();
  sale.items.forEach(item => {
    const p = products.find(pr => pr.id === item.product.id);
    if (p) p.stock = Math.max(0, p.stock - item.quantity);
  });
  setProducts(products);
}

export function cancelSale(saleId: string): void {
  const sales = getSales();
  const sale = sales.find(s => s.id === saleId);
  if (sale) {
    sale.cancelled = true;
    set(KEYS.sales, sales);
    // Restore stock
    const products = getProducts();
    sale.items.forEach(item => {
      const p = products.find(pr => pr.id === item.product.id);
      if (p) p.stock += item.quantity;
    });
    setProducts(products);
  }
}

// ===== STOCK =====
export const getStockMovements = (): StockMovement[] => get(KEYS.stockMovements, []);

export function addStockMovement(movement: StockMovement): void {
  const movements = getStockMovements();
  movements.push(movement);
  set(KEYS.stockMovements, movements);
  // Update product stock
  const products = getProducts();
  const p = products.find(pr => pr.id === movement.productId);
  if (p) {
    p.stock = movement.newStock;
    p.updatedAt = new Date().toISOString();
    setProducts(products);
  }
}

// ===== USERS =====
export const getUsers = (): User[] => get(KEYS.users, []);

export function saveUser(user: User): void {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  set(KEYS.users, users);
}

export function deleteUser(id: string): void {
  set(KEYS.users, getUsers().filter(u => u.id !== id));
}

export function loginUser(email: string, password: string): User | null {
  return getUsers().find(u => u.email === email && u.password === password && u.active) || null;
}

// ===== SESSION =====
export const getSession = () => get(KEYS.session, null);
export const setSession = (s: unknown) => set(KEYS.session, s);
export const clearSession = () => localStorage.removeItem(KEYS.session);

// ===== SETTINGS =====
export const getSettings = (): AppSettings => get(KEYS.settings, {
  storeName: 'Adega', storeAddress: '', storePhone: '', storeCNPJ: '',
  paymentConfigs: DEFAULT_PAYMENT_CONFIGS, darkMode: true
});
export const saveSettings = (s: AppSettings) => set(KEYS.settings, s);

// ===== ACTIVITY LOG =====
export const getActivityLogs = (): ActivityLog[] => get(KEYS.activityLogs, []);

export function addActivityLog(type: ActivityType, description: string, userId: string, userName: string, metadata?: Record<string, unknown>): void {
  const logs = getActivityLogs();
  logs.push({ id: crypto.randomUUID(), type, description, userId, userName, date: new Date().toISOString(), metadata });
  set(KEYS.activityLogs, logs);
}

// ===== BACKUP =====
export function createBackup(): string {
  const backup: Record<string, unknown> = {};
  Object.entries(KEYS).forEach(([, key]) => {
    backup[key] = get(key, null);
  });
  return JSON.stringify(backup, null, 2);
}

export function restoreBackup(json: string): boolean {
  try {
    const data = JSON.parse(json);
    Object.entries(data).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
    return true;
  } catch {
    return false;
  }
}
