"use client";

import { useEffect, useState } from "react";

export interface SystemStatus {
  online: boolean;
  battery: { level: number; charging: boolean } | null;
  storage: { usedMB: number; quotaMB: number } | null;
}

interface BatteryManagerLike extends EventTarget {
  level: number;
  charging: boolean;
}

export function useSystemStatus(): SystemStatus {
  const [online, setOnline] = useState(true);
  const [battery, setBattery] = useState<SystemStatus["battery"]>(null);
  const [storage, setStorage] = useState<SystemStatus["storage"]>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (nav.getBattery) {
      nav.getBattery().then((mgr) => {
        const update = () => setBattery({ level: mgr.level, charging: mgr.charging });
        update();
        mgr.addEventListener("levelchange", update);
        mgr.addEventListener("chargingchange", update);
      });
    }

    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((est) => {
        setStorage({
          usedMB: Math.round((est.usage ?? 0) / 1024 / 1024),
          quotaMB: Math.round((est.quota ?? 0) / 1024 / 1024),
        });
      });
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return { online, battery, storage };
}
