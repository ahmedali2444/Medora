import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getMedicineById } from '../data/medicineData';
import { useToast } from './ToastContext';
import { useLang } from '../../../context/LanguageContext';

const CartContext = createContext({
  cart: [],
  favorites: [],
  cartCount: 0,
  favCount: 0,
  cartTotal: 0,
  openCart: () => {},
  closeCart: () => {},
  isCartOpen: false,
  addToCart: () => {},
  removeFromCart: () => {},
  setItemQuantity: () => {},
  setFulfillment: () => {},
  setItemPharmacy: () => {},
  toggleFavorite: () => false,
  isFavorite: () => false,
  isInCart: () => false,
});

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { showToast } = useToast();
  const { lang } = useLang();
  const isRtl = lang !== 'en';

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const addToCart = useCallback(
    (medicine, options = {}) => {
      if (!medicine) return;

      if (medicine.isAvailable === false) {
        showToast(isRtl ? 'الدواء غير متاح الآن' : 'This medicine is unavailable right now');
        return;
      }

      const { fulfillment = 'delivery', pharmacyId = null, quantity = 1, silent = false } = options;

      setCart((prev) => {
        const existing = prev.find((item) => item.id === medicine.id);
        if (existing) {
          return prev.map((item) =>
            item.id === medicine.id ? { ...item, quantity: item.quantity + quantity } : item,
          );
        }

        return [
          ...prev,
          {
            id: medicine.id,
            name: medicine.name,
            image: medicine.image,
            company: medicine.company,
            category: medicine.category,
            categoryLabel: medicine.categoryLabel,
            price: medicine.price,
            quantity,
            fulfillment,
            pharmacyId,
          },
        ];
      });

      if (!silent) {
        showToast(isRtl ? 'تمت إضافة الدواء إلى السلة ✓' : 'Medicine added to cart ✓');
      }
    },
    [isRtl, showToast],
  );

  const removeFromCart = useCallback(
    (id) => {
      setCart((prev) => prev.filter((item) => item.id !== id));
      showToast(isRtl ? 'تمت إزالة الدواء من السلة' : 'Medicine removed from cart');
    },
    [isRtl, showToast],
  );

  const setItemQuantity = useCallback((id, quantity) => {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.id !== id);
      }
      return prev.map((item) => (item.id === id ? { ...item, quantity } : item));
    });
  }, []);

  const setFulfillment = useCallback((id, fulfillment) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              fulfillment,
              pharmacyId: fulfillment === 'delivery' ? null : item.pharmacyId,
            }
          : item,
      ),
    );
  }, []);

  const setItemPharmacy = useCallback((id, pharmacyId) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, pharmacyId, fulfillment: 'pickup' } : item,
      ),
    );
  }, []);

  const toggleFavorite = useCallback(
    (medicine) => {
      if (!medicine) return false;
      let nextState = false;

      setFavorites((prev) => {
        const exists = prev.some((item) => item.id === medicine.id);
        nextState = !exists;

        if (exists) {
          return prev.filter((item) => item.id !== medicine.id);
        }

        return [
          ...prev,
          {
            id: medicine.id,
            name: medicine.name,
            image: medicine.image,
            company: medicine.company,
            price: medicine.price,
            category: medicine.category,
            categoryLabel: medicine.categoryLabel,
          },
        ];
      });

      showToast(
        nextState
          ? isRtl ? 'تمت الإضافة للمفضلة ♥' : 'Added to favorites ♥'
          : isRtl ? 'تمت الإزالة من المفضلة' : 'Removed from favorites',
      );
      return nextState;
    },
    [isRtl, showToast],
  );

  const isFavorite = useCallback((id) => favorites.some((item) => item.id === id), [favorites]);
  const isInCart = useCallback((id) => cart.some((item) => item.id === id), [cart]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  const hydratedCart = useMemo(
    () =>
      cart.map((item) => {
        const fullItem = getMedicineById(item.id);
        return {
          ...item,
          description: fullItem?.description,
          activeIngredient: fullItem?.activeIngredient,
        };
      }),
    [cart],
  );

  const value = useMemo(
    () => ({
      cart: hydratedCart,
      favorites,
      cartCount,
      favCount: favorites.length,
      cartTotal,
      openCart,
      closeCart,
      isCartOpen,
      addToCart,
      removeFromCart,
      setItemQuantity,
      setFulfillment,
      setItemPharmacy,
      toggleFavorite,
      isFavorite,
      isInCart,
    }),
    [
      hydratedCart,
      favorites,
      cartCount,
      cartTotal,
      openCart,
      closeCart,
      isCartOpen,
      addToCart,
      removeFromCart,
      setItemQuantity,
      setFulfillment,
      setItemPharmacy,
      toggleFavorite,
      isFavorite,
      isInCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
