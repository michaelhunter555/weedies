import { UserObject } from "../../types";

export const initialState = {
  isLoggedIn: false,
  user: null,
  token: null,
  hydrated: false,
};

type State = {
  isLoggedIn: boolean;
  user: UserObject | null;
  token: string | null;
  hydrated: boolean;
};

type Action = {
  type: "HYDRATE" | "LOGIN" | "LOGOUT" | "UPDATE";
  isLoggedIn?: boolean;
  user?: UserObject | null;
  token?: string | null;
};

export const authReducer = (state: State, action: Action) => {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        hydrated: true,
        isLoggedIn: !!action.token,
        user: action.user ?? null,
        token: action.token ?? null,
      };

    case "LOGIN":
      return {
        ...state,
        hydrated: true,
        isLoggedIn: true,
        user: action.user ?? null,
        token: action.token ?? null,
      };

    case "LOGOUT":
      return {
        ...initialState,
        hydrated: true,
      };

    case "UPDATE":
      return {
        ...state,
        hydrated: true,
        isLoggedIn: action.isLoggedIn ?? state.isLoggedIn,
        user: action.user ?? state.user,
        token: action.token ?? state.token,
      };

    default:
      return state;
  }
};
