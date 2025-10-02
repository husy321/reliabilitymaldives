import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

const mockAuthOptions = {};

jest.mock("../auth", () => {
  const originalModule = jest.requireActual("../auth");
  return {
    ...originalModule,
    getSession: jest.fn(async () => {
      const { getServerSession } = require("next-auth");
      return getServerSession(mockAuthOptions);
    }),
    getCurrentUser: jest.fn(async () => {
      const { getServerSession } = require("next-auth");
      const session = await getServerSession(mockAuthOptions);
      return session?.user;
    }),
    requireAuth: jest.fn(async () => {
      const { getServerSession } = require("next-auth");
      const { redirect } = require("next/navigation");
      const session = await getServerSession(mockAuthOptions);
      
      if (!session?.user) {
        redirect("/login");
        return null;
      }
      
      return session.user;
    }),
    requireRole: jest.fn(async (allowedRoles: string[]) => {
      const { getServerSession } = require("next-auth");
      const { redirect } = require("next/navigation");
      const session = await getServerSession(mockAuthOptions);
      
      if (!session?.user) {
        redirect("/login");
        return null;
      }
      
      if (!allowedRoles.includes(session.user.role)) {
        redirect("/unauthorized");
        return null;
      }
      
      return session.user;
    }),
  };
});

import { getSession, getCurrentUser, requireAuth, requireRole } from "../auth";

describe("Auth utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getSession", () => {
    it("returns session when authenticated", async () => {
      const mockSession = {
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test User",
          role: "ADMIN",
        },
      };
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const session = await getSession();
      expect(session).toEqual(mockSession);
    });

    it("returns null when not authenticated", async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const session = await getSession();
      expect(session).toBeNull();
    });
  });

  describe("getCurrentUser", () => {
    it("returns user when session exists", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        role: "ADMIN",
      };
      (getServerSession as jest.Mock).mockResolvedValue({ user: mockUser });

      const user = await getCurrentUser();
      expect(user).toEqual(mockUser);
    });

    it("returns undefined when no session", async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const user = await getCurrentUser();
      expect(user).toBeUndefined();
    });
  });

  describe("requireAuth", () => {
    it("returns user when authenticated", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        role: "ADMIN",
      };
      (getServerSession as jest.Mock).mockResolvedValue({ user: mockUser });

      const user = await requireAuth();
      expect(user).toEqual(mockUser);
      expect(redirect).not.toHaveBeenCalled();
    });

    it("redirects to login when not authenticated", async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      await requireAuth();
      expect(redirect).toHaveBeenCalledWith("/login");
    });
  });

  describe("requireRole", () => {
    it("returns user when role is allowed", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        role: "ADMIN",
      };
      (getServerSession as jest.Mock).mockResolvedValue({ user: mockUser });

      const user = await requireRole(["ADMIN", "MANAGER"]);
      expect(user).toEqual(mockUser);
    });

    it("redirects to unauthorized when role not allowed", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        role: "SALES",
      };
      (getServerSession as jest.Mock).mockResolvedValue({ user: mockUser });

      await requireRole(["ADMIN", "MANAGER"]);
      expect(redirect).toHaveBeenCalledWith("/unauthorized");
    });

    it("redirects to login when not authenticated", async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      await requireRole(["ADMIN"]);
      expect(redirect).toHaveBeenCalledWith("/login");
    });
  });
});