"use client";

import { useTheme } from "./theme-provider";
import { Sun, Moon } from "lucide-react";

interface Props {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", showLabel = false }: Props) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`${showLabel ? "button" : "icon-button"} ${className}`}
      title={
        theme === "dark" ? "Mudar para Tema Claro" : "Mudar para Tema Escuro"
      }
      aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
    >
      {theme === "dark" ? (
        <Sun className="w-[18px] h-[18px] shrink-0" />
      ) : (
        <Moon className="w-[18px] h-[18px] shrink-0" />
      )}
      {showLabel && (
        <span className="text-xs font-bold uppercase tracking-wider">
          {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
        </span>
      )}
    </button>
  );
}
