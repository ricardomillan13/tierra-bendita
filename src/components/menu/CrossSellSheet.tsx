import { useEffect, useState } from 'react';
import { X, Plus, Coffee, Sparkles } from 'lucide-react';
import { Product } from '@/types/menu';

interface CrossSellSheetProps {
  suggestion: Product | null;
  onAdd: (product: Product) => void;
  onDismiss: () => void;
}

export function CrossSellSheet({ suggestion, onAdd, onDismiss }: CrossSellSheetProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (suggestion) {
      // Small delay so animation plays after mount
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [suggestion]);

  if (!suggestion) return null;

  const handleAdd = () => {
    onAdd(suggestion);
    onDismiss();
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleDismiss}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-background rounded-t-2xl shadow-2xl mx-auto max-w-lg border-t border-border/60">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          <div className="px-5 pb-8 pt-2">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <p className="font-display font-semibold text-foreground text-base">
                  ¿Lo acompañas con algo?
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Product suggestion */}
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-accent/20 bg-accent/5">
              {/* Image */}
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-coffee-light/30 to-cream">
                {suggestion.image_url ? (
                  <img
                    src={suggestion.image_url}
                    alt={suggestion.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Coffee className="w-8 h-8 text-coffee-medium/40" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-foreground text-base leading-tight">
                  {suggestion.name}
                </p>
                {suggestion.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                    {suggestion.description}
                  </p>
                )}
                <p className="font-bold text-primary text-lg mt-1">
                  ${suggestion.price.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleDismiss}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
              >
                No, gracias
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 py-3 rounded-xl bg-accent text-accent-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar al pedido
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}