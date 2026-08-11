"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Global shortcuts (spec section 19): Ctrl/Cmd+J opens JARVIS from anywhere.
// Space-to-talk and Esc-to-close are handled locally by the JARVIS screen
// itself, since they only make sense while it's focused/active.
export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        router.push("/jarvis");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
