import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        success:
          "border-transparent bg-success/10 text-success border-success/20 [a&]:hover:bg-success/20",
        warning:
          "border-transparent bg-warning/10 text-warning border-warning/20 [a&]:hover:bg-warning/20",
        info:
          "border-transparent bg-info/10 text-info border-info/20 [a&]:hover:bg-info/20",
        danger:
          "border-transparent bg-destructive/10 text-destructive border-destructive/20 [a&]:hover:bg-destructive/20",
      },
      status: {
        active: "bg-success/10 text-success border-success/20 [a&]:hover:bg-success/20",
        inactive: "bg-destructive/10 text-destructive border-destructive/20 [a&]:hover:bg-destructive/20",
        pending: "bg-warning/10 text-warning border-warning/20 [a&]:hover:bg-warning/20",
        completed: "bg-success/10 text-success border-success/20 [a&]:hover:bg-success/20",
      },
      priority: {
        high: "bg-destructive/10 text-destructive border-destructive/20 [a&]:hover:bg-destructive/20",
        medium: "bg-warning/10 text-warning border-warning/20 [a&]:hover:bg-warning/20",
        low: "bg-success/10 text-success border-success/20 [a&]:hover:bg-success/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  status,
  priority,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, status, priority }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
