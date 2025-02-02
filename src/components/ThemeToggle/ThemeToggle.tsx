"use client";

import { ButtonHTMLAttributes } from "react";

interface ThemeToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  theme: "light" | "dark";
  onToggle: () => void;
}

/**
 * Theme toggle button component
 */
export function ThemeToggle({ theme, onToggle, className = "", ...props }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-full transition-colors ${
        theme === "dark" 
          ? "bg-gray-700 text-white hover:bg-gray-600" 
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      } ${className}`}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      {...props}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
} 