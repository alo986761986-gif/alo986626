import { motion } from "motion/react";
import { Laptop, Tv, Smartphone, Speaker, Watch, X, Check, RefreshCw } from "lucide-react";
import { SyncDevice } from "../types";

interface CastModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: SyncDevice[];
  activeDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  onRefresh: () => void;
  currentSongTitle: string;
}

export default function CastModal({
  isOpen,
  onClose,
  devices,
  activeDeviceId,
  onSelectDevice,
  onRefresh,
  currentSongTitle,
}: CastModalProps) {
  if (!isOpen) return null;

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "desktop":
        return <Laptop className="w-5 h-5 text-neutral-300" />;
      case "tv":
        return <Tv className="w-5 h-5 text-neutral-300" />;
      case "mobile":
        return <Smartphone className="w-5 h-5 text-neutral-300" />;
      case "speaker":
        return <Speaker className="w-5 h-5 text-neutral-300" />;
      case "watch":
        return <Watch className="w-5 h-5 text-neutral-300" />;
      default:
        return <Laptop className="w-5 h-5 text-neutral-300" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#181818] border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-[#1e1e1e]">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Sincronizzazione Multidevice</h2>
            <p className="text-xs text-neutral-400">Riproduci e controlla Beatfy ovunque</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              title="Aggiorna dispositivi"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of Devices */}
        <div className="p-5 space-y-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
            Dispositivi Disponibili
          </span>
          <div className="space-y-2">
            {devices.map((device) => {
              const isActive = device.deviceId === activeDeviceId;
              return (
                <button
                  key={device.deviceId}
                  onClick={() => onSelectDevice(device.deviceId)}
                  className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition ${
                    isActive
                      ? "bg-green-500/10 border-green-500/40 text-green-400"
                      : "bg-[#222] border-neutral-800 hover:border-neutral-700 text-neutral-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${isActive ? "bg-green-500/20" : "bg-neutral-800"}`}>
                      {getDeviceIcon(device.deviceType)}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-white block">
                        {device.deviceName}
                      </span>
                      <span className="text-2xs text-neutral-400 block">
                        {isActive ? `In riproduzione: "${currentSongTitle || "Nessun brano"}"` : "Dispositivo sincronizzato"}
                      </span>
                    </div>
                  </div>
                  {isActive ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-500/15 px-2.5 py-1 rounded-full animate-pulse">
                      <Check className="w-3.5 h-3.5" /> Connesso
                    </span>
                  ) : (
                    <span className="text-2xs text-neutral-500 hover:text-neutral-300">
                      Tocca per connettere
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="bg-[#222]/50 p-4 rounded-xl border border-neutral-800/40 space-y-1.5">
            <span className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider block">
              Integrazione Smart Home
            </span>
            <p className="text-2xs text-neutral-400 leading-relaxed">
              Beatfy supporta lo streaming diretto sui tuoi assistenti intelligenti Google Nest, Amazon Echo e sistemi Smart TV. Cambia dispositivo senza interruzioni audio.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-[#141414] text-center text-3xs text-neutral-500 font-mono">
          REAL-TIME STREAM SYNC ENGINE v1.2 • MEMORY STATE PERSISTENT
        </div>
      </motion.div>
    </div>
  );
}
