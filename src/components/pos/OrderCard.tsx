import { useState } from 'react';
import { Clock, CheckCircle, ChefHat, MessageCircle, Printer, ChevronDown, ChevronUp, AlertCircle, XCircle } from 'lucide-react';
import { Order, OrderItem } from '@/types/menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useOrderItems, useUpdateOrderStatus, useMarkWhatsAppNotified } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface OrderCardProps {
  order: Order;
}

const statusConfig = {
  pending: {
    label: 'Pendiente',
    icon: Clock,
    color: 'bg-warning/20 text-warning border-warning/30',
  },
  preparing: {
    label: 'Preparando',
    icon: ChefHat,
    color: 'bg-info/20 text-info border-info/30',
  },
  ready: {
    label: 'Listo',
    icon: CheckCircle,
    color: 'bg-success/20 text-success border-success/30',
  },
  completed: {
    label: 'Completado',
    icon: CheckCircle,
    color: 'bg-muted text-muted-foreground border-muted',
  },
  cancelled: {
    label: 'Cancelado',
    icon: Clock,
    color: 'bg-destructive/20 text-destructive border-destructive/30',
  },
};

export function OrderCard({ order }: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showWhatsAppConfirm, setShowWhatsAppConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<'ready' | null>(null);
  
  const { data: items = [] } = useOrderItems(order.id);
  const { data: settings } = useSettings();
  const updateStatus = useUpdateOrderStatus();
  const markNotified = useMarkWhatsAppNotified();
  const { toast } = useToast();

  const status = statusConfig[order.status];
  const StatusIcon = status.icon;

  const sendWhatsApp = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: order.customer_whatsapp,
          orderNumber: order.order_number,
          customerName: order.customer_name || undefined,
        },
      });

      if (error) throw error;

      markNotified.mutate(order.id);
      toast({
        title: '✓ WhatsApp enviado',
        description: `Notificación enviada al pedido #${order.order_number}`,
      });
    } catch (err) {
      console.error('Error enviando WhatsApp:', err);
      toast({
        title: 'Error al enviar WhatsApp',
        description: 'Revisa la configuración de Twilio',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = (newStatus: Order['status']) => {
    if (newStatus === 'ready' && settings?.whatsapp_auto_notify?.enabled && !order.whatsapp_notified) {
      // Show confirmation dialog
      setPendingStatusChange('ready');
      setShowWhatsAppConfirm(true);
    } else {
      updateStatus.mutate({ id: order.id, status: newStatus });
    }
  };

  const handleWhatsAppConfirm = (sendNotification: boolean) => {
    updateStatus.mutate({ id: order.id, status: 'ready' });
    
    if (sendNotification) {
      // Small delay to ensure status is updated first
      setTimeout(() => {
        sendWhatsApp();
      }, 300);
    }
    
    setShowWhatsAppConfirm(false);
    setPendingStatusChange(null);
  };

  const handleManualWhatsApp = () => {
    sendWhatsApp();
  };

  const handlePrint = () => {
    const printContent = `
      CAFÉ AROMA
      ================
      Pedido #${order.order_number}
      ${new Date(order.created_at).toLocaleString('es')}
      ----------------
      ${items.map(item => `${item.quantity}x ${item.product_name} - $${item.subtotal.toFixed(2)}`).join('\n      ')}
      ----------------
      TOTAL: $${order.total.toFixed(2)}
      ================
      Cliente: ${order.customer_name || 'N/A'}
      WhatsApp: ${order.customer_whatsapp}
      ${order.notes ? `Notas: ${order.notes}` : ''}
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<pre style="font-family: monospace; font-size: 14px;">${printContent}</pre>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const timeSinceOrder = () => {
    const diff = Date.now() - new Date(order.created_at).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  return (
    <>
      <div className="glass-card rounded-xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div
          className="p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl font-bold text-primary">
                #{order.order_number}
              </span>
              <Badge className={cn('border', status.color)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              {order.whatsapp_notified && (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Notificado
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{timeSinceOrder()}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-muted-foreground">Cliente: </span>
              <span className="font-medium">{order.customer_name || 'Sin nombre'}</span>
            </div>
            <span className="font-semibold text-lg">${order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t p-4 space-y-4">
            {/* Items */}
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    <span className="font-medium">{item.quantity}x</span> {item.product_name}
                  </span>
                  <span className="text-muted-foreground">${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {order.notes && (
              <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                <span className="text-muted-foreground">Notas: </span>
                {order.notes}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {order.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange('preparing')}
                    className="flex-1"
                  >
                    <ChefHat className="w-4 h-4 mr-1" />
                    Preparar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCancelConfirm(true)}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </>
              )}
              {order.status === 'preparing' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange('ready')}
                    className="flex-1 bg-success hover:bg-success/90"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Listo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCancelConfirm(true)}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </>
              )}
              {order.status === 'ready' && (
                <>
                  {!order.whatsapp_notified && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleManualWhatsApp}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      WhatsApp
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange('completed')}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Completar
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Cancelar pedido #{order.order_number}
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas cancelar este pedido? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => { updateStatus.mutate({ id: order.id, status: 'cancelled' }); setShowCancelConfirm(false); }}
            >
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* WhatsApp Confirmation Dialog */}
      <AlertDialog open={showWhatsAppConfirm} onOpenChange={setShowWhatsAppConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-success" />
              Notificar por WhatsApp
            </AlertDialogTitle>
            <AlertDialogDescription>
              El pedido #{order.order_number} está listo. ¿Deseas enviar la notificación por WhatsApp al cliente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleWhatsAppConfirm(false)}>
              Solo marcar listo
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleWhatsAppConfirm(true)}>
              Enviar WhatsApp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}