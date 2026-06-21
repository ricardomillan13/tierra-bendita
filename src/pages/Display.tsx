import { useState, useEffect, useMemo } from 'react';
import { Coffee, Maximize, QrCode, Tag } from 'lucide-react';
import { useAllProducts, useCategories, usePromotions } from '@/hooks/useProducts';
import { useSettings } from '@/hooks/useSettings';
import { isProductAvailableNow } from '@/lib/schedule';
import { Button } from '@/components/ui/button';
import { QRCodeDisplay } from '@/components/pos/QRCodeDisplay';

type Slide =
  | { type: 'category'; catIndex: number; page: number; totalPages: number }
  | { type: 'promotions' };

// Cuántos productos mostramos por página — 4 columnas x 2 filas, nunca se corta
const PRODUCTS_PER_PAGE = 8;

export default function Display() {
  const { data: allProducts = [] } = useAllProducts();
  const { data: categories = [] } = useCategories();
  const { data: promotions = [] } = usePromotions();
  const { data: settings } = useSettings();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [showQR, setShowQR] = useState(false);

  // Intervalo configurable desde el POS (default 8s)
  const intervalMs = (settings?.display_interval_seconds ?? 8) * 1000;

  const displayProducts = useMemo(
    () => allProducts.filter(p => p.is_available && p.show_in_display && isProductAvailableNow(p)),
    [allProducts]
  );

  const productsByCategory = useMemo(
    () =>
      categories
        .map(cat => ({
          category: cat,
          products: displayProducts.filter(p => p.category_id === cat.id),
        }))
        .filter(group => group.products.length > 0),
    [categories, displayProducts]
  );

  const slides: Slide[] = useMemo(() => {
    const result: Slide[] = [];
    productsByCategory.forEach((group, catIndex) => {
      const totalPages = Math.max(1, Math.ceil(group.products.length / PRODUCTS_PER_PAGE));
      for (let page = 0; page < totalPages; page++) {
        result.push({ type: 'category', catIndex, page, totalPages });
      }
    });
    if (promotions.length > 0) result.push({ type: 'promotions' });
    return result;
  }, [productsByCategory, promotions.length]);

  // Auto-avance con intervalo configurable
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [slides.length, intervalMs]);

  useEffect(() => {
    if (slides.length > 0 && currentSlide >= slides.length) {
      setCurrentSlide(0);
    }
  }, [slides.length, currentSlide]);

  useEffect(() => {
    if (!settings?.menu_url) return;
    const qrInterval = setInterval(() => {
      setShowQR(true);
      setTimeout(() => setShowQR(false), 5000);
    }, 30000);
    return () => clearInterval(qrInterval);
  }, [settings?.menu_url]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  const menuUrl = settings?.menu_url || `${window.location.origin}/menu`;
  const currentSlideData = slides[currentSlide];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-espresso via-coffee-dark to-espresso text-primary-foreground relative">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-caramel blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-cream blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-8 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Tierra Bendita" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-display text-4xl font-bold">Tierra Bendita</h1>
            <p className="text-lg opacity-80">Chocolate & Coffee Shop</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowQR(!showQR)}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10">
            <QrCode className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10">
            <Maximize className="w-6 h-6" />
          </Button>
        </div>
      </header>

      {/* QR Overlay */}
      {showQR && menuUrl && (
        <div className="absolute inset-0 z-20 bg-espresso/90 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold mb-6">¡Ordena desde tu celular!</h2>
            <QRCodeDisplay menuUrl={menuUrl} showButton={false} size={250} className="text-primary-foreground" />
            <p className="mt-6 text-lg opacity-80">Escanea el código QR para ver el menú</p>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="relative z-10 p-8 pt-4 flex-1 overflow-hidden flex flex-col">
        {slides.length === 0 ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <img src="/logo.png" alt="Tierra Bendita" className="w-24 h-24 mx-auto mb-6 rounded-full opacity-50 object-cover" />
              <p className="text-2xl opacity-70">No hay productos configurados para el display</p>
            </div>
          </div>
        ) : currentSlideData?.type === 'category' ? (
          <div className="animate-fade-in flex-1 min-h-0 flex flex-col" key={`cat-${currentSlideData.catIndex}-${currentSlideData.page}`}>
            {(() => {
              const group = productsByCategory[currentSlideData.catIndex];
              if (!group) return null;
              const { page, totalPages } = currentSlideData;
              const pageProducts = group.products.slice(
                page * PRODUCTS_PER_PAGE,
                page * PRODUCTS_PER_PAGE + PRODUCTS_PER_PAGE
              );
              return (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="text-center mb-4 flex-shrink-0">
                    <h2 className="font-display text-4xl font-bold mb-1">
                      {group.category.name}
                      {totalPages > 1 && (
                        <span className="text-xl font-normal opacity-50 ml-3">
                          {page + 1}/{totalPages}
                        </span>
                      )}
                    </h2>
                    {group.category.description && (
                      <p className="text-lg opacity-80">{group.category.description}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full flex-1 min-h-0 auto-rows-fr">
                    {pageProducts.map((product, index) => (
                      <div key={product.id}
                        className="bg-primary-foreground/10 backdrop-blur-md rounded-xl p-3 border border-primary-foreground/20 animate-slide-up flex flex-col min-h-0 overflow-hidden"
                        style={{ animationDelay: `${index * 80}ms` }}>
                        <div className="w-full flex-1 min-h-0 rounded-lg bg-gradient-to-br from-coffee-light/20 to-cream/20 flex items-center justify-center mb-2 overflow-hidden">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <img src="/logo.png" alt={product.name} className="w-1/2 h-1/2 object-contain rounded-full opacity-70" />
                          )}
                        </div>
                        <h3 className="font-display text-base font-semibold text-center leading-tight line-clamp-2 flex-shrink-0">{product.name}</h3>
                          {product.description && (
                          <p className="text-xs text-center opacity-60 leading-tight line-clamp-2 mt-1 flex-shrink-0">{product.description}</p>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="animate-fade-in flex-1 min-h-0 flex flex-col" key="promotions">
            <div className="text-center mb-6 flex-shrink-0">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Tag className="w-8 h-8 text-caramel" />
                <h2 className="font-display text-5xl font-bold">Promociones</h2>
                <Tag className="w-8 h-8 text-caramel" />
              </div>
              <p className="text-xl opacity-80">Ofertas especiales de hoy</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto flex-1 min-h-0 overflow-hidden content-start">
              {promotions.map((promo, index) => (
                <div key={promo.id}
                  className="bg-primary-foreground/10 backdrop-blur-md rounded-2xl p-8 border border-caramel/30 animate-slide-up relative overflow-hidden"
                  style={{ animationDelay: `${index * 120}ms` }}>
                  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-caramel/20 blur-2xl" />
                  {promo.badge_text && (
                    <div className="inline-block px-3 py-1 rounded-full bg-caramel text-espresso text-sm font-bold mb-4">
                      {promo.badge_text}
                    </div>
                  )}
                  <h3 className="font-display text-2xl font-bold mb-3">{promo.title}</h3>
                  {promo.discount_type === 'price' && promo.discount_value && (
                    <p className="text-5xl font-black text-caramel mb-3">${promo.discount_value.toFixed(2)}</p>
                  )}
                  {promo.description && <p className="text-lg opacity-80">{promo.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Slide indicators */}
      {slides.length > 1 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, index) => (
            <button key={index} onClick={() => setCurrentSlide(index)}
              className={`h-3 rounded-full transition-all ${
                index === currentSlide
                  ? 'bg-caramel w-8'
                  : 'w-3 bg-primary-foreground/30 hover:bg-primary-foreground/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}