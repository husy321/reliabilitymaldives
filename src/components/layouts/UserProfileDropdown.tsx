"use client";

import React from "react";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings, User as UserIcon, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

interface User {
  name?: string | null;
  email?: string | null;
  role?: string;
}

interface UserProfileDropdownProps {
  user: User;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

function getRoleBadgeColor(role: string): string {
  const roleColors: Record<string, string> = {
    ADMIN: "bg-destructive/10 text-destructive border-destructive/20",
    MANAGER: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    ACCOUNTS: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    ACCOUNTANT: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    SALES: "bg-green-500/10 text-green-600 border-green-500/20",
  };

  return roleColors[role] || "bg-muted text-muted-foreground";
}

export function UserProfileDropdown({ user }: UserProfileDropdownProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({
      callbackUrl: "/login",
      redirect: true
    });
  };

  const handleProfile = () => {
    router.push("/profile");
  };

  const handleSettings = () => {
    router.push("/settings");
  };

  const initials = user.name ? getInitials(user.name) : "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
              {user.role && (
                <Badge
                  variant="secondary"
                  className={`text-xs ${getRoleBadgeColor(user.role)}`}
                >
                  {user.role}
                </Badge>
              )}
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email || ""}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleProfile} className="cursor-pointer">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSettings} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          {user.role === "ADMIN" && (
            <DropdownMenuItem onClick={() => router.push("/users")} className="cursor-pointer">
              <Shield className="mr-2 h-4 w-4" />
              <span>User Management</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
