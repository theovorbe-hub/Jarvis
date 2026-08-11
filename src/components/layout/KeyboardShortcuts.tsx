"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const cmdOrCtrl = e.metaKey || e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === "j") {
        e.preventDefault();
        router.push("/");
        return;
      }

      if (e.key === "Escape") {
        window.dispatchEvent(new CustomEvent("jarvis:escape"));
        return;
      }

      if (e.code === "Space" && !isEditableTarget(e.target) && !cmdOrCtrl) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("jarvis:toggle-voice"));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
