"use client";

import { LiveChatBubble } from "./LiveChatBubble";
import { LiveChatWindow } from "./LiveChatWindow";

/** Global support chat — compact bubble + panel, bottom-right. */
export function LiveChatWidget() {
  return (
    <>
      <LiveChatWindow />
      <LiveChatBubble />
    </>
  );
}
