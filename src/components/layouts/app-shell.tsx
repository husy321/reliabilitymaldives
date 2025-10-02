"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Navigation from "@/components/layouts/navigation";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Hide shell for auth routes (login, etc.)
  const isAuthRoute = pathname?.startsWith("/login") || pathname?.startsWith("/unauthorized");
  if (isAuthRoute) {
    return <>{children}</>;
  }

  const role = (session?.user as any)?.role ?? "GUEST";
  const user = session?.user ? {
    name: session.user.name,
    email: session.user.email,
    role: (session.user as any).role,
  } : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Navigation userRole={role} currentPath={pathname || "/"} user={user} />
        <div className="flex-1 lg:ml-64">{children}</div>
      </div>
    </div>
  );
}

export default AppShell;


