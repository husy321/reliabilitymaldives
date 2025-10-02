import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "../header";
import { useSession, signOut } from "next-auth/react";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

describe("Header", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when no session", () => {
    (useSession as jest.Mock).mockReturnValue({ data: null });
    
    const { container } = render(<Header />);
    expect(container.firstChild).toBeNull();
  });

  it("renders header with user info when session exists", () => {
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          name: "Test User",
          role: "ADMIN",
        },
      },
    });

    render(<Header />);
    
    expect(screen.getByText("Reliability Maldives")).toBeInTheDocument();
    expect(screen.getByText("Test User (ADMIN)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("calls signOut when logout button clicked", async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          name: "Test User",
          role: "ADMIN",
        },
      },
    });

    render(<Header />);
    
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    fireEvent.click(logoutButton);

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });

  it("displays different user roles correctly", () => {
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          name: "Sales User",
          role: "SALES",
        },
      },
    });

    render(<Header />);
    
    expect(screen.getByText("Sales User (SALES)")).toBeInTheDocument();
  });
});