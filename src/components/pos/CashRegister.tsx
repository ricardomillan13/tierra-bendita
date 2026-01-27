import { useState } from 'react';
import { DollarSign, TrendingUp, Package, Coffee, Calendar, Loader2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useTodaysSales, useCashRegisterClosings, useCreateCashClosing } from '@/hooks/useCashRegister';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function CashRegister() {
  const [notes, setNotes] = useState('');
  const [isClosingDialogOpen, setIsClosingDialogOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const { data: todaysSales, isLoading: salesLoading } = useTodaysSales();
  const { data: closings = [], isLoading: closingsLoading } = useCashRegisterClosings();
  const createClosing = useCreateCashClosing();
  const { toast } = useToast();

  const handleCloseRegister = async () => {
    if (!todaysSales) return;

    try {
      await createClosing.mutateAsync({
        total_sales: todaysSales.totalSales,
        total_orders: todaysSales.totalOrders,
        orders_by_category: todaysSales.ordersByCategory,
        top_products: todaysSales.topProducts,
        notes: notes.trim() || undefined,
      });

      toast({
        title: '¡Corte de caja realizado!',
        description: `Total del día: $${todaysSales.totalSales.toFixed(2)}`,
      });

      setNotes('');
      setIsClosingDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message?.includes('duplicate') 
          ? 'Ya existe un corte de caja para hoy' 
          : 'Error al realizar el corte de caja',
        variant: 'destructive',
      });
    }
  };

  if (salesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Día</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${todaysSales?.totalSales.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysSales?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">pedidos completados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${todaysSales && todaysSales.totalOrders > 0 
                ? (todaysSales.totalSales / todaysSales.totalOrders).toFixed(2) 
                : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">por pedido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
            <Coffee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(todaysSales?.ordersByCategory || {}).length}
            </div>
            <p className="text-xs text-muted-foreground">con ventas hoy</p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown and top products */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ventas por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(todaysSales?.ordersByCategory || {}).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Sin ventas hoy</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(todaysSales?.ordersByCategory || {}).map(([category, data]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{category}</p>
                      <p className="text-sm text-muted-foreground">{data.count} items</p>
                    </div>
                    <span className="font-semibold">${data.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {(todaysSales?.topProducts || []).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Sin ventas hoy</p>
            ) : (
              <div className="space-y-3">
                {todaysSales?.topProducts.slice(0, 5).map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.quantity} vendidos</p>
                      </div>
                    </div>
                    <span className="font-semibold">${product.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Dialog open={isClosingDialogOpen} onOpenChange={setIsClosingDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="flex-1">
              <FileText className="w-4 h-4 mr-2" />
              Realizar Corte de Caja
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Corte de Caja</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span>Total de ventas:</span>
                  <span className="font-bold">${todaysSales?.totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pedidos completados:</span>
                  <span className="font-bold">{todaysSales?.totalOrders}</span>
                </div>
              </div>
              <Textarea
                placeholder="Notas adicionales (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsClosingDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCloseRegister} disabled={createClosing.isPending}>
                {createClosing.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar Corte
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* History */}
      <Collapsible open={showHistory} onOpenChange={setShowHistory}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Historial de Cortes</span>
            </div>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-4">
            <CardContent className="pt-6">
              {closingsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : closings.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No hay cortes registrados</p>
              ) : (
                <div className="space-y-4">
                  {closings.map((closing) => (
                    <div key={closing.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div>
                        <p className="font-medium">
                          {format(new Date(closing.closing_date), "EEEE d 'de' MMMM", { locale: es })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {closing.total_orders} pedidos
                          {closing.notes && ` • ${closing.notes}`}
                        </p>
                      </div>
                      <span className="text-lg font-bold">${Number(closing.total_sales).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
