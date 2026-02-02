export const initialState = {
  quantity: 0,
  items: [],
  totalCost: 0,
};

type CartState = {
  quantity: number;
  items: ItemProps[];
  totalCost: number;
};

type CartAction = {
  type: "ADD_TO_CART" | "REMOVE_FROM_CART";
  item: ItemProps;
  quantity: number;
  totalCost: number;
};

export type ItemProps = { id: number; price: number; quantity: number };

const cartReducer = (state: CartState, action: CartAction) => {
  switch (action.type) {
    case "ADD_TO_CART": {
      const updateTotalAmount = state.totalCost + action.item.price;
      const currentCartItemsIndex = state.items.findIndex(
        (item) => item.id === action.item.id
      );

      const currentCartItems = state.items[currentCartItemsIndex];

      let updatedItems;

      if (currentCartItems) {
        const updateItem = {
          ...currentCartItems,
          quantity: currentCartItems.quantity + action.item.quantity,
        };

        updatedItems = [...state.items];
        updatedItems[currentCartItemsIndex as number] = updateItem;
      } else {
        updatedItems = state.items.concat(action.item);
      }

      return {
        ...state,
        items: updatedItems,
        quantity: state.quantity + action.item.quantity,
        totalCost: updateTotalAmount,
      };
    }
    case "REMOVE_FROM_CART": {
      const currentCartItemsIndex = state.items.findIndex(
        (item) => item.id === action.item.id
      );

      const currentCartItems = state.items[currentCartItemsIndex];
      const updatedTotalAmount = state.totalCost - currentCartItems.price;

      let updatedItems;

      if (currentCartItems.quantity === 1) {
        updatedItems = state.items.filter((item) => item.id !== action.item.id);
      } else {
        const updatedItem = {
          ...currentCartItems,
          quantity: currentCartItems.quantity - action.quantity,
        };
        updatedItems = [...state.items];
        updatedItems[currentCartItemsIndex] = updatedItem;
      }

      return {
        ...state,
        totalCost: updatedTotalAmount,
        items: updatedItems,
        quantity: state.quantity - 1,
      };
    }

    default:
      return state;
  }
};

export default cartReducer;
