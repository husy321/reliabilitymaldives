import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Standard page layout with consistent container and spacing
interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {children}
      </div>
    </div>
  );
}

// Content section with consistent spacing
interface ContentSectionProps {
  children: ReactNode;
  className?: string;
  spacing?: 'tight' | 'normal' | 'loose';
}

export function ContentSection({
  children,
  className,
  spacing = 'normal'
}: ContentSectionProps) {
  const spacingClasses = {
    tight: 'space-y-3',
    normal: 'space-y-4',
    loose: 'space-y-6'
  };

  return (
    <div className={cn(spacingClasses[spacing], className)}>
      {children}
    </div>
  );
}

// Standard card layout for forms and content
interface CardLayoutProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
}

export function CardLayout({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  headerClassName
}: CardLayoutProps) {
  return (
    <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
      {(title || description || action) && (
        <div className={cn("flex flex-col space-y-1.5 p-6", headerClassName)}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              {title && (
                <h3 className="text-xl font-semibold leading-none tracking-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        </div>
      )}
      <div className={cn("p-6 pt-0", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

// Navigation section with consistent spacing
interface NavSectionProps {
  children: ReactNode;
  className?: string;
}

export function NavSection({ children, className }: NavSectionProps) {
  return (
    <div className={cn(className)}>
      {children}
    </div>
  );
}

// Filter/search section layout
interface FilterSectionProps {
  children: ReactNode;
  className?: string;
  layout?: 'horizontal' | 'vertical';
}

export function FilterSection({
  children,
  className,
  layout = 'horizontal'
}: FilterSectionProps) {
  const layoutClasses = {
    horizontal: 'flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between',
    vertical: 'space-y-4'
  };

  return (
    <div className={cn(layoutClasses[layout], className)}>
      {children}
    </div>
  );
}

// Responsive grid layout
interface GridLayoutProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GridLayout({
  children,
  columns = 1,
  gap = 'md',
  className
}: GridLayoutProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  };

  return (
    <div className={cn(
      'grid',
      columnClasses[columns],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}

// Stack layout for vertical spacing
interface StackLayoutProps {
  children: ReactNode;
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function StackLayout({
  children,
  spacing = 'md',
  className
}: StackLayoutProps) {
  const spacingClasses = {
    xs: 'space-y-1',
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6',
    xl: 'space-y-8'
  };

  return (
    <div className={cn(spacingClasses[spacing], className)}>
      {children}
    </div>
  );
}

// Two-column layout for forms
interface TwoColumnLayoutProps {
  left: ReactNode;
  right: ReactNode;
  leftClassName?: string;
  rightClassName?: string;
  className?: string;
}

export function TwoColumnLayout({
  left,
  right,
  leftClassName,
  rightClassName,
  className
}: TwoColumnLayoutProps) {
  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", className)}>
      <div className={leftClassName}>{left}</div>
      <div className={rightClassName}>{right}</div>
    </div>
  );
}