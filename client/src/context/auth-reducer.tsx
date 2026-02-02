import { UserObject } from "../../types";

export const initialState = {
  isLoggedIn: false,
  user: null,
  token: null,
};

type State = {
  isLoggedIn: boolean;
  user: UserObject | null;
  token: string | null;
};

type Action = {
  type: "LOGIN" | "LOGOUT" | "UPDATE";
  isLoggedIn: boolean;
  user: UserObject | null;
  token: string | null;
};

export const authReducer = (state: State, action: Action) => {
  switch (action.type) {
    case "LOGIN":
      return {
        ...state,
        isLogged: true,
        user: action.user,
      };

    case "LOGOUT":
      return initialState;

    case "UPDATE":
      return {
        ...state,
        isLogged: true,
        user: action.user,
      };

    default:
      return state;
  }
};
