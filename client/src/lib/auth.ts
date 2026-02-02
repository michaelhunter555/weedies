import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import dbConnect from "@/app/api/database/dbConnect";
import { decryptData } from "@/utils/encryption/decryptData";
import type { PaletteMode } from "@mui/material";

import User from "../models/User";

declare module "next-auth" {
  /**
   * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      name: string;
      email: string;
      image: string;
      _id: string;
      theme: PaletteMode;
      stripeCustomerId: string;
    };
  }
}

export const {
  auth,
  signIn,
  signOut,
  handlers: { GET, POST },
} = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        await dbConnect();
        let user = null;

        console.log("Credentials", credentials.email, credentials.password);

        try {
          user = await User.findOne({ email: credentials.email });
          console.log(await User.countDocuments({}));
          //decrypt user

          if (!user) {
            throw new Error("No user found with the given email");
          }

          const decryptedPassword = decryptData(user.password);
          if (decryptedPassword !== credentials.password) {
            throw new Error(
              "The password or email is incorrect. Please try again."
            );
          }
        } catch (err) {
          console.log("Could find a user with the given email\n" + err);
        }
        return user;
      },
    }),
  ],
  session: {
    maxAge: 30 * 60 * 60 * 24,
    updateAge: 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, trigger, session, account }) {
      await dbConnect();
      console.log("user", user);
      console.log("token", token);
      console.log("session", session);
      console.log("account", account);

      if (trigger === "update" && session) {
        return { ...token, ...session.user };
      }

      let miheUser;
      try {
        miheUser = await User.findOne({ email: user.email });
        //prompt them to sign up
        if (!miheUser) {
          throw new Error("Please login first.");
        }
        token._id = miheUser._id;
        token.email = miheUser.email;
        token.theme = miheUser.theme;
        token.stripeCustomerId = miheUser.stripeCustomerId;

        return { ...token };
      } catch (err) {
        console.log("Error trying to find user by id");
      }
    },
    async session({ session, token }) {
      if (token._id && typeof token._id === "string") {
        session.user._id = token._id;
      }

      if (token.email && typeof token.email === "string") {
        session.user.email = token.email;
      }

      if (token.theme && typeof token.theme === "string") {
        session.user.theme = token.theme as PaletteMode;
      }

      if (
        token.stripeCustomerId &&
        typeof token.stripeCustomerId === "string"
      ) {
        session.user.stripeCustomerId = token.stripeCustomerId;
      }

      return session;
    },
  },
});
