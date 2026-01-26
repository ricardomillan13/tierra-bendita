import { useState } from 'react';
import { Coffee, ClipboardList, Package, Monitor } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderCard } from '@/components/pos/OrderCard';
import { ProductManager } from '@/components/pos/ProductManager';
import { useOrders } from '@/hooks/useOrders';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function POS() {
  const { data: orders = [], isLoading } = useOrders();

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

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
              <h1 className="font-display text-xl font-bold">Café Aroma</h1>
              <p className="text-xs opacity-80">Panel de Administración</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
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
        </Tabs>
      </main>
    </div>
  );
}
