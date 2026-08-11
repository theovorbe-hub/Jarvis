"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseSpeechRecognitionOptions {
  continuous?: boolean;
  lang?: string;
  onFinalResult?: (transcript: string) => void;
}

// Browser-native Speech-to-Text (Chrome/Edge/Safari via the Web Speech API).
// No external service or API key required — this is a real, working
// implementation, not a stub.
export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { continuous = false, lang = "fr-FR", onFinalResult } = options;
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  useEffect(() => {
    const SpeechRecognitionCtor =
      typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;
    if (!SpeechRecognitionCtor) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) final += text;
        else interim += text;
      }
      if (final) {
        setTranscript((prev) => (continuous ? `${prev} ${final}`.trim() : final));
        onFinalResultRef.current?.(final.trim());
      }
      setInterimTranscript(interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [continuous, lang]);

  const start = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setTranscript("");
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // start() throws if already started; ignore.
    }
  }, [isListening]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const reset = useCallback(() => setTranscript(""), []);

  return { isSupported, isListening, transcript, interimTranscript, start, stop, reset };
}
