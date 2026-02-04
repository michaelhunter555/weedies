"use client";
import React from "react";

interface MenuItemsProps {
  text: string;
  icon?: React.ReactNode;
  href: string;
}

export const MainMenuItems: MenuItemsProps[] = [
  {
    text: "Shop",
    href: "/products",
  },
  {
    text: "Edibles",
    href: "/products?category=edibles",
  },
  {
    text: "Flower",
    href: "/products?category=flower",
  },
  {
    text: "Vapes",
    href: "/products?category=vapes",
  },
  {
    text: "Support",
    href: "/support",
  },
  {
    text: "About",
    href: "/about-us",
  },
];
