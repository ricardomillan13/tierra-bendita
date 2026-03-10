import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, X, Minus, Plus, Send, Loader2, UtensilsCrossed, ShoppingBag } from 'lucide-react';
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
  getItemId: (item: CartItem) => string;
}

type OrderType = 'here' | 'takeout';

export function Cart({ items, total, itemCount, onUpdateQuantity, onRemove, onClear, getItemId }: CartProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [notes, setNotes] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('here');
  const [orderSuccess, setOrderSuccess] = useState<number | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const createOrder = useCreateOrder();
  const { toast } = useToast();

  // When a field is focused, scroll it into view after keyboard opens
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350); // wait for keyboard animation to finish
  };

  const handleSubmit = async () => {
    if (!customerWhatsapp.trim()) {
      toast({
        title: 'WhatsApp requerido',
        description: 'Por favor ingresa tu número de WhatsApp',
        variant: 'destructive',
      });
      return;
    }

    const orderTypeLabel = orderType === 'here' ? 'Para aquí' : 'Para llevar';
    const fullNotes = [orderTypeLabel, notes.trim()].filter(Boolean).join(' · ');

    try {
      const order = await createOrder.mutateAsync({
        items,
        customerWhatsapp: customerWhatsapp.trim(),
        customerName: customerName.trim() || undefined,
        notes: fullNotes || undefined,
      });

      setOrderSuccess(order.order_number);
      onClear();
      setCustomerName('');
      setCustomerWhatsapp('');
      setNotes('');
      setOrderType('here');
    } catch {
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

      {/* 
        Key fix: no flex-col with fixed bottom section.
        SheetContent scrolls as one unit so keyboard never hides fields.
      */}
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-display text-xl">Tu Pedido</SheetTitle>
        </SheetHeader>

        {orderSuccess !== null ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4">
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
          <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Tu carrito está vacío</p>
          </div>

        ) : (
          <div className="space-y-4 pb-8">
            {/* Items */}
            <div className="space-y-3">
              {items.map((item) => {
                const itemId = getItemId(item);
                return (
                  <div
                    key={itemId}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.product.has_sizes && item.size && (
                          <span className="mr-1.5 px-1.5 py-0.5 rounded bg-muted text-xs font-medium">
                            {item.size === 'medium' ? 'Mediano' : 'Grande'}
                          </span>
                        )}
                        ${item.product.price.toFixed(2)} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8"
                        onClick={() => onUpdateQuantity(itemId, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8"
                        onClick={() => onUpdateQuantity(itemId, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => onRemove(itemId)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="flex justify-between text-lg font-semibold pt-1 border-t">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>

            {/* Para aquí / Para llevar */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOrderType('here')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                  orderType === 'here'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                Para aquí
              </button>
              <button
                onClick={() => setOrderType('takeout')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                  orderType === 'takeout'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                Para llevar
              </button>
            </div>

            {/* Form — scrolls into view on focus */}
            <div ref={formRef} className="space-y-3">
              <Input
                placeholder="Tu nombre (opcional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onFocus={handleFocus}
              />
              <Input
                placeholder="WhatsApp (requerido) *"
                value={customerWhatsapp}
                onChange={(e) => setCustomerWhatsapp(e.target.value)}
                onFocus={handleFocus}
                type="tel"
                inputMode="tel"
              />
              <Textarea
                placeholder="Notas adicionales (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onFocus={handleFocus}
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
        )}
      </SheetContent>
    </Sheet>
  );
}