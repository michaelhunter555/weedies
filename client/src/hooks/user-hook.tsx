import { useCallback } from "react";

import { useMutation } from "@tanstack/react-query";

import { useInvalidateQuery } from "./invalidateQuery";

type UserProps = {
  userName?: string;
  email: string;
  password: string;
};

export const useUser = () => {
  const { invalidateQuery } = useInvalidateQuery();

  //POST - on Sign-up form submit
  const signUp = useCallback(async (userData: UserProps) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER}/user/sign-up`,
        {
          method: "POST",
          body: JSON.stringify({ userData }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      return data;
    } catch (err) {
      console.log(err);
    }
  }, []);

  //mutation for sign-up
  const signupUser = useMutation({
    mutationKey: ["sign-up"],
    mutationFn: (userData: UserProps) => signUp(userData),
  });

  const login = useCallback(async (userData: UserProps) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER}/user/login`,
        {
          method: "POST",
          body: JSON.stringify({ userData }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      return data;
    } catch (err) {
      console.log(err);
    }
  }, []);
  //mutation for sign-up
  const loginUser = useMutation({
    mutationKey: ["login"],
    mutationFn: (userData: UserProps) => login(userData),
  });

  const getUserById = useCallback(async (id: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER}/user/${id}`,
        { method: "GET" }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }
      return data;
    } catch (err) {
      console.log(err);
    }
  }, []);

  const deleteUserById = useCallback(async (id: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER}/user/delete/${id}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }
      return data.message;
    } catch (err) {
      console.log(err);
    }
  }, []);

  return {
    //mutates
    signupUser,
    loginUser,

    //
    getUserById,
  };
};
