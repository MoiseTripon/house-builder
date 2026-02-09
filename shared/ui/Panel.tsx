"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
}

export function Panel({ title, children, className, collapsible }: PanelProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div
      className={cn(
        "bg-background border border-border rounded-lg overflow-hidden",
        className,
      )}
    >
      {title && (
        <div
          className={cn(
            "px-3 py-2 border-b border-border bg-muted/50 text-sm font-medium flex items-center justify-between",
            collapsible && "cursor-pointer select-none",
          )}
          onClick={() => collapsible && setCollapsed(!collapsed)}
        >
          <span>{title}</span>
          {collapsible && (
            <span className="text-xs text-muted-foreground">
              {collapsed ? "▶" : "▼"}
            </span>
          )}
        </div>
      )}
      {!collapsed && <div className="p-3">{children}</div>}
    </div>
  );
}
