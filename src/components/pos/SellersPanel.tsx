import { useState, useMemo } from 'react';
import { UserPlus, Package, BarChart2, ToggleLeft, ToggleRight, Loader2, TrendingUp, TrendingDown, Users, DollarSign, ShoppingBag, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useSellers, useCreateSeller, useToggleSellerActive,
  useSellerInventory, useUpsertSellerInventory,
  useAllSellersMetrics,
} from '@/hooks/useSellers';
import { useAllProducts } from '@/hooks/useProducts';
import { useAllCategories } from '@/hooks/useCategories';
import { useBusinessInventory, useUpsertBusinessInventory, useCreateShiftCloseout } from '@/hooks/useBusinessInventory';
import { useToast } from '@/hooks/use-toast';

// ── Design helpers ────────────────────────────────────────────────────────────
const GOLD = '#c9a84c';

// ── Create Seller Dialog ──────────────────────────────────────────────────────
function CreateSellerDialog() {
  const [open, setOpen]       = useState(false);
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const createSeller = useCreateSeller();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    const result = await createSeller.mutateAsync({ name: name.trim(), email: email.trim(), password });
    if (result) {
      setOpen(false);
      setName(''); setEmail(''); setPassword('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Nuevo vendedor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Crear vendedor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input
              placeholder="Nombre del vendedor"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="vendedor@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Contraseña temporal</Label>
            <Input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            El vendedor podrá iniciar sesión en <strong>/sales</strong> con estas credenciales.
          </p>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={createSeller.isPending}>
              {createSeller.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Inventory Manager ─────────────────────────────────────────────────────────
function InventoryManager() {
  const { data: sellers = [] }    = useSellers();
  const { data: products = [] }   = useAllProducts();
  const { data: categories = [] } = useAllCategories();
  const [selectedSeller, setSelectedSeller] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState<string>('');
  const [search, setSearch] = useState('');
  const { data: inventory = [], isLoading: invLoading } = useSellerInventory(selectedSeller || undefined);
  const upsert = useUpsertSellerInventory();
  const { toast } = useToast();

  // Solo categorías "Bolis" (Bolis de Agua, Bolis de Leche, Bolis Especiales, etc.)
  // pueden asignarse a vendedores.
  const bolisCategoryIds = useMemo(
    () => new Set(
      categories
        .filter(c => c.name.trim().toLowerCase().startsWith('bolis'))
        .map(c => c.id)
    ),
    [categories]
  );

  const bolisProducts = products
    .filter(p => p.is_available && p.category_id && bolisCategoryIds.has(p.category_id));

  const allProducts = bolisProducts
    .filter(p => p.name.toLowerCase().includes(search.trim().toLowerCase()));

  const { data: businessInventory = [] } = useBusinessInventory();
  const getGeneralStock = (productId: string) =>
    businessInventory.find(i => i.product_id === productId)?.quantity ?? 0;

  const getQty = (productId: string) =>
    inventory.find(i => i.product_id === productId)?.quantity ?? 0;

  const setQty = (productId: string, qty: number) => {
    if (!selectedSeller) return;
    const target = Math.max(0, qty);
    const current = getQty(productId);
    const delta = target - current; // + = se toma del inventario general, - = se regresa

    if (delta > 0 && delta > getGeneralStock(productId)) {
      toast({
        title: 'No hay suficiente inventario general',
        description: `Solo quedan ${getGeneralStock(productId)} unidades disponibles para asignar.`,
        variant: 'destructive',
      });
      return;
    }

    upsert.mutate({ seller_id: selectedSeller, product_id: productId, quantity: target, delta });
  };

  const handleEditCommit = (productId: string) => {
    const qty = Math.max(0, parseInt(editingVal) || 0);
    setQty(productId, qty);
    setEditingId(null);
  };

  const activeSellers = sellers.filter(s => s.is_active);
  const totalUnits = bolisProducts.reduce((s, p) => s + getQty(p.id), 0);
  const totalValue = bolisProducts.reduce((s, p) => s + getQty(p.id) * p.price, 0);

  return (
    <div className="space-y-4">
      {/* Seller selector */}
      <Select value={selectedSeller} onValueChange={setSelectedSeller}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecciona un vendedor" />
        </SelectTrigger>
        <SelectContent>
          {activeSellers.map(s => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedSeller && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Package className="w-10 h-10 opacity-30" />
          <p className="text-sm">Selecciona un vendedor para asignar inventario</p>
        </div>
      )}

      {selectedSeller && invLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedSeller && !invLoading && (
        <>
          {/* Búsqueda de productos */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="pl-9"
            />
          </div>

          {/* Summary bar */}
          {totalUnits > 0 && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">{totalUnits} unidades asignadas</span>
              </div>
              <span className="text-sm font-bold text-primary">${totalValue.toFixed(2)}</span>
            </div>
          )}

          {/* Product grid */}
          {allProducts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {search ? 'Sin resultados para tu búsqueda' : 'No hay productos Bolis disponibles'}
            </p>
          )}
          <div className="grid grid-cols-1 gap-2">
            {allProducts.map(product => {
              const qty = getQty(product.id);
              const hasQty = qty > 0;
              const isEditing = editingId === product.id;
              const generalStock = getGeneralStock(product.id);
              const atMax = generalStock <= 0;

              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all"
                  style={{
                    background: hasQty ? 'rgba(201,168,76,0.08)' : 'hsl(var(--secondary)/0.4)',
                    border: `1px solid ${hasQty ? 'rgba(201,168,76,0.3)' : 'transparent'}`,
                  }}
                >
                  {/* Product image */}
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden bg-secondary flex items-center justify-center">
                    {product.image_url
                      ? <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
                      : <img src="/logo.png" alt={product.name} className="w-full h-full object-contain rounded-full opacity-70 p-1" />
                    }
                  </div>

                  {/* Name + price */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${product.price.toFixed(2)} c/u · <span className={atMax ? 'text-destructive' : ''}>{generalStock} disp.</span>
                    </p>
                  </div>

                  {/* Counter */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setQty(product.id, qty - 1)}
                      disabled={qty === 0}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-light transition-all disabled:opacity-30 hover:bg-secondary active:scale-95"
                    >−</button>

                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        autoFocus
                        value={editingVal}
                        onChange={e => setEditingVal(e.target.value)}
                        onBlur={() => handleEditCommit(product.id)}
                        onKeyDown={e => { if (e.key === 'Enter') handleEditCommit(product.id); if (e.key === 'Escape') setEditingId(null); }}
                        className="w-14 h-9 text-center text-base font-bold rounded-lg border border-primary bg-background outline-none"
                        style={{ color: hasQty ? GOLD : undefined }}
                      />
                    ) : (
                      <button
                        onClick={() => { setEditingId(product.id); setEditingVal(String(qty)); }}
                        className="w-14 h-9 rounded-lg text-base font-bold transition-all hover:bg-secondary"
                        style={{ color: hasQty ? GOLD : 'hsl(var(--muted-foreground))' }}
                      >
                        {qty}
                      </button>
                    )}

                    <button
                      onClick={() => setQty(product.id, qty + 1)}
                      disabled={atMax}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-light transition-all disabled:opacity-30 hover:bg-secondary active:scale-95"
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick-fill all */}
          {totalUnits > 0 && (
            <button
              onClick={() => allProducts.forEach(p => setQty(p.id, 0))}
              className="w-full py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              Limpiar todo el inventario
            </button>
          )}
        </>
      )}
    </div>
  );

  // dead code below kept for structure — original closing tags removed
  return <></>;
}



// ── Business (General) Inventory Manager ────────────────────────────────────
function BusinessInventoryManager() {
  const { data: products = [] }   = useAllProducts();
  const { data: inventory = [], isLoading } = useBusinessInventory();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState<string>('');
  const upsert = useUpsertBusinessInventory();

  const getQty = (productId: string) =>
    inventory.find(i => i.product_id === productId)?.quantity ?? 0;

  const allProducts = products
    .filter(p => p.is_available)
    .filter(p => p.name.toLowerCase().includes(search.trim().toLowerCase()));

  const handleEditCommit = (productId: string) => {
    const qty = Math.max(0, parseInt(editingVal) || 0);
    upsert.mutate({ product_id: productId, quantity: qty });
    setEditingId(null);
  };

  const totalUnits = products.reduce((s, p) => s + getQty(p.id), 0);
  const totalValue = products.reduce((s, p) => s + getQty(p.id) * p.price, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="pl-9"
        />
      </div>

      {totalUnits > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{totalUnits} unidades en almacén</span>
          </div>
          <span className="text-sm font-bold text-primary">${totalValue.toFixed(2)}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {allProducts.map(product => {
          const qty = getQty(product.id);
          const isEditing = editingId === product.id;
          return (
            <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40">
              <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden bg-secondary flex items-center justify-center">
                {product.image_url
                  ? <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
                  : <img src="/logo.png" alt={product.name} className="w-full h-full object-contain rounded-full opacity-70 p-1" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">${product.price.toFixed(2)} c/u</p>
              </div>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  autoFocus
                  value={editingVal}
                  onChange={e => setEditingVal(e.target.value)}
                  onBlur={() => handleEditCommit(product.id)}
                  onKeyDown={e => { if (e.key === 'Enter') handleEditCommit(product.id); if (e.key === 'Escape') setEditingId(null); }}
                  className="w-20 h-9 text-center text-base font-bold rounded-lg border border-primary bg-background outline-none"
                />
              ) : (
                <button
                  onClick={() => { setEditingId(product.id); setEditingVal(String(qty)); }}
                  className="w-20 h-9 rounded-lg text-base font-bold transition-all hover:bg-secondary"
                  style={{ color: qty > 0 ? GOLD : undefined }}
                >
                  {qty}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shift Closeout ────────────────────────────────────────────────────────────
function ShiftCloseoutPanel() {
  const { data: sellers = [] } = useSellers();
  const [selectedSeller, setSelectedSeller] = useState<string>('');
  const { data: inventory = [], isLoading } = useSellerInventory(selectedSeller || undefined);
  const [returns, setReturns] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const createCloseout = useCreateShiftCloseout();
  const { toast } = useToast();

  const activeSellers = sellers.filter(s => s.is_active);
  const itemsWithStock = inventory.filter(i => i.quantity > 0);

  const handleSubmit = () => {
    if (!selectedSeller || itemsWithStock.length === 0) return;
    const items = itemsWithStock.map(i => ({
      product_id: i.product_id,
      product_name: i.product_name || 'Producto',
      system_qty: i.quantity,
      returned_qty: Math.max(0, Math.min(i.quantity, parseInt(returns[i.product_id] ?? '0') || 0)),
    }));
    createCloseout.mutate(
      { seller_id: selectedSeller, items, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          setSelectedSeller('');
          setReturns({});
          setNotes('');
        },
      }
    );
  };

  const totalShrinkage = itemsWithStock.reduce((s, i) => {
    const returned = Math.max(0, Math.min(i.quantity, parseInt(returns[i.product_id] ?? '0') || 0));
    return s + (i.quantity - returned);
  }, 0);

  return (
    <div className="space-y-4">
      <Select value={selectedSeller} onValueChange={v => { setSelectedSeller(v); setReturns({}); }}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecciona un vendedor para cerrar turno" />
        </SelectTrigger>
        <SelectContent>
          {activeSellers.map(s => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedSeller && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Package className="w-10 h-10 opacity-30" />
          <p className="text-sm">Selecciona un vendedor para registrar su cierre</p>
        </div>
      )}

      {selectedSeller && isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedSeller && !isLoading && itemsWithStock.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10">
          Este vendedor no tiene inventario pendiente por regresar.
        </p>
      )}

      {selectedSeller && !isLoading && itemsWithStock.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            "Sistema" = lo que debería tener sin vender, según ventas registradas. Captura lo que físicamente te regresa.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {itemsWithStock.map(item => {
              const returnedRaw = returns[item.product_id] ?? '';
              const returned = Math.max(0, Math.min(item.quantity, parseInt(returnedRaw) || 0));
              const missing = item.quantity - returned;
              return (
                <div key={item.product_id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Sistema: {item.quantity} · {missing > 0
                        ? <span className="text-destructive">Faltante: {missing}</span>
                        : <span className="text-success">Completo</span>}
                    </p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity}
                    placeholder="0"
                    value={returnedRaw}
                    onChange={e => setReturns(prev => ({ ...prev, [item.product_id]: e.target.value }))}
                    className="w-20 h-9 text-center text-base font-bold rounded-lg border border-primary bg-background outline-none"
                  />
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label>Notas (opcional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej. faltante reportado por el vendedor" />
          </div>

          {totalShrinkage > 0 && (
            <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
              {totalShrinkage} unidades sin regresar ni justificar con venta — quedarán registradas como merma.
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={createCloseout.isPending}
          >
            {createCloseout.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar cierre de turno'}
          </Button>
        </>
      )}
    </div>
  );
}

// ── Metrics Dashboard ─────────────────────────────────────────────────────────
function MetricsDashboard() {
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const fromDate = (() => {
    const now = new Date();
    if (range === 'today') {
      const d = new Date(now); d.setHours(0,0,0,0); return d.toISOString();
    }
    if (range === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString();
    }
    if (range === 'month') {
      const d = new Date(now); d.setDate(d.getDate() - 30); return d.toISOString();
    }
    return undefined;
  })();

  const { data: metrics, isLoading } = useAllSellersMetrics(fromDate);

  const rangeLabels = { today: 'Hoy', week: '7 días', month: '30 días', all: 'Todo' };

  return (
    <div className="space-y-5">
      {/* Range selector */}
      <div className="flex gap-2">
        {(Object.keys(rangeLabels) as (keyof typeof rangeLabels)[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: range === r ? GOLD : 'transparent',
              color: range === r ? '#000' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${range === r ? GOLD : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            {rangeLabels[r]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !metrics ? null : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard
              icon={<DollarSign className="w-4 h-4" />}
              label="Ventas totales"
              value={`$${metrics.total_sales.toFixed(2)}`}
              color="#00C853"
            />
            <KPICard
              icon={<ShoppingBag className="w-4 h-4" />}
              label="Órdenes"
              value={String(metrics.total_orders)}
              color={GOLD}
            />
            <KPICard
              icon={<Users className="w-4 h-4" />}
              label="Vendedores activos"
              value={String(metrics.sellers.length)}
              color="#60a5fa"
            />
            <KPICard
              icon={<DollarSign className="w-4 h-4" />}
              label="Promedio por orden"
              value={metrics.total_orders > 0
                ? `$${(metrics.total_sales / metrics.total_orders).toFixed(2)}`
                : '$0.00'}
              color="#f472b6"
            />
          </div>

          {/* Per-seller breakdown */}
          {metrics.sellers.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                Por vendedor
              </h4>
              <div className="space-y-2">
                {metrics.sellers.map(s => (
                  <div key={s.seller_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/40">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.orders} órden{s.orders !== 1 ? 'es' : ''}</p>
                    </div>
                    <span className="font-bold" style={{ color: GOLD }}>${s.sales.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top / Least sold */}
          <div className="grid md:grid-cols-2 gap-5">
            <ProductRanking
              title="Más vendidos"
              items={metrics.top_products}
              icon={<TrendingUp className="w-4 h-4 text-green-400" />}
            />
            <ProductRanking
              title="Menos vendidos"
              items={metrics.least_sold}
              icon={<TrendingDown className="w-4 h-4 text-red-400" />}
            />
          </div>

          {metrics.total_orders === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">
              Sin ventas en este período
            </p>
          )}
        </>
      )}
    </div>
  );
}

function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-4 bg-secondary/40 space-y-1">
      <div className="flex items-center gap-2" style={{ color }}>
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function ProductRanking({ title, items, icon }: {
  title: string;
  items: { product_name: string; qty: number; total: number }[];
  icon: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
        {icon} {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin datos</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={item.product_name}
              className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                <span className="text-sm font-medium">{item.product_name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: GOLD }}>{item.qty} pzas</p>
                <p className="text-xs text-muted-foreground">${item.total.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main SellersPanel ─────────────────────────────────────────────────────────
export function SellersPanel() {

  return (
    <Tabs defaultValue="inventory" className="space-y-4">
      <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="closeout" className="flex items-center gap-2">
            <ToggleRight className="w-4 h-4" />
            Cierre de turno
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4" />
            Métricas
          </TabsTrigger>
        </TabsList>

      {/* ── General inventory tab ── */}
      <TabsContent value="general">
        <BusinessInventoryManager />
      </TabsContent>

      {/* ── Inventory tab ── */}
      <TabsContent value="inventory">
        <InventoryManager />
      </TabsContent>

      {/* ── Shift closeout tab ── */}
      <TabsContent value="closeout">
        <ShiftCloseoutPanel />
      </TabsContent>

      {/* ── Metrics tab ── */}
      <TabsContent value="metrics">
        <MetricsDashboard />
      </TabsContent>
    </Tabs>
  );
}

      </TabsContent>
    </Tabs>
  );
}
