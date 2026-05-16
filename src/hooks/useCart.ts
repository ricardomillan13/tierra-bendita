import { useState, useCallback } from 'react';
import { CartItem, Product } from '@/types/menu';

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Product, size?: 'medium' | 'large', extras?: { whippedCream: boolean }) => {
    const extrasKey = extras?.whippedCream ? '_cream' : '';
    const cartId = product.has_sizes
      ? `${product.id}_${size ?? 'medium'}${extrasKey}`
      : `${product.id}${extrasKey}`;

    setItems(prev => {
      const existing = prev.find(item => {
        const itemExtrasKey = item.extras?.whippedCream ? '_cream' : '';
        const itemCartId = item.product.has_sizes
          ? `${item.product.id}_${item.size ?? 'medium'}${itemExtrasKey}`
          : `${item.product.id}${itemExtrasKey}`;
        return itemCartId === cartId;
      });

      if (existing) {
        return prev.map(item => {
          const itemExtrasKey = item.extras?.whippedCream ? '_cream' : '';
          const itemCartId = item.product.has_sizes
            ? `${item.product.id}_${item.size ?? 'medium'}${itemExtrasKey}`
            : `${item.product.id}${itemExtrasKey}`;
          return itemCartId === cartId
            ? { ...item, quantity: item.quantity + 1 }
            : item;
        });
      }

      let effectivePrice = product.price;
      if (product.has_sizes && size === 'large' && product.price_large != null) {
        effectivePrice = product.price_large;
      }
      if (extras?.whippedCream) {
        effectivePrice += 6;
      }
      const effectiveProduct = { ...product, price: effectivePrice };

      return [...prev, { product: effectiveProduct, quantity: 1, size, extras }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => {
      const itemExtrasKey = item.extras?.whippedCream ? '_cream' : '';
      const itemCartId = item.product.has_sizes
        ? `${item.product.id}_${item.size ?? 'medium'}${itemExtrasKey}`
        : `${item.product.id}${itemExtrasKey}`;
      return itemCartId !== productId;
    }));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => {
        const itemExtrasKey = item.extras?.whippedCream ? '_cream' : '';
        const itemCartId = item.product.has_sizes
          ? `${item.product.id}_${item.size ?? 'medium'}${itemExtrasKey}`
          : `${item.product.id}${itemExtrasKey}`;
        return itemCartId !== productId;
      }));
    } else {
      setItems(prev =>
        prev.map(item => {
          const itemExtrasKey = item.extras?.whippedCream ? '_cream' : '';
          const itemCartId = item.product.has_sizes
            ? `${item.product.id}_${item.size ?? 'medium'}${itemExtrasKey}`
            : `${item.product.id}${itemExtrasKey}`;
          return itemCartId === productId ? { ...item, quantity } : item;
        })
      );
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Helper to get the cart key for a given item (used in Cart.tsx)
  const getItemId = (item: CartItem) => {
    const extrasKey = item.extras?.whippedCream ? '_cream' : '';
    return item.product.has_sizes
      ? `${item.product.id}_${item.size ?? 'medium'}${extrasKey}`
      : `${item.product.id}${extrasKey}`;
  };

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    itemCount,
    getItemId,
  };
}