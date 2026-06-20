import { useState } from 'react';
import { Plus, Coffee, Clock, X, ChevronDown } from 'lucide-react';
import { Product } from '@/types/menu';
import { isProductAvailableNow, formatSchedule } from '@/lib/schedule';
import { useToast } from '@/hooks/use-toast';

const GOLD     = '#c9a84c';
const GOLD_DIM = 'rgba(201,168,76,0.5)';
const DARK     = '#1a0a02';

const FRAPPE_CATEGORY_ID = '6745e707-a695-4433-8bfa-15afb3e4e57f';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product, size?: 'medium' | 'large', extras?: { whippedCream: boolean }) => void;
  storeOpen?: boolean;
}

function ProductModal({ product, onClose, onAdd }: {
  product: Product;
  onClose: () => void;
  onAdd: (product: Product, size?: 'medium' | 'large', extras?: { whippedCream: boolean }) => void;
}) {
  const [selectedSize, setSelectedSize] = useState<'medium' | 'large'>('medium');
  const [whippedCream, setWhippedCream] = useState(false);
  const { toast } = useToast();

  const isFrappe = product.category_id === FRAPPE_CATEGORY_ID;

  const basePrice = product.has_sizes && selectedSize === 'large' && product.price_large != null
    ? product.price_large
    : product.price;
  const totalPrice = basePrice + (whippedCream ? 6 : 0);

  const handleAdd = () => {
    onAdd(product, product.has_sizes ? selectedSize : undefined, isFrappe ? { whippedCream } : undefined);
    onClose();
    const sizeLabel = product.has_sizes ? (selectedSize === 'large' ? ' Grande' : ' Mediano') : '';
    const extrasLabel = isFrappe && whippedCream ? ' + crema batida' : '';
    toast({
      title: '¡Agregado al carrito! 🛒',
      description: `${product.name}${sizeLabel}${extrasLabel}`,
      duration: 2000,
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        {/* Modal */}
        <div
          className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-scale-in"
          style={{ background: '#1a0a02', border: '1px solid rgba(201,168,76,0.2)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Image */}
          <div className="w-full h-56 relative bg-gradient-to-br from-[#3d2010] to-[#5c3418]">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-8">
                <img src="/logo.png" alt={product.name} className="w-full h-full object-contain rounded-full opacity-70" />
              </div>
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #1a0a02 0%, transparent 50%)' }} />
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.8)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 pt-3 pb-5">
            <h2 className="font-display font-bold text-xl mb-1" style={{ color: GOLD }}>
              {product.name}
            </h2>
            {product.description ? (
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {product.description}
              </p>
            ) : (
              <p className="text-sm italic mb-4" style={{ color: 'rgba(255,255,255,0.2)' }}>Sin descripción</p>
            )}

            {/* Size selector */}
            {product.has_sizes && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSelectedSize('medium')}
                  className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    border: `1px solid ${selectedSize === 'medium' ? GOLD : 'rgba(255,255,255,0.1)'}`,
                    background: selectedSize === 'medium' ? 'rgba(201,168,76,0.12)' : 'transparent',
                    color: selectedSize === 'medium' ? GOLD : 'rgba(255,255,255,0.5)'
                  }}
                >
                  Mediano · ${product.price.toFixed(2)}
                </button>
                {product.price_large != null && (
                  <button
                    onClick={() => setSelectedSize('large')}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      border: `1px solid ${selectedSize === 'large' ? GOLD : 'rgba(255,255,255,0.1)'}`,
                      background: selectedSize === 'large' ? 'rgba(201,168,76,0.12)' : 'transparent',
                      color: selectedSize === 'large' ? GOLD : 'rgba(255,255,255,0.5)'
                    }}
                  >
                    Grande · ${product.price_large.toFixed(2)}
                  </button>
                )}
              </div>
            )}

            {/* Frappé: crema batida */}
            {isFrappe && (
              <button
                onClick={() => setWhippedCream(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl mb-4 transition-all"
                style={{
                  border: `1px solid ${whippedCream ? GOLD : 'rgba(255,255,255,0.1)'}`,
                  background: whippedCream ? 'rgba(201,168,76,0.12)' : 'transparent',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: whippedCream ? GOLD : 'rgba(255,255,255,0.6)' }}>
                    🍦 Crema batida
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.15)', color: GOLD }}>
                    +$6.00
                  </span>
                </div>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{ borderColor: whippedCream ? GOLD : 'rgba(255,255,255,0.2)', background: whippedCream ? GOLD : 'transparent' }}
                >
                  {whippedCream && <div className="w-2 h-2 rounded-full" style={{ background: DARK }} />}
                </div>
              </button>
            )}

            {/* Price + Add button */}
            <div className="flex items-center gap-3">
              <span className="font-bold text-2xl" style={{ color: GOLD }}>
                ${totalPrice.toFixed(2)}
              </span>
              <button
                onClick={handleAdd}
                className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-transform active:scale-95"
                style={{ background: GOLD, color: DARK }}
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

// Alert de crema batida para frappes agregados desde la lista sin abrir modal
function WhippedCreamAlert({ product, onConfirm, onDismiss }: {
  product: Product;
  onConfirm: (withCream: boolean) => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4 pb-8" onClick={onDismiss}>
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-slide-up"
        style={{ background: '#1a0a02', border: '1px solid rgba(201,168,76,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-5">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: GOLD_DIM }}>
            {product.name}
          </p>
          <h3 className="font-bold text-lg text-white mb-1">¿Le agregamos crema batida? 🍦</h3>
          <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            +$6.00 · Solo para este frappe
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => onConfirm(false)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
            >
              Sin crema
            </button>
            <button
              onClick={() => onConfirm(true)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: GOLD, color: DARK }}
            >
              Con crema batida
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductCard({ product, onAdd, storeOpen = true }: ProductCardProps) {
  const [showSizes, setShowSizes] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showWhippedCreamAlert, setShowWhippedCreamAlert] = useState(false);
  const { toast } = useToast();

  const scheduleAvailable = isProductAvailableNow(product);
  const isUnavailable = !storeOpen || !product.is_available || !scheduleAvailable;
  const scheduleLabel = formatSchedule(product);
  const isFrappe = product.category_id === FRAPPE_CATEGORY_ID;

  // Called when user selects a size from the inline size selector
  const handleSizeSelect = (size: 'medium' | 'large') => {
    if (isFrappe) {
      // For frappes, show whipped cream alert first then add
      setShowSizes(false);
      // We'll store the size temporarily via a closure in the alert handler
      const handleCreamChoice = (withCream: boolean) => {
        onAdd(product, size, { whippedCream: withCream });
        setShowWhippedCreamAlert(false);
        const sizeLabel = size === 'large' ? ' Grande' : ' Mediano';
        const extrasLabel = withCream ? ' + crema batida' : '';
        toast({
          title: '¡Agregado al carrito! 🛒',
          description: `${product.name}${sizeLabel}${extrasLabel}`,
          duration: 2000,
        });
      };
      // Store handler ref temporarily — use modal approach instead
      setShowModal(true);
    } else {
      onAdd(product, size);
      setShowSizes(false);
      toast({
        title: '¡Agregado al carrito! 🛒',
        description: `${product.name} · ${size === 'large' ? 'Grande' : 'Mediano'}`,
        duration: 2000,
      });
    }
  };

  // Called when + button is pressed on a non-size, non-frappe product
  const handleDirectAdd = () => {
    if (isUnavailable) return;
    if (isFrappe) {
      setShowWhippedCreamAlert(true);
      return;
    }
    onAdd(product);
    toast({
      title: '¡Agregado al carrito! 🛒',
      description: product.name,
      duration: 2000,
    });
  };

  const handleWhippedCreamConfirm = (withCream: boolean) => {
    onAdd(product, undefined, { whippedCream: withCream });
    setShowWhippedCreamAlert(false);
    const extrasLabel = withCream ? ' + crema batida' : '';
    toast({
      title: '¡Agregado al carrito! 🛒',
      description: `${product.name}${extrasLabel}`,
      duration: 2000,
    });
  };

  return (
    <>
      <div className={`transition-opacity duration-200 ${isUnavailable ? 'opacity-40' : ''}`}>
        <div className="flex items-center gap-3 py-3 px-1">

          {/* Thumbnail — clickable */}
          <button
            onClick={() => !isUnavailable && setShowModal(true)}
            className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden transition-transform active:scale-95"
            style={{ background: 'linear-gradient(135deg, #3d2010 0%, #5c3418 100%)' }}
          >
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-2">
                <img src="/logo.png" alt={product.name} className="w-full h-full object-contain rounded-full opacity-70" />
              </div>
            )}
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <button
              onClick={() => !isUnavailable && setShowModal(true)}
              className="text-left w-full"
            >
              <p className="font-semibold text-sm leading-tight text-white/90 truncate hover:text-white transition-colors">
                {product.name}
                {isUnavailable && <span className="ml-1.5 text-xs text-white/30">· No disponible</span>}
              </p>
            </button>
            {product.description && (
              <p className="text-xs text-white/40 truncate mt-0.5">{product.description}</p>
            )}
            {scheduleLabel && (
              <p className="text-xs flex items-center gap-0.5 mt-0.5" style={{ color: `${GOLD}80` }}>
                <Clock className="w-2.5 h-2.5" />{scheduleLabel}
              </p>
            )}
          </div>

          {/* Price + action */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {product.has_sizes ? (
              // "Ver tamaños" is now a clickable button
              <button
                disabled={isUnavailable}
                onClick={() => !isUnavailable && setShowSizes(p => !p)}
                className="text-xs underline underline-offset-2 transition-colors disabled:opacity-30"
                style={{ color: showSizes ? GOLD : GOLD_DIM }}
              >
                Ver tamaños
              </button>
            ) : (
              <span className="font-bold text-sm" style={{ color: GOLD }}>
                ${product.price.toFixed(2)}
              </span>
            )}
            <button
              disabled={isUnavailable}
              onClick={() => {
                if (isUnavailable) return;
                if (product.has_sizes) { setShowSizes(p => !p); return; }
                handleDirectAdd();
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30 active:scale-95"
              style={{ background: showSizes ? 'rgba(201,168,76,0.15)' : GOLD, color: showSizes ? GOLD : DARK }}
            >
              {product.has_sizes
                ? <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showSizes ? 'rotate-180' : ''}`} />
                : <Plus className="w-4 h-4" />
              }
            </button>
          </div>
        </div>

        {/* Size selector */}
        {product.has_sizes && showSizes && (
          <div className="flex gap-2 pb-3 pl-[68px] animate-slide-up">
            <button
              onClick={() => handleSizeSelect('medium')}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
            >
              Mediano · ${product.price.toFixed(2)}
            </button>
            {product.price_large != null && (
              <button
                onClick={() => handleSizeSelect('large')}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              >
                Grande · ${product.price_large.toFixed(2)}
              </button>
            )}
          </div>
        )}

        <div className="h-px mx-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>

      {showModal && (
        <ProductModal
          product={product}
          onClose={() => setShowModal(false)}
          onAdd={(p, size, extras) => {
            onAdd(p, size, extras);
            setShowModal(false);
            const sizeLabel = size ? (size === 'large' ? ' Grande' : ' Mediano') : '';
            const extrasLabel = extras?.whippedCream ? ' + crema batida' : '';
            toast({
              title: '¡Agregado al carrito! 🛒',
              description: `${p.name}${sizeLabel}${extrasLabel}`,
              duration: 2000,
            });
          }}
        />
      )}

      {showWhippedCreamAlert && (
        <WhippedCreamAlert
          product={product}
          onConfirm={handleWhippedCreamConfirm}
          onDismiss={() => setShowWhippedCreamAlert(false)}
        />
      )}
    </>
  );
}
