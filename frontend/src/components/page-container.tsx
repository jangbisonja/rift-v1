import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standardized full-width page container.
 * All public listing pages and detail pages use this to ensure consistent
 * max-width, horizontal padding, and vertical spacing.
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto max-w-7xl px-4 py-10", className)}>
      {children}
    </div>
  );
}
