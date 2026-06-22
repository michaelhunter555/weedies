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

/** Hover flyout links under Discover in the header. */
export const discoverFlyoutItems = [
  {
    href: "/guides/how-to-flip-your-app",
    image: "/flipapp.png",
    title: "How to flip your app",
    description: "A practical playbook for finding and reselling indie apps.",
  },
  {
    href: "/guides/culture-and-values",
    image: "/valuesdapandflip.png",
    title: "Culture and values",
    description: "Trust, honesty, and respect behind every exchange.",
  },
  {
    href: "/guides/how-to-use-our-site",
    image: "/yourapps.png",
    title: "How to use Dap & Flip",
    description: "From your first listing to a secure handover.",
  },
  {
    href: "/guides/how-verification-works",
    image: "/homepage_pack/3.png",
    title: "How verification works",
    description: "Ownership checks, listing review, and connected analytics.",
  },
  {
    href: "/guides/handover-flow",
    image: "/homepage_pack/1.png",
    title: "See the handover flow",
    description: "Checkout, exchange room, transfer, and confirmation.",
  },
  {
    href: "/products",
    title: "Browse marketplace",
    description: "Explore live app listings on Dap & Flip.",
  },
] as const;

export function getMainMenuItems(opts?: { userId?: string }): MenuItemsProps[] {
  const items = [...baseMainMenuItems];
  return items;
}

/** @deprecated Prefer `getMainMenuItems()` from Header when auth is available. */
export const MainMenuItems = baseMainMenuItems;
