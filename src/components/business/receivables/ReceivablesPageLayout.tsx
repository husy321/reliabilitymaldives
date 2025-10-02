import React, { ReactNode } from "react";
import { PageLayout, NavSection, CardLayout, FilterSection } from "@/components/ui/layout";
import ReceivablesSubnav from "./ReceivablesSubnav";

interface ReceivablesPageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  subnav?: {
    items: Array<{
      label: string;
      href: string;
      count?: number;
    }>;
  };
  filters?: ReactNode;
  currentPath?: string;
}

function ReceivablesPageLayoutBase({
  children,
  title,
  description,
  action,
  subnav,
  filters,
  currentPath
}: ReceivablesPageLayoutProps) {
  return (
    <PageLayout>
      {/* Navigation Section */}
      {subnav && (
        <NavSection>
          <ReceivablesSubnav items={subnav.items} currentPath={currentPath} />
        </NavSection>
      )}

      {/* Filters Section */}
      {filters && (
        <FilterSection>
          {filters}
        </FilterSection>
      )}

      {/* Main Content */}
      <CardLayout
        title={title}
        description={description}
        action={action}
        contentClassName="p-0"
      >
        {children}
      </CardLayout>
    </PageLayout>
  );
}

export const ReceivablesPageLayout = React.memo(ReceivablesPageLayoutBase);