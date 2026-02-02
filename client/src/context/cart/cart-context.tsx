"use client";
import { createContext, useCallback, useContext, useReducer } from "react";

import cartReducer, { initialState, type ItemProps } from "./cart-reducer";

interface CartContextProps {
  addToCart: (items: ItemProps) => void;
  removeFromCart: (items: ItemProps) => void;
  totalPrice: number;
  quantity: number;
}

export const CartContext = createContext<CartContextProps>({
  addToCart: (items: ItemProps) => {},
  removeFromCart: (items: ItemProps) => {},
  totalPrice: 0,
  quantity: 0,
});

const CartContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addToCart = useCallback((item: ItemProps) => {
    dispatch({
      type: "ADD_TO_CART",
      item,
      quantity: item.quantity,
      totalCost: item.price,
    });
  }, []);

  const removeFromCart = useCallback((item: ItemProps) => {
    dispatch({
      type: "REMOVE_FROM_CART",
      item,
      quantity: item.quantity,
      totalCost: item.price,
    });
  }, []);

  const value = {
    addToCart,
    removeFromCart,
    totalPrice: state.totalCost,
    quantity: state.quantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);

export default CartContextProvider;
