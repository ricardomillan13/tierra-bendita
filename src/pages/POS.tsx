import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, ClipboardList, Package, Monitor, DollarSign, LogOut, Loader2, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderCard } from '@/components/pos/OrderCard';
import { OrderHistory } from '@/components/pos/OrderHistory';
import { ProductManager } from '@/components/pos/ProductManager';
import { CashRegister } from '@/components/pos/CashRegister';
import { QRCodeDisplay } from '@/components/pos/QRCodeDisplay';
import { SettingsPanel } from '@/components/pos/SettingsPanel';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { useSettings, useUpdateSetting } from '@/hooks/useSettings';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function POS() {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const { data: orders = [], isLoading } = useOrders();
  const { data: settings } = useSettings();
  const updateSetting = useUpdateSetting();
  const isOpen = settings?.is_open ?? true;

  const toggleOpen = () => {
    updateSetting.mutate({ key: 'is_open', value: !isOpen });
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
    if (!authLoading && user && !isAdmin) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  const menuUrl = settings?.menu_url || `${window.location.origin}/menu`;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-espresso text-primary-foreground p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Tierra Bendita Chocolate & Coffee Shop</h1>
              <p className="text-xs opacity-80">Panel de Administración</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Open/Closed toggle */}
            <button
              onClick={toggleOpen}
              disabled={updateSetting.isPending}
              style={isOpen
                ? { background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.5)', color: '#4ade80' }
                : { background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', color: '#f87171' }
              }
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
            >
              <span
                className={isOpen ? 'animate-pulse' : ''}
                style={{ width: 8, height: 8, borderRadius: '50%', background: isOpen ? '#4ade80' : '#f87171', display: 'inline-block', flexShrink: 0 }}
              />
              {isOpen ? 'Abierto' : 'Cerrado'}
            </button>
            <QRCodeDisplay menuUrl={menuUrl} />
            <SettingsPanel />
            <Link to="/display">
              <Button variant="secondary" size="sm">
                <Monitor className="w-4 h-4 mr-1" />
                Display
              </Button>
            </Link>
            <Link to="/menu">
              <Button variant="secondary" size="sm">
                Ver Menú
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground hover:bg-primary-foreground/10">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Pedidos
              {orders.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-bold">
                  {orders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Productos
            </TabsTrigger>
            <TabsTrigger value="cash" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Caja
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            {isLoading ? (
              <div className="grid md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 rounded-xl bg-secondary animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-display text-xl mb-2">Sin pedidos activos</h3>
                <p className="text-muted-foreground">Los nuevos pedidos aparecerán aquí automáticamente</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {/* Pending Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <h3 className="font-display font-semibold">Pendientes ({pendingOrders.length})</h3>
                  </div>
                  {pendingOrders.map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>

                {/* Preparing Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-info" />
                    <h3 className="font-display font-semibold">Preparando ({preparingOrders.length})</h3>
                  </div>
                  {preparingOrders.map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>

                {/* Ready Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <h3 className="font-display font-semibold">Listos ({readyOrders.length})</h3>
                  </div>
                  {readyOrders.map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="products">
            <ProductManager />
          </TabsContent>

          <TabsContent value="cash">
            <CashRegister />
          </TabsContent>

          <TabsContent value="history">
            <OrderHistory />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}