import { Suspense } from "react";

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
          Loading…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
