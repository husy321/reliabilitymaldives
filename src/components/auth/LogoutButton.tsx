"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/session";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  showIcon?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function LogoutButton({
  variant = "outline",
  size = "sm",
  showIcon = true,
  children,
  className,
}: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={className}
    >
      {showIcon && <LogOut className="h-4 w-4 mr-2" />}
      {children || (isLoggingOut ? "Signing out..." : "Logout")}
    </Button>
  );
}