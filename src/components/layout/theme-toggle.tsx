"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const hydrated = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const { theme, toggleTheme } = useTheme();

  // Reserve the space, but never offer an inert control without JavaScript.
  if (!hydrated) {
    return <span className="block size-11 shrink-0" aria-hidden="true" />;
  }

  const label =
    theme === "light" ? "Switch to dark theme" : "Switch to light theme";
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {theme === "light" ? (
        <Moon className="size-5" aria-hidden="true" />
      ) : (
        <Sun className="size-5" aria-hidden="true" />
      )}
    </Button>
  );
}
