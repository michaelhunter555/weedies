"use client";
import { createContext, useReducer } from "react";

import { type UserObject } from "../../types";
import { authReducer } from "./auth-reducer";

export type AuthContextProps = {
  isLoggedIn: boolean;
  user: UserObject | null;
  login: (user: UserObject, token: string | null) => void;
  logout: () => void;
  update: (user: UserObject) => void;
  token: string | null;
};

export const AuthContext = createContext<AuthContextProps>({
  isLoggedIn: false,
  user: null,
  login: (user: UserObject, token: string | null) => {},
  logout: () => {},
  update: (user: UserObject) => {},
  token: null,
});

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, {
    isLoggedIn: false,
    user: null,
    token: null,
  });

  const login = (user: UserObject, token: string | null) => {
    dispatch({
      type: "LOGIN",
      user: user,
      isLoggedIn: true,
      token: token,
    });
  };

  const logout = () => {
    dispatch({
      type: "LOGOUT",
      user: null,
      isLoggedIn: false,
      token: null,
    });
  };

  const updateUser = (user: UserObject) => {
    dispatch({
      type: "UPDATE",
      isLoggedIn: state.isLoggedIn,
      user: {
        ...user,
      },
      token: state.token,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: state.isLoggedIn,
        user: state.user,
        login: login,
        logout: logout,
        update: updateUser,
        token: state.token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
