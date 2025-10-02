"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

export function Header() {
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  if (!session) {
    return null;
  }

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Reliability Maldives</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {session.user?.name} ({session.user?.role})
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}