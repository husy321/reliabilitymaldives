"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DashboardWidgetProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  error?: string | null;
}

interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

// Simple error boundary replacement for testing
class WidgetErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType<ErrorFallbackProps> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ComponentType<ErrorFallbackProps> }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback;
      return <Fallback error={this.state.error} resetErrorBoundary={() => {}} />;
    }

    return this.props.children;
  }
}

function WidgetErrorFallback({ error }: ErrorFallbackProps) {
  return (
    <Card className="border-red-200">
      <CardContent className="p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load widget: {error?.message || 'Unknown error'}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export default function DashboardWidget({
  title,
  children,
  icon: Icon,
  loading = false,
  error = null,
}: DashboardWidgetProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            {Icon && <Icon className="h-5 w-5" />}
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <WidgetErrorBoundary fallback={WidgetErrorFallback}>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-foreground text-base font-medium">
            {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {children}
        </CardContent>
      </Card>
    </WidgetErrorBoundary>
  );
}