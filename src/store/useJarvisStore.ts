"use client";

import { create } from "zustand";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

interface JarvisStore {
  orbState: OrbState;
  setOrbState: (state: OrbState) => void;

  voiceModeEnabled: boolean;
  setVoiceModeEnabled: (v: boolean) => void;

  alwaysListening: boolean;
  setAlwaysListening: (v: boolean) => void;

  muted: boolean;
  setMuted: (v: boolean) => void;

  volume: number;
  setVolume: (v: number) => void;

  voiceURI: string | null;
  setVoiceURI: (v: string | null) => void;
}

export const useJarvisStore = create<JarvisStore>((set) => ({
  orbState: "idle",
  setOrbState: (orbState) => set({ orbState }),

  voiceModeEnabled: false,
  setVoiceModeEnabled: (voiceModeEnabled) => set({ voiceModeEnabled }),

  alwaysListening: false,
  setAlwaysListening: (alwaysListening) => set({ alwaysListening }),

  muted: false,
  setMuted: (muted) => set({ muted }),

  volume: 1,
  setVolume: (volume) => set({ volume }),

  voiceURI: null,
  setVoiceURI: (voiceURI) => set({ voiceURI }),
}));
