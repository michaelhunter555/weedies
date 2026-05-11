"use client";
import React from "react";

interface MenuItemsProps {
  text: string;
  icon?: React.ReactNode;
  href: string;
}

/**
 * Keep this short (4–5 items). Sub-categories live on the /products page
 * via filter chips and the hero category strip on the homepage.
 */
export const MainMenuItems: MenuItemsProps[] = [
  {
    text: "Discover",
    href: "/products",
  },
  {
    text: "AI Tools",
    href: "/products?category=ai-tools",
  },
  {
    text: "Dev Tools",
    href: "/products?category=dev-tools",
  },
  {
    text: "Games",
    href: "/products?category=games",
  },
  {
    text: "Sell",
    href: "/products?list=new",
  },
];
