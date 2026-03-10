import { useState, useCallback } from 'react';
import { CartItem, Product } from '@/types/menu';

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Product, size?: 'medium' | 'large') => {
    // Cart key: product id + size (so M and G are separate line items)
    const cartId = product.has_sizes ? `${product.id}_${size ?? 'medium'}` : product.id;

    setItems(prev => {
      const existing = prev.find(item => {
        const itemCartId = item.product.has_sizes
          ? `${item.product.id}_${item.size ?? 'medium'}`
          : item.product.id;
        return itemCartId === cartId;
      });

      if (existing) {
        return prev.map(item => {
          const itemCartId = item.product.has_sizes
            ? `${item.product.id}_${item.size ?? 'medium'}`
            : item.product.id;
          return itemCartId === cartId
            ? { ...item, quantity: item.quantity + 1 }
            : item;
        });
      }

      // For large size, override price with price_large
      const effectiveProduct =
        product.has_sizes && size === 'large' && product.price_large != null
          ? { ...product, price: product.price_large }
          : product;

      return [...prev, { product: effectiveProduct, quantity: 1, size }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => {
      const itemCartId = item.product.has_sizes
        ? `${item.product.id}_${item.size ?? 'medium'}`
        : item.product.id;
      return itemCartId !== productId;
    }));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => {
        const itemCartId = item.product.has_sizes
          ? `${item.product.id}_${item.size ?? 'medium'}`
          : item.product.id;
        return itemCartId !== productId;
      }));
    } else {
      setItems(prev =>
        prev.map(item => {
          const itemCartId = item.product.has_sizes
            ? `${item.product.id}_${item.size ?? 'medium'}`
            : item.product.id;
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
  const getItemId = (item: CartItem) =>
    item.product.has_sizes
      ? `${item.product.id}_${item.size ?? 'medium'}`
      : item.product.id;

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