"use client";

import { useParams } from "next/navigation";

export default function MySettingsPage() {
  const params = useParams<{ id: string }>();
  return (
    <div style={{ padding: 24 }}>
      <h1>My Settings</h1>
      <p>User ID: {params?.id}</p>
    </div>
  );
}


