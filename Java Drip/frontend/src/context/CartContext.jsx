import { createContext, useContext, useMemo, useReducer } from 'react';

const CartContext = createContext(null);
const TAX_RATE = 0.084375;
const ESTIMATED_FEES = 0;

function createCartKey(item) {
  const addonSignature = (item.addons || [])
    .map((addon) => `${addon.id}:${addon.quantity || 1}`)
    .sort()
    .join('|');

  return `${item.id}__${addonSignature || 'base'}`;
}

function calculateLinePrice(item) {
  const addonTotal = (item.addons || []).reduce(
    (sum, addon) => sum + (Number(addon.price) * Number(addon.quantity || 1)),
    0
  );

  return Number((Number(item.price) + addonTotal).toFixed(2));
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const key = createCartKey(action.item);
      const existing = state.find((entry) => entry.key === key);

      if (existing) {
        return state.map((entry) => (
          entry.key === key
            ? { ...entry, quantity: entry.quantity + action.item.quantity }
            : entry
        ));
      }

      return [
        ...state,
        {
          ...action.item,
          key,
        },
      ];
    }
    case 'REMOVE':
      return state.filter((entry) => entry.key !== action.key);
    case 'UPDATE_QTY':
      if (action.quantity <= 0) {
        return state.filter((entry) => entry.key !== action.key);
      }

      return state.map((entry) => (
        entry.key === action.key ? { ...entry, quantity: action.quantity } : entry
      ));
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, []);

  const subtotal = useMemo(
    () => Number(items.reduce((sum, item) => sum + (calculateLinePrice(item) * item.quantity), 0).toFixed(2)),
    [items]
  );
  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  const fees = Number(ESTIMATED_FEES.toFixed(2));
  const total = Number((subtotal + tax + fees).toFixed(2));
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    items,
    subtotal,
    tax,
    fees,
    total,
    totalItems,
    addItem(item) {
      dispatch({
        type: 'ADD',
        item: {
          ...item,
          quantity: Number(item.quantity) || 1,
        },
      });
    },
    removeItem(key) {
      dispatch({ type: 'REMOVE', key });
    },
    updateQty(key, quantity) {
      dispatch({ type: 'UPDATE_QTY', key, quantity });
    },
    clearCart() {
      dispatch({ type: 'CLEAR' });
    },
    getLinePrice: calculateLinePrice,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }

  return context;
}
