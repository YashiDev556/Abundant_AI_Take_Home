"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface PageHeaderProps {
  /** Breadcrumb items - last item is current page (no link) */
  breadcrumbs: BreadcrumbItem[];
  /** Optional content to render on the right side */
  actions?: React.ReactNode;
  /** Additional class name for the header container */
  className?: string;
}

/**
 * Consistent page header with breadcrumb navigation.
 * 
 * Usage:
 * ```tsx
 * <PageHeader
 *   breadcrumbs={[
 *     { label: "Workspace", href: "/workspace", icon: <FileText className="size-3.5 text-primary" /> },
 *     { label: "Task Name" }
 *   ]}
 *   actions={<Button>Save</Button>}
 * />
 * ```
 */
export function PageHeader({ breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("border-b px-4 py-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const isFirst = index === 0;
            
            return (
              <div key={index} className="flex items-center gap-2 min-w-0">
                {/* Separator (not for first item) */}
                {!isFirst && (
                  <span className="text-muted-foreground/50 shrink-0">›</span>
                )}
                
                {/* Breadcrumb item */}
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span className={cn(
                    "flex items-center gap-1.5 text-sm",
                    isLast ? "font-medium truncate" : "text-muted-foreground shrink-0"
                  )}>
                    {item.icon}
                    <span className={isLast ? "truncate" : ""}>{item.label}</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Common breadcrumb presets for consistency
 */
export const BREADCRUMB_PRESETS = {
  workspace: (icon: React.ReactNode) => ({
    label: "Workspace",
    href: "/workspace",
    icon,
  }),
  workspaceApprovals: (icon: React.ReactNode) => ({
    label: "Reviews", 
    href: "/admin/workspace-tasks",
    icon,
  }),
  tasks: (icon: React.ReactNode) => ({
    label: "Tasks",
    href: "/tasks",
    icon,
  }),
  admin: (icon: React.ReactNode) => ({
    label: "Admin",
    href: "/admin",
    icon,
  }),
} as const;
