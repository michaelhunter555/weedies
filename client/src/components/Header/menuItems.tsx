"use client";
import React from "react";

export interface MenuItemsProps {
  text: string;
  icon?: React.ReactNode;
  href: string;
}

/**
 * Keep this short (4–5 items). Sub-categories live on the /products page
 * via filter chips and the hero category strip on the homepage.
 */
export const baseMainMenuItems: MenuItemsProps[] = [
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
    text: "SaaS",
    href: "/products?category=saas",
  },
  {
    text: "Marketplace",
    href: "/products?category=marketplace",
  },
];

export function getMainMenuItems(opts?: { userId?: string }): MenuItemsProps[] {
  const items = [...baseMainMenuItems];
  return items;
}

/** @deprecated Prefer `getMainMenuItems()` from Header when auth is available. */
export const MainMenuItems = baseMainMenuItems;
