import { useState } from 'react';
import { Plus, Coffee, Clock, X } from 'lucide-react';
import { Product } from '@/types/menu';
import { isProductAvailableNow, formatSchedule } from '@/lib/schedule';

const GOLD     = '#c9a84c';
const GOLD_DIM = 'rgba(201,168,76,0.5)';
const DARK     = '#1a0a02';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product, size?: 'medium' | 'large') => void;
}

function ProductModal({ product, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: (product: Product, size?: 'medium' | 'large') => void }) {
  const [selectedSize, setSelectedSize] = useState<'medium' | 'large'>('medium');

  const handleAdd = () => {
    onAdd(product, product.has_sizes ? selectedSize : undefined);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        {/* Modal — stop propagation so clicking inside doesn't close */}
        <div
          className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-scale-in"
          style={{ background: '#1a0a02', border: '1px solid rgba(201,168,76,0.2)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Image */}
          <div className="w-full h-56 relative">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #3d2010, #5c3418)' }}>
                <Coffee className="w-16 h-16" style={{ color: `${GOLD}30` }} />
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

            {/* Price + Add button */}
            <div className="flex items-center gap-3">
              <span className="font-bold text-2xl" style={{ color: GOLD }}>
                ${(product.has_sizes && selectedSize === 'large' && product.price_large != null
                  ? product.price_large
                  : product.price).toFixed(2)}
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

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const [showSizes, setShowSizes] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const scheduleAvailable = isProductAvailableNow(product);
  const isUnavailable = !product.is_available || !scheduleAvailable;
  const scheduleLabel = formatSchedule(product);

  return (
    <>
      <div className={`transition-opacity duration-200 ${isUnavailable ? 'opacity-40' : ''}`}>
        <div className="flex items-center gap-3 py-3 px-1">

          {/* Thumbnail — clickable */}
          <button
            onClick={() => setShowModal(true)}
            className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden transition-transform active:scale-95"
            style={{ background: 'linear-gradient(135deg, #3d2010 0%, #5c3418 100%)' }}
          >
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Coffee className="w-6 h-6" style={{ color: `${GOLD}55` }} />
              </div>
            )}
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight text-white/90 truncate">
              {product.name}
              {isUnavailable && <span className="ml-1.5 text-xs text-white/30">· No disponible</span>}
            </p>
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
              <span className="text-xs" style={{ color: `${GOLD}80` }}>Ver tamaños</span>
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
                onAdd(product);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30 active:scale-95"
              style={{ background: showSizes ? 'rgba(201,168,76,0.15)' : GOLD, color: showSizes ? GOLD : DARK }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Size selector */}
        {product.has_sizes && showSizes && (
          <div className="flex gap-2 pb-3 pl-[68px] animate-slide-up">
            <button
              onClick={() => { onAdd(product, 'medium'); setShowSizes(false); }}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
            >
              Mediano · ${product.price.toFixed(2)}
            </button>
            {product.price_large != null && (
              <button
                onClick={() => { onAdd(product, 'large'); setShowSizes(false); }}
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

      {showModal && <ProductModal product={product} onClose={() => setShowModal(false)} onAdd={onAdd} />}
    </>
  );
}