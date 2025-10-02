"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { getFilteredMenuItems } from "./navigation-items";
import { NavigationContent } from "./navigation-content";
import { UserProfileDropdown } from "./UserProfileDropdown";

interface NavigationProps {
  userRole: string;
  currentPath: string;
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export default function Navigation({ userRole, currentPath, user }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter menu items based on role (done once, not on every render)
  const filteredMenuItems = getFilteredMenuItems(userRole);

  return (
    <>
      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile Header Bar */}
        <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex flex-col h-full">
                <div className="flex items-center px-6 py-4 border-b">
                  <h2 className="text-lg font-semibold">Menu</h2>
                </div>
                <div className="flex-1 px-6 py-4">
                  <NavigationContent
                    items={filteredMenuItems}
                    currentPath={currentPath}
                    onMobileMenuToggle={() => setMobileMenuOpen(false)}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <h2 className="text-lg font-bold text-gray-900">Reliability Maldives</h2>

          {user && <UserProfileDropdown user={user} />}
        </div>
        {/* Mobile content spacer */}
        <div className="h-16" />
      </div>

      {/* Desktop Navigation */}
      <div className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 lg:bg-white lg:border-r lg:border-gray-200">
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Reliability Maldives
            </h2>
          </div>
          <div className="flex-1 px-6 py-4">
            <NavigationContent
              items={filteredMenuItems}
              currentPath={currentPath}
            />
          </div>
          {/* User Profile at Bottom */}
          {user && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name || "User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email || ""}
                    </p>
                  </div>
                </div>
                <UserProfileDropdown user={user} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}