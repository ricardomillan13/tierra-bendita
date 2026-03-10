import { Plus, Tag } from 'lucide-react';
import { Promotion, Product } from '@/types/menu';
import { promotionToCartProduct } from '@/lib/schedule';

interface PromotionCardProps {
  promotion: Promotion;
  onAdd: (product: Product) => void;
}

export function PromotionCard({ promotion, onAdd }: PromotionCardProps) {
  const hasPrice = promotion.discount_value !== null && promotion.discount_type !== 'text';
  const cartProduct = promotionToCartProduct(promotion);

  return (
    <div>
      <div className="flex items-center gap-3 py-3 px-1">
        {/* Thumbnail */}
        <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0.05) 100%)', border: '1px solid rgba(201,168,76,0.2)' }}>
          {promotion.image_url ? (
            <img src={promotion.image_url} alt={promotion.title} className="w-full h-full object-cover" />
          ) : (
            <Tag className="w-5 h-5" style={{ color: '#c9a84c' }} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white/90 truncate">{promotion.title}</span>
            {promotion.badge_text && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)' }}>
                {promotion.badge_text}
              </span>
            )}
          </div>
          {promotion.description && (
            <p className="text-xs text-white/40 truncate mt-0.5">{promotion.description}</p>
          )}
        </div>

        {/* Price + action */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {hasPrice && (
            <span className="font-bold text-sm" style={{ color: '#c9a84c' }}>
              ${promotion.discount_value!.toFixed(2)}
            </span>
          )}
          {hasPrice ? (
            <button
              onClick={() => onAdd(cartProduct)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-95"
              style={{ background: '#c9a84c', color: '#1a0a02' }}
            >
              <Plus className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-xs italic" style={{ color: 'rgba(255,255,255,0.25)' }}>Informativa</span>
          )}
        </div>
      </div>
      <div className="h-px mx-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
    </div>
  );
}