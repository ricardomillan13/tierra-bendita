import { useState, useEffect } from 'react';
import { Coffee, Maximize, QrCode } from 'lucide-react';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { QRCodeDisplay } from '@/components/pos/QRCodeDisplay';

export default function Display() {
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: settings } = useSettings();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showQR, setShowQR] = useState(false);

  // Group products by category
  const productsByCategory = categories.map(cat => ({
    category: cat,
    products: products.filter(p => p.category_id === cat.id),
  })).filter(group => group.products.length > 0);

  // Auto-rotate slides
  useEffect(() => {
    if (productsByCategory.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % productsByCategory.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [productsByCategory.length]);

  // Show QR periodically
  useEffect(() => {
    if (!settings?.menu_url) return;
    
    const showQRInterval = setInterval(() => {
      setShowQR(true);
      setTimeout(() => setShowQR(false), 5000);
    }, 30000);

    return () => clearInterval(showQRInterval);
  }, [settings?.menu_url]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const currentGroup = productsByCategory[currentSlide];
  const menuUrl = settings?.menu_url || `${window.location.origin}/menu`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-espresso via-coffee-dark to-espresso text-primary-foreground relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-caramel blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-cream blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center">
            <Coffee className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-display text-4xl font-bold">Tierra Bendita Café</h1>
            <p className="text-lg opacity-80">Menú del Día</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowQR(!showQR)}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
          >
            <QrCode className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Maximize className="w-6 h-6" />
          </Button>
        </div>
      </header>

      {/* QR Code Overlay */}
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
      <main className="relative z-10 p-8 pt-4">
        {productsByCategory.length === 0 ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <Coffee className="w-24 h-24 mx-auto mb-6 opacity-50" />
              <p className="text-2xl opacity-70">Cargando menú...</p>
            </div>
          </div>
        ) : currentGroup && (
          <div className="animate-fade-in" key={currentSlide}>
            {/* Category title */}
            <div className="text-center mb-12">
              <h2 className="font-display text-5xl font-bold mb-2">{currentGroup.category.name}</h2>
              {currentGroup.category.description && (
                <p className="text-xl opacity-80">{currentGroup.category.description}</p>
              )}
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {currentGroup.products.map((product, index) => (
                <div
                  key={product.id}
                  className="bg-primary-foreground/10 backdrop-blur-md rounded-2xl p-6 border border-primary-foreground/20 animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-coffee-light/20 to-cream/20 flex items-center justify-center mb-4 overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Coffee className="w-16 h-16 opacity-50" />
                    )}
                  </div>
                  <h3 className="font-display text-xl font-semibold text-center mb-2">
                    {product.name}
                  </h3>
                  <p className="text-center text-3xl font-bold text-caramel">
                    ${product.price.toFixed(2)}
                  </p>
                  {product.description && (
                    <p className="text-center text-sm opacity-70 mt-2 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Slide indicators */}
      {productsByCategory.length > 1 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {productsByCategory.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide
                  ? 'bg-caramel w-8'
                  : 'bg-primary-foreground/30 hover:bg-primary-foreground/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
