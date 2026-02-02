"use client";
import React from "react";

interface MenuItemsProps {
  text: string;
  icon?: React.ReactNode;
  component?: string;
  route?: string;
}

export const MainMenuItems: MenuItemsProps[] = [
  {
    text: "Mihe X-900",
    component: "PRODUCTS",
    route: "product",
  },
  {
    text: "Highlights",
    component: "PRODUCTS",
    route: "highlight",
  },
  {
    text: "Core Features",
    component: "PRODUCTS",
    route: "feature",
  },
  {
    text: "Video",
    component: "PRODUCTS",
    route: "video",
  },
  {
    text: "FAQs",
    component: "FAQS",
    route: "faqs",
  },
];
