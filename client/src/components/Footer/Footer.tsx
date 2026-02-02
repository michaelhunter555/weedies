"use client";

import React from "react";

import { FooterStyles } from "./FooterStyles";

const Footer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <FooterStyles>{children}</FooterStyles>;
};
export default Footer;
