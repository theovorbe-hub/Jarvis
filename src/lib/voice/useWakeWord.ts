"use client";

import { useEffect, useRef } from "react";
import { useSpeechRecognition } from "./useSpeechRecognition";

const WAKE_WORD = "jarvis";

// "Toujours à l'écoute" mode (spec section 3): continuously listens for the
// word "jarvis" and fires onWake with whatever follows it in the same
// utterance, e.g. "jarvis quelle heure est-il" -> "quelle heure est-il".
// Only ever active when the caller passes enabled=true, which the UI only
// does after the user has explicitly granted the "always_listening"
// permission — this hook itself has no opinion on consent.
export function useWakeWord(enabled: boolean, onWake: (utterance: string) => void) {
  const onWakeRef = useRef(onWake);
  onWakeRef.current = onWake;

  const { isSupported, isListening, start, stop } = useSpeechRecognition({
    continuous: true,
    onFinalResult: (text) => {
      const lower = text.toLowerCase();
      const idx = lower.indexOf(WAKE_WORD);
      if (idx === -1) return;
      const rest = text.slice(idx + WAKE_WORD.length).replace(/^[,.\s]+/, "");
      onWakeRef.current(rest || text);
    },
  });

  useEffect(() => {
    if (!isSupported) return;
    if (enabled && !isListening) start();
    if (!enabled && isListening) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isSupported]);

  // Browsers auto-stop continuous recognition after a while; restart it
  // transparently while wake-word mode is still meant to be on.
  useEffect(() => {
    if (!enabled || !isSupported || isListening) return;
    const timer = setTimeout(() => start(), 300);
    return () => clearTimeout(timer);
  }, [enabled, isSupported, isListening, start]);

  return { isSupported, isListening };
}
