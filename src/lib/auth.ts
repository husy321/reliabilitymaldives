import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { NextAuthOptions } from "next-auth";

// Import authOptions from the route file - this will be mocked in tests
let authOptions: NextAuthOptions;
if (typeof jest === "undefined") {
  const route = require("@/app/api/auth/[...nextauth]/route");
  authOptions = route.authOptions;
}

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function requireAuth() {
  const session = await getSession();
  
  if (!session?.user) {
    redirect("/login");
  }
  
  return session.user;
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth();
  
  if (!allowedRoles.includes(user.role)) {
    redirect("/unauthorized");
  }
  
  return user;
}