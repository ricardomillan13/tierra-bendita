import { useState, useMemo, useCallback, useRef } from 'react';
import { Coffee, Tag, Star, Sparkles } from 'lucide-react';
import { useCategories, useProducts, usePromotions } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { useSettings } from '@/hooks/useSettings';
import { CategoryTabs } from '@/components/menu/CategoryTabs';
import { ProductCard } from '@/components/menu/ProductCard';
import { PromotionCard } from '@/components/menu/PromotionCard';
import { FeaturedCard } from '@/components/menu/FeaturedCard';
import { CrossSellSheet } from '@/components/menu/CrossSellSheet';
import { Cart } from '@/components/menu/Cart';
import type { Product } from '@/types/menu';

// ── Design tokens (dark luxury) ───────────────────────────────────────────────
const ESPRESSO  = '#0f0602';
const DARK      = '#1a0a02';
const SURFACE   = '#231008';
const GOLD      = '#c9a84c';
const GOLD_DIM  = 'rgba(201,168,76,0.5)';

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: products = [],   isLoading: productsLoading  } = useProducts();
  const { data: promotions = [] } = usePromotions();
  const { data: settings }        = useSettings();
  const cart = useCart();

  const [crossSellSuggestion, setCrossSellSuggestion] = useState<Product | null>(null);
  const shownSuggestionsRef = useRef<Set<string>>(new Set());

  const crossSellProducts = useMemo(
    () => products.filter(p => p.is_cross_sell && p.is_available),
    [products]
  );

  const handleAddItem = useCallback((product: Product, size?: 'medium' | 'large') => {
    cart.addItem(product, size);
    if (!product.is_cross_sell && crossSellProducts.length > 0) {
      const unseen = crossSellProducts.filter(p => !shownSuggestionsRef.current.has(p.id));
      const pool = unseen.length > 0 ? unseen : crossSellProducts;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick.id !== product.id) {
        shownSuggestionsRef.current.add(pick.id);
        setTimeout(() => setCrossSellSuggestion(pick), 400);
      }
    }
  }, [cart, crossSellProducts]);

  const featuredProducts = useMemo(
    () => products.filter(p => p.is_featured && p.is_available),
    [products]
  );

  const filteredProducts = useMemo(() => {
    if (!activeCategory) return products;
    return products.filter(p => p.category_id === activeCategory);
  }, [products, activeCategory]);

  const groupedProducts = useMemo(() => {
    if (activeCategory) return null;
    return categories
      .map(cat => ({ category: cat, products: products.filter(p => p.category_id === cat.id) }))
      .filter(g => g.products.length > 0);
  }, [categories, products, activeCategory]);

  const isLoading = categoriesLoading || productsLoading;
  const dailyPhrase = settings?.daily_phrase || 'El mejor momento para un buen café... es ahora.';

  return (
    <div className="min-h-screen" style={{ background: ESPRESSO, color: 'rgba(255,255,255,0.85)' }}>

      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden" style={{ background: DARK }}>
        {/* Radial glow behind logo */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 80% at 50% 0%, rgba(201,168,76,0.12) 0%, transparent 70%)` }} />

        {/* Decorative rings */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
          style={{ border: `1px solid ${GOLD}18` }} />
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
          style={{ border: `1px solid ${GOLD}10` }} />

        <div className="relative max-w-lg mx-auto px-5 pt-10 pb-8 text-center">
          {/* Logo */}
          <div className="mx-auto mb-4 w-24 h-24 rounded-full overflow-hidden shadow-2xl"
            style={{ border: `2px solid ${GOLD}40`, boxShadow: `0 0 40px ${GOLD}20` }}>
            <img src="/logo.png" alt="Tierra Bendita" className="w-full h-full object-cover" />
          </div>

          {/* Name */}
          <h1 className="font-display font-bold leading-tight mb-1"
            style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: GOLD }}>
            Tierra Bendita
          </h1>
          <p className="text-xs font-medium tracking-[0.2em] uppercase mb-5"
            style={{ color: GOLD_DIM }}>
            Chocolate & Coffee Shop
          </p>

          {/* Daily phrase */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${GOLD}30)` }} />
            <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: GOLD_DIM }} />
            <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${GOLD}30)` }} />
          </div>
          <p className="mt-3 text-sm italic font-light leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {dailyPhrase}
          </p>
        </div>
      </header>

      {/* ── Sticky category filter ───────────────────────────────────────── */}
      <div className="sticky top-0 z-40 px-4 py-3"
        style={{ background: `${DARK}f0`, backdropFilter: 'blur(12px)', borderBottom: `1px solid rgba(201,168,76,0.08)` }}>
        <div className="max-w-lg mx-auto">
          {!isLoading && (
            <CategoryTabs
              categories={categories}
              activeCategory={activeCategory}
              onSelect={setActiveCategory}
            />
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="max-w-lg mx-auto px-4 pb-28">
        {isLoading ? (
          <div className="pt-4 space-y-0">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="w-14 h-14 rounded-xl flex-shrink-0 animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.05)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 rounded animate-pulse w-3/5" style={{ background: 'rgba(255,255,255,0.07)' }} />
                  <div className="h-3 rounded animate-pulse w-2/5"   style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>

            {/* ── Sugerencias del día ──── */}
            {featuredProducts.length > 0 && !activeCategory && (
              <div className="pt-6">
                <SectionLabel icon={<Star className="w-3 h-3 fill-current" style={{ color: GOLD }} />} label="Sugerencias del día" gold />
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 mt-3">
                  {featuredProducts.map(product => (
                    <FeaturedCard key={product.id} product={product} onAdd={handleAddItem} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Promociones ──────────── */}
            {promotions.length > 0 && !activeCategory && (
              <div className="pt-6">
                <SectionLabel icon={<Tag className="w-3 h-3" style={{ color: GOLD }} />} label="Promociones" />
                {promotions.map(promo => (
                  <PromotionCard key={promo.id} promotion={promo} onAdd={handleAddItem} />
                ))}
              </div>
            )}

            {/* ── Products ─────────────── */}
            {filteredProducts.length === 0 && promotions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20" style={{ color: 'rgba(255,255,255,0.25)' }}>
                <Coffee className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">No hay productos disponibles</p>
              </div>
            ) : activeCategory ? (
              <div className="pt-4">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} onAdd={handleAddItem} />
                ))}
              </div>
            ) : (
              <div className="pt-4">
                {groupedProducts?.map(group => (
                  <div key={group.category.id} className="mb-2">
                    <SectionLabel label={group.category.name} className="pt-4 mb-1" />
                    {group.products.map(product => (
                      <ProductCard key={product.id} product={product} onAdd={handleAddItem} />
                    ))}
                  </div>
                ))}
                {(() => {
                  const uncategorized = products.filter(p => !p.category_id);
                  return uncategorized.length > 0 ? (
                    <div className="mb-2">
                      <SectionLabel label="Otros" className="pt-4 mb-1" />
                      {uncategorized.map(product => (
                        <ProductCard key={product.id} product={product} onAdd={handleAddItem} />
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        )}
      </main>

      <CrossSellSheet
        suggestion={crossSellSuggestion}
        onAdd={p => cart.addItem(p)}
        onDismiss={() => setCrossSellSuggestion(null)}
      />

      <Cart
        items={cart.items}
        total={cart.total}
        itemCount={cart.itemCount}
        onUpdateQuantity={cart.updateQuantity}
        onRemove={cart.removeItem}
        onClear={cart.clearCart}
        getItemId={cart.getItemId}
      />
    </div>
  );
}

// ── Helper component ──────────────────────────────────────────────────────────
function SectionLabel({
  icon, label, gold, className = '',
}: {
  icon?: React.ReactNode;
  label: string;
  gold?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 px-1 ${className}`}>
      {icon}
      <span
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: gold ? 'rgba(201,168,76,0.7)' : 'rgba(255,255,255,0.3)' }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: gold ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.05)' }} />
    </div>
  );
}