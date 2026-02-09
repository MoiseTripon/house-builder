"use client";

import React from "react";

// Simple toast - can be replaced with shadcn toast later
export function Toast({
  message,
  type = "info",
}: {
  message: string;
  type?: "info" | "error" | "success";
}) {
  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-sm z-50 animate-in slide-in-from-bottom-2 ${
        type === "error"
          ? "bg-destructive text-destructive-foreground"
          : type === "success"
            ? "bg-green-600 text-white"
            : "bg-foreground text-background"
      }`}
    >
      {message}
    </div>
  );
}
