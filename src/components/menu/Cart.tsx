import { useState } from 'react';
import { ShoppingCart, X, Minus, Plus, Send, Loader2 } from 'lucide-react';
import { CartItem } from '@/types/menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useCreateOrder } from '@/hooks/useOrders';
import { useToast } from '@/hooks/use-toast';

interface CartProps {
  items: CartItem[];
  total: number;
  itemCount: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
}

export function Cart({ items, total, itemCount, onUpdateQuantity, onRemove, onClear }: CartProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [notes, setNotes] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<number | null>(null);

  const createOrder = useCreateOrder();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!customerWhatsapp.trim()) {
      toast({
        title: 'WhatsApp requerido',
        description: 'Por favor ingresa tu número de WhatsApp',
        variant: 'destructive',
      });
      return;
    }

    try {
      const order = await createOrder.mutateAsync({
        items,
        customerWhatsapp: customerWhatsapp.trim(),
        customerName: customerName.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setOrderSuccess(order.order_number);
      onClear();
      setCustomerName('');
      setCustomerWhatsapp('');
      setNotes('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear el pedido. Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const resetOrderSuccess = () => {
    setOrderSuccess(null);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-strong bg-primary hover:bg-primary/90 z-50"
          size="icon"
        >
          <ShoppingCart className="h-6 w-6" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">Tu Pedido</SheetTitle>
        </SheetHeader>

        {orderSuccess !== null ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-4">
              <span className="text-4xl">☕</span>
            </div>
            <h3 className="font-display text-2xl font-bold mb-2">
              ¡Pedido #{orderSuccess} Enviado!
            </h3>
            <p className="text-muted-foreground mb-6">
              Te notificaremos por WhatsApp cuando esté listo.
            </p>
            <Button onClick={resetOrderSuccess} className="w-full">
              Cerrar
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${item.product.price.toFixed(2)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => onRemove(item.product.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Tu nombre (opcional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <Input
                  placeholder="WhatsApp (requerido) *"
                  value={customerWhatsapp}
                  onChange={(e) => setCustomerWhatsapp(e.target.value)}
                  type="tel"
                />
                <Textarea
                  placeholder="Notas adicionales (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={createOrder.isPending}
              >
                {createOrder.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar Pedido
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
