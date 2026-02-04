"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <div>Messages</div>
    </ProtectedRoute>
  );
}


