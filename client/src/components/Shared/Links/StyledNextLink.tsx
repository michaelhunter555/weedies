import React from "react";

import Link from "next/link";

("use-client");

const StyledNextLink = ({
  children,
  route,
}: {
  children: React.ReactNode;
  route: string;
}) => {
  return (
    <Link href={route} style={{ cursor: "pointer", textDecoration: "none" }}>
      {children}
    </Link>
  );
};

export default StyledNextLink;
