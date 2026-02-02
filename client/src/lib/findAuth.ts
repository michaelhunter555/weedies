import { NextApiResponse } from "next";

import User from "../models/User";

export default async function findAuth(id: string, res: NextApiResponse) {
  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return user;
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: "There was an error trying to find the user" });
  }
}
