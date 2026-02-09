"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface NumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  suffix?: string;
  className?: string;
  disabled?: boolean;
}

export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  suffix,
  className,
  disabled,
}: NumberFieldProps) {
  const [localValue, setLocalValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value.toString());
    }
  }, [value, isFocused]);

  const commit = useCallback(() => {
    let num = parseFloat(localValue);
    if (isNaN(num)) {
      setLocalValue(value.toString());
      return;
    }
    if (min !== undefined) num = Math.max(min, num);
    if (max !== undefined) num = Math.min(max, num);
    setLocalValue(num.toString());
    onChange(num);
  }, [localValue, min, max, onChange, value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commit();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setLocalValue(value.toString());
      inputRef.current?.blur();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const num = parseFloat(localValue) || 0;
      const newVal = num + step;
      const clamped = max !== undefined ? Math.min(max, newVal) : newVal;
      setLocalValue(clamped.toString());
      onChange(clamped);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const num = parseFloat(localValue) || 0;
      const newVal = num - step;
      const clamped = min !== undefined ? Math.max(min, newVal) : newVal;
      setLocalValue(clamped.toString());
      onChange(clamped);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <label className="text-xs text-muted-foreground whitespace-nowrap">
          {label}
        </label>
      )}
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            inputRef.current?.select();
          }}
          onBlur={() => {
            setIsFocused(false);
            commit();
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            "w-full px-2 py-1 text-sm border border-border rounded bg-background",
            "focus:outline-none focus:ring-1 focus:ring-ring",
            suffix && "pr-8",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
