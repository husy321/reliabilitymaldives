import Link from "next/link";
import { cn } from "@/lib/utils";

type SubnavItem = {
  label: string;
  href: string;
  count?: number;
};

interface ReceivablesSubnavProps {
  items: SubnavItem[];
  currentPath?: string;
}

export function ReceivablesSubnav({ items, currentPath }: ReceivablesSubnavProps) {

  return (
    <nav aria-label="Receivables navigation" className="w-full">
      <div
        className="inline-flex items-center rounded-lg bg-muted p-1"
        role="tablist"
        aria-orientation="horizontal"
      >
        {items.map((item, index) => {
          const isActive = currentPath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${index}`}
              tabIndex={isActive ? 0 : -1}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                "border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "min-h-[2.25rem] min-w-[5rem]", // Consistent height and minimum width for all tabs
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="whitespace-nowrap">{item.label}</span>
              {typeof item.count === "number" && (
                <span
                  className={cn(
                    "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1.5 text-xs font-medium",
                    "bg-muted-foreground/20 border border-muted-foreground/30",
                    isActive
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "text-muted-foreground"
                  )}
                  aria-label={`${item.count} items`}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default ReceivablesSubnav;


