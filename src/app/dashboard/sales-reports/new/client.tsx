'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SalesReportForm } from "@/components/forms/SalesReportForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CheckCircle, Plus } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function NewSalesReportClient() {
  const router = useRouter();
  const [success, setSuccess] = useState<string | null>(null);
  const { showSuccess } = useToast();

  const handleSuccess = (reportId: string) => {
    setSuccess(reportId);
    showSuccess("Sales report created successfully!", {
      title: "Report Created",
      duration: 5000,
    });
    
    // Redirect to reports list after 3 seconds
    setTimeout(() => {
      router.push("/dashboard/sales-reports");
    }, 3000);
  };

  const handleCancel = () => {
    router.push("/dashboard/sales-reports");
  };

  // Show success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Sales Report Created!
                </h1>
                <p className="text-gray-600">
                  Your sales report has been successfully created and saved as a draft.
                </p>
                <p className="text-sm text-gray-500">
                  Report ID: {success}
                </p>
                <div className="pt-4">
                  <Button onClick={() => router.push("/dashboard/sales-reports")}>
                    View All Reports
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Reports
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plus className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                New Sales Report
              </h1>
              <p className="text-gray-600 mt-1">
                Create a daily sales report for your outlet
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <Alert>
              <AlertDescription>
                <strong>Instructions:</strong> Fill in the cash deposits and card settlements for your outlet. 
                The total sales will be automatically calculated. You can also upload supporting documents 
                like receipts and deposit slips.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Form */}
        <div className="max-w-4xl">
          <SalesReportForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
}