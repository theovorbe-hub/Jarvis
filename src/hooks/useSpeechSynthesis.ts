"use client";

import { useCallback, useEffect, useState } from "react";

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);

    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      const frenchFirst = [...list].sort((a, b) => {
        const aFr = a.lang.startsWith("fr") ? 0 : 1;
        const bFr = b.lang.startsWith("fr") ? 0 : 1;
        return aFr - bFr;
      });
      setVoices(frenchFirst);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback(
    (text: string, opts?: { voiceURI?: string; rate?: number; volume?: number; onEnd?: () => void }) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.rate = opts?.rate ?? 1;
      utterance.volume = opts?.volume ?? 1;
      const voice = voices.find((v) => v.voiceURI === opts?.voiceURI);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        opts?.onEnd?.();
      };
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [voices]
  );

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { voices, speaking, supported, speak, cancel };
}
