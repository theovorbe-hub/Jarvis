"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, BatteryFull, HardDrive, Plug } from "lucide-react";

type BatteryManagerLike = {
  level: number;
  charging: boolean;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

type NavigatorWithBattery = Navigator & { getBattery?: () => Promise<BatteryManagerLike> };

export function SystemStatus({
  aiConfigured,
  searchConfigured,
  connectionsCount,
  filesCount,
}: {
  aiConfigured: boolean;
  searchConfigured: boolean;
  connectionsCount: number;
  filesCount: number;
}) {
  const [online, setOnline] = useState(true);
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const nav = navigator as NavigatorWithBattery;
    let batteryRef: BatteryManagerLike | null = null;
    let update: (() => void) | null = null;
    if (nav.getBattery) {
      nav.getBattery().then((b) => {
        batteryRef = b;
        update = () => setBattery({ level: b.level, charging: b.charging });
        update();
        b.addEventListener("levelchange", update);
        b.addEventListener("chargingchange", update);
      });
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (batteryRef && update) {
        batteryRef.removeEventListener("levelchange", update);
        batteryRef.removeEventListener("chargingchange", update);
      }
    };
  }, []);

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-jarvis-text-dim">Système</h3>
      <div className="flex flex-col gap-3 text-sm">
        <Row
          icon={online ? <Wifi size={15} /> : <WifiOff size={15} />}
          label="Connexion réseau"
          value={online ? "En ligne" : "Hors ligne"}
          good={online}
        />
        {battery && (
          <Row
            icon={<BatteryFull size={15} />}
            label="Batterie de l'appareil"
            value={`${Math.round(battery.level * 100)}%${battery.charging ? " (en charge)" : ""}`}
            good={battery.level > 0.2}
          />
        )}
        <Row
          icon={<Plug size={15} />}
          label="Moteur IA (Claude)"
          value={aiConfigured ? "Connecté" : "Non configuré"}
          good={aiConfigured}
        />
        <Row
          icon={<Wifi size={15} />}
          label="Recherche web"
          value={searchConfigured ? "Connectée" : "Non configurée"}
          good={searchConfigured}
        />
        <Row icon={<Plug size={15} />} label="Services connectés" value={String(connectionsCount)} good={connectionsCount > 0} />
        <Row icon={<HardDrive size={15} />} label="Fichiers stockés" value={String(filesCount)} good />
      </div>
    </div>
  );
}

function Row({ icon, label, value, good }: { icon: React.ReactNode; label: string; value: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-jarvis-text-dim">
        {icon}
        {label}
      </span>
      <span className={good ? "text-jarvis-good" : "text-jarvis-amber"}>{value}</span>
    </div>
  );
}
