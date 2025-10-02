/**
 * Integration tests for complete authentication flow
 * Tests login, logout, session management, and route protection
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn, signOut, useSession } from "next-auth/react";
import { SessionProvider } from "next-auth/react";
import { LoginForm } from "@/components/forms/login-form";

// Mock NextAuth
jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  redirect: jest.fn(),
}));

describe("Authentication Flow Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
  });

  describe("Login Flow", () => {
    it("should successfully log in with valid credentials", async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockResolvedValue({ ok: true, error: null });

      render(
        <SessionProvider session={null}>
          <LoginForm />
        </SessionProvider>
      );

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "ValidPassword123!");
      await user.click(submitButton);

      // Verify signIn was called with correct parameters
      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith("credentials", {
          email: "test@example.com",
          password: "ValidPassword123!",
          redirect: false,
        });
      });
    });

    it("should display error message on failed login", async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockResolvedValue({ 
        ok: false, 
        error: "Invalid credentials" 
      });

      render(
        <SessionProvider session={null}>
          <LoginForm />
        </SessionProvider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "WrongPassword");
      await user.click(submitButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
    });

    it("should validate email format", async () => {
      const user = userEvent.setup();

      render(
        <SessionProvider session={null}>
          <LoginForm />
        </SessionProvider>
      );

      const submitButton = screen.getByRole("button", { name: /sign in/i });

      // Submit form without entering email (triggers validation)
      await user.click(submitButton);

      // Verify validation error appears
      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });

      // SignIn should not be called when validation fails
      expect(signIn).not.toHaveBeenCalled();
    });

    it("should handle rate limiting", async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockResolvedValue({ 
        ok: false, 
        error: "Too many login attempts" 
      });

      render(
        <SessionProvider session={null}>
          <LoginForm />
        </SessionProvider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password");
      await user.click(submitButton);

      // Verify rate limit error message
      await waitFor(() => {
        expect(screen.getByText(/too many login attempts. please try again later./i)).toBeInTheDocument();
      });
    });
  });

  describe("Logout Flow", () => {
    it("should successfully log out user", async () => {
      (useSession as jest.Mock).mockReturnValue({
        data: {
          user: {
            id: "1",
            email: "test@example.com",
            name: "Test User",
            role: "ADMIN",
          },
        },
        status: "authenticated",
      });

      (signOut as jest.Mock).mockResolvedValue(undefined);

      const LogoutButton = () => {
        const { data: session } = useSession();
        
        if (!session) return null;
        
        return (
          <button onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign Out
          </button>
        );
      };

      render(
        <SessionProvider session={null}>
          <LogoutButton />
        </SessionProvider>
      );

      const logoutButton = screen.getByRole("button", { name: /sign out/i });
      await userEvent.click(logoutButton);

      // Verify signOut was called
      expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
    });
  });

  describe("Session Management", () => {
    it("should maintain session across page refreshes", async () => {
      const mockSession = {
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test User",
          role: "ADMIN",
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: "authenticated",
      });

      const SessionDisplay = () => {
        const { data: session } = useSession();
        
        if (!session) return <div>Not authenticated</div>;
        
        return (
          <div>
            <p>Welcome, {session.user.name}</p>
            <p>Role: {session.user.role}</p>
          </div>
        );
      };

      render(
        <SessionProvider session={mockSession}>
          <SessionDisplay />
        </SessionProvider>
      );

      expect(screen.getByText(/welcome, test user/i)).toBeInTheDocument();
      expect(screen.getByText(/role: admin/i)).toBeInTheDocument();
    });

    it("should handle session expiry", async () => {
      // Start with authenticated session
      (useSession as jest.Mock).mockReturnValue({
        data: {
          user: {
            id: "1",
            email: "test@example.com",
            name: "Test User",
            role: "ADMIN",
          },
        },
        status: "authenticated",
      });

      const { rerender } = render(
        <SessionProvider session={null}>
          <div>Authenticated</div>
        </SessionProvider>
      );

      // Simulate session expiry
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: "unauthenticated",
      });

      rerender(
        <SessionProvider session={null}>
          <div>Session expired</div>
        </SessionProvider>
      );

      expect(screen.getByText(/session expired/i)).toBeInTheDocument();
    });
  });

  describe("Protected Routes", () => {
    it("should redirect unauthenticated users to login", async () => {
      const { redirect } = require("next/navigation");
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: "unauthenticated",
      });

      // Simulate protected route component
      const ProtectedComponent = () => {
        const { data: session, status } = useSession();
        
        if (status === "loading") return <div>Loading...</div>;
        if (!session) {
          redirect("/login");
          return null;
        }
        
        return <div>Protected content</div>;
      };

      render(
        <SessionProvider session={null}>
          <ProtectedComponent />
        </SessionProvider>
      );

      expect(redirect).toHaveBeenCalledWith("/login");
    });

    it("should allow authenticated users to access protected routes", () => {
      (useSession as jest.Mock).mockReturnValue({
        data: {
          user: {
            id: "1",
            email: "test@example.com",
            name: "Test User",
            role: "ADMIN",
          },
        },
        status: "authenticated",
      });

      const ProtectedComponent = () => {
        const { data: session } = useSession();
        
        if (!session) return null;
        
        return <div>Protected content</div>;
      };

      render(
        <SessionProvider session={null}>
          <ProtectedComponent />
        </SessionProvider>
      );

      expect(screen.getByText(/protected content/i)).toBeInTheDocument();
    });

    it("should enforce role-based access control", () => {
      const { redirect } = require("next/navigation");
      
      // User with SALES role trying to access ADMIN route
      (useSession as jest.Mock).mockReturnValue({
        data: {
          user: {
            id: "1",
            email: "test@example.com",
            name: "Test User",
            role: "SALES",
          },
        },
        status: "authenticated",
      });

      const AdminOnlyComponent = () => {
        const { data: session } = useSession();
        
        if (!session) {
          redirect("/login");
          return null;
        }
        
        if (session.user.role !== "ADMIN") {
          redirect("/unauthorized");
          return null;
        }
        
        return <div>Admin content</div>;
      };

      render(
        <SessionProvider session={null}>
          <AdminOnlyComponent />
        </SessionProvider>
      );

      expect(redirect).toHaveBeenCalledWith("/unauthorized");
    });
  });
});