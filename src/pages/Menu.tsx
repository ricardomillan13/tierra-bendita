import { useState, useMemo } from 'react';
import { Coffee } from 'lucide-react';
import { useCategories, useProducts } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { CategoryTabs } from '@/components/menu/CategoryTabs';
import { ProductCard } from '@/components/menu/ProductCard';
import { Cart } from '@/components/menu/Cart';

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const cart = useCart();

  const filteredProducts = useMemo(() => {
    if (!activeCategory) return products;
    return products.filter((p) => p.category_id === activeCategory);
  }, [products, activeCategory]);

  const isLoading = categoriesLoading || productsLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-warm text-primary-foreground p-6 pb-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Café Aroma</h1>
              <p className="text-sm opacity-90">Menú Digital</p>
            </div>
          </div>
        </div>
      </header>

      {/* Categories */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 px-4 py-4 border-b">
        <div className="max-w-md mx-auto">
          {!isLoading && (
            <CategoryTabs
              categories={categories}
              activeCategory={activeCategory}
              onSelect={setActiveCategory}
            />
          )}
        </div>
      </div>

      {/* Products */}
      <main className="max-w-md mx-auto p-4 pb-24">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 rounded-xl bg-secondary animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Coffee className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay productos disponibles</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={cart.addItem}
              />
            ))}
          </div>
        )}
      </main>

      {/* Cart */}
      <Cart
        items={cart.items}
        total={cart.total}
        itemCount={cart.itemCount}
        onUpdateQuantity={cart.updateQuantity}
        onRemove={cart.removeItem}
        onClear={cart.clearCart}
      />
    </div>
  );
}
