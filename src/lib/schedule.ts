import { Promotion, Product } from '@/types/menu';
/**
 * Returns true if `currentMinutes` falls within [from, to], handling
 * overnight ranges (e.g. 23:00 – 12:00 next day).
 */
function isMinutesInRange(currentMinutes: number, from: number, to: number): boolean {
  if (from <= to) {
    return currentMinutes >= from && currentMinutes <= to;
  }
  // Overnight range: e.g. 23:00 (1380) – 12:00 (720)
  return currentMinutes >= from || currentMinutes <= to;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * For the automatic open/close schedule: returns true if right now
 * the store should be considered CLOSED according to closeTime/openTime
 * (e.g. closeTime="23:00", openTime="12:00" → closed from 11pm to noon).
 */
export function isWithinClosedWindow(closeTime: string, openTime: string): boolean {
  if (!closeTime || !openTime) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return isMinutesInRange(currentMinutes, timeToMinutes(closeTime), timeToMinutes(openTime));
}

/**
 * Returns true if the product is available right now
 * considering its schedule (available_days + available_from/to).
 * If no schedule is set, it's always available.
 */
export function isProductAvailableNow(product: Product): boolean {
  const { available_days, available_from, available_to } = product;

  // No schedule set — always available
  if (!available_days && !available_from && !available_to) return true;

  const now = new Date();
  const currentDay = now.getDay(); // 0=Sun … 6=Sat
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check day restriction
  if (available_days && available_days.length > 0) {
    if (!available_days.includes(currentDay)) return false;
  }

  // Check time restriction
  if (available_from || available_to) {
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    if (available_from && available_to) {
      const from = toMinutes(available_from);
      const to = toMinutes(available_to);

      // Handle overnight ranges (e.g. 22:00 – 02:00)
      if (from <= to) {
        if (currentMinutes < from || currentMinutes > to) return false;
      } else {
        if (currentMinutes < from && currentMinutes > to) return false;
      }
    } else if (available_from) {
      if (currentMinutes < toMinutes(available_from)) return false;
    } else if (available_to) {
      if (currentMinutes > toMinutes(available_to)) return false;
    }
  }

  return true;
}

/**
 * Returns a human-readable schedule string for display.
 * e.g. "Lun – Vie, 08:00 – 12:00"
 */
export function formatSchedule(product: Product): string | null {
  const { available_days, available_from, available_to } = product;
  if (!available_days && !available_from && !available_to) return null;

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const parts: string[] = [];

  if (available_days && available_days.length > 0) {
    const sorted = [...available_days].sort();
    // Detect consecutive ranges
    if (sorted.length === 7) {
      parts.push('Todos los días');
    } else {
      parts.push(sorted.map(d => dayNames[d]).join(', '));
    }
  }

  if (available_from || available_to) {
    const from = available_from ? available_from.slice(0, 5) : '00:00';
    const to = available_to ? available_to.slice(0, 5) : '23:59';
    parts.push(`${from} – ${to}`);
  }

  return parts.join(' · ');
}

// ── Promotion → CartProduct helper ───────────────────────────────────────────

/**
 * Converts a Promotion into a Product-shaped object so it can
 * be added to the cart without modifying useCart or CartItem.
 * Only promotions with a numeric discount_value have a price.
 */
export function promotionToCartProduct(promo: Promotion): Product {
  return {
    id: `promo_${promo.id}`,
    name: promo.title,
    description: promo.description,
    price: promo.discount_value ?? 0,
    image_url: promo.image_url,
    category_id: null,
    is_available: true,
    show_in_display: false,
    display_order: promo.display_order,
    has_sizes: false,
    price_large: null,
    is_featured: false,
    is_cross_sell: false,
    available_days: null,
    available_from: null,
    available_to: null,
    created_at: promo.created_at,
    updated_at: promo.updated_at,
  };
}