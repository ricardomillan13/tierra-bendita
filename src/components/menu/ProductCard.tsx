import { Plus, Coffee } from 'lucide-react';
import { Product } from '@/types/menu';
import { Button } from '@/components/ui/button';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <div className="glass-card rounded-xl p-4 animate-scale-in hover:shadow-medium transition-shadow duration-300">
      <div className="flex gap-4">
        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-coffee-light to-cream flex items-center justify-center flex-shrink-0 overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Coffee className="w-8 h-8 text-coffee-medium" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-foreground truncate">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="font-semibold text-lg text-primary">
              ${product.price.toFixed(2)}
            </span>
            <Button
              size="sm"
              onClick={() => onAdd(product)}
              className="rounded-full h-8 w-8 p-0 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
