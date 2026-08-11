"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type WindowWithSpeech = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export type VoiceState = "idle" | "listening" | "speaking";

export function useVoice(params: {
  onFinalTranscript: (text: string) => void;
  volume: number;
  voiceName?: string;
  muted: boolean;
}) {
  const { onFinalTranscript, volume, voiceName, muted } = params;
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [state, setState] = useState<VoiceState>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    const w = window as WindowWithSpeech;
    const SpeechRecognitionCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    setSupported(Boolean(SpeechRecognitionCtor) && "speechSynthesis" in window);
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    function loadVoices() {
      setVoices(window.speechSynthesis.getVoices());
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    const w = window as WindowWithSpeech;
    const SpeechRecognitionCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setState("listening");
    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      setInterimTranscript(interim);
      if (final.trim()) {
        setInterimTranscript("");
        onFinalTranscriptRef.current(final.trim());
      }
    };
    recognition.onerror = () => {
      setState("idle");
    };
    recognition.onend = () => {
      setState((s) => (s === "listening" ? "idle" : s));
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!("speechSynthesis" in window) || muted || !text.trim()) {
        onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.volume = Math.min(1, Math.max(0, volume));
      utterance.rate = 1.02;
      utterance.pitch = 0.95;

      const preferred = voices.find((v) => v.name === voiceName);
      const frenchVoice = voices.find((v) => v.lang?.startsWith("fr"));
      if (preferred) utterance.voice = preferred;
      else if (frenchVoice) utterance.voice = frenchVoice;

      utterance.onstart = () => setState("speaking");
      utterance.onend = () => {
        setState("idle");
        onEnd?.();
      };
      utterance.onerror = () => {
        setState("idle");
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    },
    [muted, volume, voiceName, voices]
  );

  const cancelSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setState("idle");
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  return {
    state,
    supported,
    interimTranscript,
    startListening,
    stopListening,
    speak,
    cancelSpeaking,
    voices,
  };
}
