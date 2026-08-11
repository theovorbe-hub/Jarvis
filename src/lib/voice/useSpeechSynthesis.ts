"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseSpeechSynthesisOptions {
  voiceName?: string;
  volume?: number;
  rate?: number;
  pitch?: number;
  muted?: boolean;
}

// Browser-native Text-to-Speech via the Web Speech Synthesis API.
export function useSpeechSynthesis(options: UseSpeechSynthesisOptions = {}) {
  const { voiceName = "default", volume = 1, rate = 1, pitch = 1, muted = false } = options;
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || muted || !text.trim()) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.volume = Math.min(1, Math.max(0, volume));
      utterance.rate = rate;
      utterance.pitch = pitch;

      if (voiceName !== "default") {
        const match = voices.find((v) => v.name === voiceName);
        if (match) utterance.voice = match;
      } else {
        const frenchVoice = voices.find((v) => v.lang.startsWith("fr"));
        if (frenchVoice) utterance.voice = frenchVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, muted, volume, rate, pitch, voiceName, voices]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { isSupported, isSpeaking, voices, speak, stop };
}
