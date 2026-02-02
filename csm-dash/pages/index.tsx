import * as React from "react";

import MainGrid from "@/components/MainGrid/MainGrid";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Dashboard() {
  return (
  <ProtectedRoute>
    <MainGrid />
  </ProtectedRoute>
  )
}
