import { ReactNode, Suspense } from "react";

export default function ReceivablesLayout({ children }: { children: ReactNode }) {

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-6">
        <Suspense>{children}</Suspense>
      </div>
    </div>
  );
}


