import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock all the complex dependencies
jest.mock("@/hooks/useOutletSelection", () => ({
  useOutletSelection: () => ({
    outlets: [
      { id: '1', name: 'Main Store', location: 'Downtown', isActive: true },
      { id: '2', name: 'Branch Store', location: 'Uptown', isActive: true }
    ],
    selectedOutletId: '1',
    isLoading: false,
    error: null,
    setSelectedOutletId: jest.fn(),
    refetchOutlets: jest.fn(),
  })
}));

jest.mock("@/lib/actions/sales-reports", () => ({
  submitSalesReportAction: jest.fn(() => Promise.resolve({
    success: true,
    data: { id: 'report-123' }
  }))
}));

jest.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showInfo: jest.fn(),
  })
}));

jest.mock("@/components/business/DocumentUploader", () => ({
  DocumentUploader: ({ onUploadComplete }: any) => (
    <div data-testid="document-uploader">
      <button onClick={() => onUploadComplete([{ id: '1', originalName: 'test.pdf' }])}>
        Upload Document
      </button>
    </div>
  )
}));

// Mock next-auth and other complex dependencies
jest.mock("next-auth/react", () => ({
  getSession: jest.fn(),
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
}));

jest.mock("@/lib/auth", () => ({
  requireRole: jest.fn(),
  getSession: jest.fn(),
  requireAuth: jest.fn(),
  getCurrentUser: jest.fn(),
}));

// Import the component after all mocks are set up
import { SalesReportForm } from "../SalesReportForm";

describe("SalesReportForm - Core Functionality", () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders form with basic fields", () => {
    render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    
    expect(screen.getByText(/daily sales report/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cash deposits/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/card settlements/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/total sales/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create sales report/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("displays outlet information", () => {
    render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    
    expect(screen.getByText("Main Store")).toBeInTheDocument();
    expect(screen.getByText("Downtown")).toBeInTheDocument();
  });

  it("calculates total automatically", async () => {
    const user = userEvent.setup();
    render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    
    const cashInput = screen.getByLabelText(/cash deposits/i);
    const cardInput = screen.getByLabelText(/card settlements/i);
    const totalInput = screen.getByLabelText(/total sales/i);
    
    await user.clear(cashInput);
    await user.type(cashInput, "100");
    
    await user.clear(cardInput);
    await user.type(cardInput, "200");
    
    await waitFor(() => {
      expect(totalInput).toHaveValue(300);
    });
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("handles document upload", async () => {
    const user = userEvent.setup();
    render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    
    const uploadButton = screen.getByText("Upload Document");
    await user.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/uploaded documents \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText("test.pdf")).toBeInTheDocument();
    });
  });

  it("renders document uploader section", () => {
    render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    
    expect(screen.getByText(/supporting documents/i)).toBeInTheDocument();
    expect(screen.getByTestId("document-uploader")).toBeInTheDocument();
  });

  it("shows form validation messages", async () => {
    const user = userEvent.setup();
    render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    
    const cashInput = screen.getByLabelText(/cash deposits/i);
    await user.clear(cashInput);
    await user.type(cashInput, "-10");
    
    const submitButton = screen.getByRole("button", { name: /create sales report/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/cash deposits cannot be negative/i)).toBeInTheDocument();
    });
  });
});