import { useState } from 'react';
import { Plus, Coffee, X } from 'lucide-react';
import { Product } from '@/types/menu';
import { isProductAvailableNow } from '@/lib/schedule';

interface FeaturedCardProps {
  product: Product;
  onAdd: (product: Product, size?: 'medium' | 'large') => void;
  storeOpen?: boolean;
}

function FeaturedModal({ product, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: (product: Product, size?: 'medium' | 'large') => void }) {
  const [selectedSize, setSelectedSize] = useState<'medium' | 'large'>('medium');

  const handleAdd = () => {
    onAdd(product, product.has_sizes ? selectedSize : undefined);
    onClose();
  };

  const displayPrice = product.has_sizes && selectedSize === 'large' && product.price_large != null
    ? product.price_large : product.price;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-scale-in"
          style={{ background: '#1a0a02', border: '1px solid rgba(201,168,76,0.2)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="w-full h-56 relative">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #3d2010, #5c3418)' }}>
                <Coffee className="w-16 h-16" style={{ color: 'rgba(201,168,76,0.2)' }} />
              </div>
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #1a0a02 0%, transparent 50%)' }} />
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.8)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 pt-3 pb-5">
            <h2 className="font-display font-bold text-xl mb-1" style={{ color: '#c9a84c' }}>{product.name}</h2>
            {product.description ? (
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>{product.description}</p>
            ) : (
              <p className="text-sm italic mb-4" style={{ color: 'rgba(255,255,255,0.2)' }}>Sin descripción</p>
            )}
            {product.has_sizes && (
              <div className="flex gap-2 mb-4">
                <button onClick={() => setSelectedSize('medium')} className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ border: `1px solid ${selectedSize === 'medium' ? '#c9a84c' : 'rgba(255,255,255,0.1)'}`, background: selectedSize === 'medium' ? 'rgba(201,168,76,0.12)' : 'transparent', color: selectedSize === 'medium' ? '#c9a84c' : 'rgba(255,255,255,0.5)' }}>
                  Mediano · ${product.price.toFixed(2)}
                </button>
                {product.price_large != null && (
                  <button onClick={() => setSelectedSize('large')} className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{ border: `1px solid ${selectedSize === 'large' ? '#c9a84c' : 'rgba(255,255,255,0.1)'}`, background: selectedSize === 'large' ? 'rgba(201,168,76,0.12)' : 'transparent', color: selectedSize === 'large' ? '#c9a84c' : 'rgba(255,255,255,0.5)' }}>
                    Grande · ${product.price_large.toFixed(2)}
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="font-bold text-2xl" style={{ color: '#c9a84c' }}>${displayPrice.toFixed(2)}</span>
              <button onClick={handleAdd} className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm active:scale-95 transition-transform"
                style={{ background: '#c9a84c', color: '#1a0a02' }}>
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

export function FeaturedCard({ product, onAdd, storeOpen = true }: FeaturedCardProps) {
  const [showSizes, setShowSizes] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const isUnavailable = !storeOpen || !product.is_available || !isProductAvailableNow(product);

  return (
    <>
      <div
        className={`flex-shrink-0 w-44 rounded-2xl overflow-hidden transition-opacity ${isUnavailable ? 'opacity-40' : ''}`}
        style={{ background: 'linear-gradient(160deg, #2a1508 0%, #1a0a02 100%)', border: '1px solid rgba(201,168,76,0.15)' }}
      >
        {/* Image — clickable */}
        <button
          className="w-full h-32 overflow-hidden relative block"
          onClick={() => setShowModal(true)}
        >
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3d2010, #5c3418)' }}>
              <Coffee className="w-10 h-10" style={{ color: '#c9a84c30' }} />
            </div>
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #1a0a02 0%, transparent 60%)' }} />
        </button>

        {/* Content */}
        <div className="p-3 -mt-2 relative">
          <p className="font-semibold text-sm text-white/90 leading-tight line-clamp-2 mb-2">
            {product.name}
          </p>

          {!product.has_sizes ? (
            <div className="flex items-center justify-between">
              <span className="font-bold text-base" style={{ color: '#c9a84c' }}>
                ${product.price.toFixed(2)}
              </span>
              <button
                disabled={isUnavailable}
                onClick={() => onAdd(product)}
                className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 transition-transform active:scale-95"
                style={{ background: '#c9a84c', color: '#1a0a02' }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : showSizes ? (
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => { onAdd(product, 'medium'); setShowSizes(false); }}
                className="py-1.5 px-2 rounded-lg text-xs font-medium text-left transition-colors"
                style={{ border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', background: 'rgba(201,168,76,0.08)' }}
              >
                Med · ${product.price.toFixed(2)}
              </button>
              {product.price_large != null && (
                <button
                  onClick={() => { onAdd(product, 'large'); setShowSizes(false); }}
                  className="py-1.5 px-2 rounded-lg text-xs font-medium text-left transition-colors"
                  style={{ border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', background: 'rgba(201,168,76,0.08)' }}
                >
                  Gde · ${product.price_large.toFixed(2)}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: '#c9a84c80' }}>Ver tamaños</span>
              <button
                disabled={isUnavailable}
                onClick={() => setShowSizes(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"
                style={{ background: '#c9a84c', color: '#1a0a02' }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && <FeaturedModal product={product} onClose={() => setShowModal(false)} onAdd={onAdd} />}
    </>
  );
}