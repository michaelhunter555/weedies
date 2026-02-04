"use client";

import React from "react";

import { FooterStyles } from "./FooterStyles";

const Footer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <FooterStyles sx={{ marginTop: "1rem", borderTop: "1px solid #e0e0e0", width: "100%" }}>{children}</FooterStyles>;
};
export default Footer;
