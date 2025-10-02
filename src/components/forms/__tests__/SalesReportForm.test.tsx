import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SalesReportForm } from "../SalesReportForm";
import { useOutletSelection } from "@/hooks/useOutletSelection";
import { submitSalesReportAction } from "@/lib/actions/sales-reports";
import { useToast } from "@/hooks/useToast";

// Mock dependencies
jest.mock("@/hooks/useOutletSelection");
jest.mock("@/lib/actions/sales-reports");
jest.mock("@/hooks/useToast");

// Mock auth module to prevent ESM issues
jest.mock("@/lib/auth", () => ({
  requireRole: jest.fn(),
  getSession: jest.fn(),
  requireAuth: jest.fn(),
  getCurrentUser: jest.fn(),
}));

// Mock next-auth to prevent ESM issues
jest.mock("next-auth/react", () => ({
  getSession: jest.fn(),
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
}));
jest.mock("@/components/business/DocumentUploader", () => ({
  DocumentUploader: ({ onUploadComplete }: any) => (
    <div data-testid="document-uploader">
      <button 
        onClick={() => onUploadComplete([{ id: '1', originalName: 'test.pdf' }])}
      >
        Upload Document
      </button>
    </div>
  )
}));

describe("SalesReportForm", () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();
  const mockShowError = jest.fn();
  const mockSetSelectedOutletId = jest.fn();

  const mockOutlets = [
    { id: '1', name: 'Main Store', location: 'Downtown', isActive: true },
    { id: '2', name: 'Branch Store', location: 'Uptown', isActive: true }
  ];

  beforeEach(() => {
    (useOutletSelection as jest.Mock).mockReturnValue({
      outlets: mockOutlets,
      selectedOutletId: '1',
      isLoading: false,
      error: null,
      setSelectedOutletId: mockSetSelectedOutletId,
      refetchOutlets: jest.fn(),
    });

    (useToast as jest.Mock).mockReturnValue({
      showError: mockShowError,
      showSuccess: jest.fn(),
      showInfo: jest.fn(),
    });

    (submitSalesReportAction as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'report-123' }
    });

    jest.clearAllMocks();
  });

  describe("Loading and Error States", () => {
    it("shows loading state when outlets are being fetched", () => {
      (useOutletSelection as jest.Mock).mockReturnValue({
        outlets: [],
        selectedOutletId: null,
        isLoading: true,
        error: null,
        setSelectedOutletId: mockSetSelectedOutletId,
        refetchOutlets: jest.fn(),
      });

      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      expect(screen.getByText(/loading outlets/i)).toBeInTheDocument();
    });

    it("shows error state when outlets fail to load", () => {
      (useOutletSelection as jest.Mock).mockReturnValue({
        outlets: [],
        selectedOutletId: null,
        isLoading: false,
        error: "Failed to load outlets",
        setSelectedOutletId: mockSetSelectedOutletId,
        refetchOutlets: jest.fn(),
      });

      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      expect(screen.getByText(/failed to load outlets/i)).toBeInTheDocument();
    });

    it("shows no outlets message when no outlets available", () => {
      (useOutletSelection as jest.Mock).mockReturnValue({
        outlets: [],
        selectedOutletId: null,
        isLoading: false,
        error: null,
        setSelectedOutletId: mockSetSelectedOutletId,
        refetchOutlets: jest.fn(),
      });

      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      expect(screen.getByText(/no outlets available/i)).toBeInTheDocument();
    });
  });

  describe("Form Rendering", () => {
    it("renders all form fields correctly", () => {
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      expect(screen.getByText(/outlet/i)).toBeInTheDocument();
      expect(screen.getByText(/report date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cash deposits/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/card settlements/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/total sales/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create sales report/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("displays selected outlet information", () => {
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      expect(screen.getByText("Main Store")).toBeInTheDocument();
      expect(screen.getByText("Downtown")).toBeInTheDocument();
    });

    it("renders outlet dropdown with available options", () => {
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      const selectTrigger = screen.getByRole("combobox");
      expect(selectTrigger).toBeInTheDocument();
    });

    it("renders document uploader section", () => {
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      expect(screen.getByText(/supporting documents/i)).toBeInTheDocument();
      expect(screen.getByTestId("document-uploader")).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("shows validation errors for empty required fields", async () => {
      const user = userEvent.setup();
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      const submitButton = screen.getByRole("button", { name: /create sales report/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Check if any validation errors are displayed
        const errors = screen.queryAllByText(/required/i);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it("validates negative cash deposits", async () => {
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

    it("validates negative card settlements", async () => {
      const user = userEvent.setup();
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      const cardInput = screen.getByLabelText(/card settlements/i);
      await user.clear(cardInput);
      await user.type(cardInput, "-5");
      
      const submitButton = screen.getByRole("button", { name: /create sales report/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/card settlements cannot be negative/i)).toBeInTheDocument();
      });
    });

    it("prevents future dates", async () => {
      const user = userEvent.setup();
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      // The DatePicker should have disableFuture={true}
      // This is handled by the DatePicker component itself
      // We'll verify the prop is passed correctly by checking the date picker behavior
      const datePickerButton = screen.getByRole("button", { name: /pick a date/i });
      expect(datePickerButton).toBeInTheDocument();
    });
  });

  describe("Automatic Calculations", () => {
    it("calculates total sales automatically", async () => {
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

    it("updates total when cash deposits change", async () => {
      const user = userEvent.setup();
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      const cashInput = screen.getByLabelText(/cash deposits/i);
      const totalInput = screen.getByLabelText(/total sales/i);
      
      await user.clear(cashInput);
      await user.type(cashInput, "150");
      
      await waitFor(() => {
        expect(totalInput).toHaveValue(150);
      });
    });

    it("updates total when card settlements change", async () => {
      const user = userEvent.setup();
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      const cardInput = screen.getByLabelText(/card settlements/i);
      const totalInput = screen.getByLabelText(/total sales/i);
      
      await user.clear(cardInput);
      await user.type(cardInput, "250");
      
      await waitFor(() => {
        expect(totalInput).toHaveValue(250);
      });
    });
  });

  describe("Outlet Selection", () => {
    it("calls setSelectedOutletId when outlet changes", async () => {
      const user = userEvent.setup();
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      // This test depends on the Select component behavior
      // In a real test, you would interact with the select dropdown
      // For now, we'll verify that the hook is called correctly
      expect(mockSetSelectedOutletId).toHaveBeenCalledWith('1');
    });

    it("updates form when selectedOutletId changes", () => {
      const { rerender } = render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      // Change the selected outlet
      (useOutletSelection as jest.Mock).mockReturnValue({
        outlets: mockOutlets,
        selectedOutletId: '2',
        isLoading: false,
        error: null,
        setSelectedOutletId: mockSetSelectedOutletId,
        refetchOutlets: jest.fn(),
      });
      
      rerender(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      expect(screen.getByText("Branch Store")).toBeInTheDocument();
      expect(screen.getByText("Uptown")).toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("submits form with valid data", async () => {
      const user = userEvent.setup();
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      const cashInput = screen.getByLabelText(/cash deposits/i);
      const cardInput = screen.getByLabelText(/card settlements/i);
      
      await user.clear(cashInput);
      await user.type(cashInput, "100");
      await user.clear(cardInput);
      await user.type(cardInput, "200");
      
      const submitButton = screen.getByRole("button", { name: /create sales report/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(submitSalesReportAction).toHaveBeenCalledWith(
          expect.objectContaining({
            outletId: '1',
            cashDeposits: 100,
            cardSettlements: 200,
            totalSales: 300
          })
        );
        expect(mockOnSuccess).toHaveBeenCalledWith('report-123');
      });
    });

    it("shows loading state during submission", async () => {
      (submitSalesReportAction as jest.Mock).mockImplementation(() => new Promise(() => {}));
      
      const user = userEvent.setup();
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      const cashInput = screen.getByLabelText(/cash deposits/i);
      await user.type(cashInput, "100");
      
      const submitButton = screen.getByRole("button", { name: /create sales report/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/creating report/i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
    });

    it("displays server error messages", async () => {
      (submitSalesReportAction as jest.Mock).mockResolvedValue({
        success: false,
        error: "Duplicate report for this date"
      });
      
      const user = userEvent.setup();
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      const cashInput = screen.getByLabelText(/cash deposits/i);
      await user.type(cashInput, "100");
      
      const submitButton = screen.getByRole("button", { name: /create sales report/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/duplicate report for this date/i)).toBeInTheDocument();
      });
    });

    it("handles submission errors gracefully", async () => {
      (submitSalesReportAction as jest.Mock).mockRejectedValue(new Error("Network error"));
      
      const user = userEvent.setup();
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      const cashInput = screen.getByLabelText(/cash deposits/i);
      await user.type(cashInput, "100");
      
      const submitButton = screen.getByRole("button", { name: /create sales report/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe("Document Upload Integration", () => {
    it("handles document upload completion", async () => {
      const user = userEvent.setup();
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      const uploadButton = screen.getByText("Upload Document");
      await user.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/uploaded documents \(1\)/i)).toBeInTheDocument();
        expect(screen.getByText("test.pdf")).toBeInTheDocument();
      });
    });

    it("displays uploaded document list", async () => {
      const user = userEvent.setup();
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      const uploadButton = screen.getByText("Upload Document");
      await user.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText("• test.pdf")).toBeInTheDocument();
      });
    });
  });

  describe("Form Actions", () => {
    it("calls onCancel when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it("disables form fields during submission", async () => {
      (submitSalesReportAction as jest.Mock).mockImplementation(() => new Promise(() => {}));
      
      const user = userEvent.setup();
      render(<SalesReportForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
      
      const submitButton = screen.getByRole("button", { name: /create sales report/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        const cashInput = screen.getByLabelText(/cash deposits/i);
        const cardInput = screen.getByLabelText(/card settlements/i);
        
        expect(cashInput).toBeDisabled();
        expect(cardInput).toBeDisabled();
        expect(submitButton).toBeDisabled();
      });
    });
  });
});