import { useCallback } from "react";

export const useAuth = () => {
  const signIn = useCallback(async (userName: string, password: string) => {
    try {
      const response = await fetch(`${process.env.USER}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, password }),
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      return data.user;
    } catch (err) {
      console.log(err);
    }
  }, []);

  return {
    signIn,
  };
};
