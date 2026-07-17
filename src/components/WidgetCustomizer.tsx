import { useState } from "react";
import { motion } from "motion/react";
import { Layout, Check, Play, SkipForward, Music } from "lucide-react";
import { CustomWidgetConfig } from "../types";

interface WidgetCustomizerProps {
  currentTrack: { title: string; artist: string } | null;
}

export default function WidgetCustomizer({ currentTrack }: WidgetCustomizerProps) {
  const [config, setConfig] = useState<CustomWidgetConfig>({
    size: "medium",
    themeColor: "rgb(99, 102, 241)", // Indigo-500 (Geometric Balance)
    showVisualizer: true,
    showQueue: false,
    borderRadius: "1rem",
  });

  const [copied, setCopied] = useState(false);

  const colors = [
    { name: "Geometric Balance", value: "rgb(99, 102, 241)" }, // indigo-500
    { name: "Beatfy Green", value: "rgb(34, 197, 94)" },
    { name: "Cyber Neon", value: "rgb(236, 72, 153)" }, // pink-500
    { name: "Cosmic Purple", value: "rgb(168, 85, 247)" }, // purple-500
    { name: "Amber Fusion", value: "rgb(245, 158, 11)" }, // amber-500
  ];

  const handleCopyCode = () => {
    const code = `<BeatfyWidget size="${config.size}" theme="${config.themeColor}" visualizer={${config.showVisualizer}} queue={${config.showQueue}} radius="${config.borderRadius}" />`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeTrackTitle = currentTrack?.title || "Senza Traccia";
  const activeTrackArtist = currentTrack?.artist || "Avvia un brano";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start h-full">
      {/* Configuration Panel */}
      <div className="bg-[#121212]/90 border border-neutral-800/80 rounded-2xl p-6 space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl">
              <Layout className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Widget Schermata Home</h2>
              <p className="text-xs text-neutral-400">Personalizza il widget di Beatfy per il tuo dispositivo</p>
            </div>
          </div>
        </div>

        {/* Sizing options */}
        <div className="space-y-3">
          <span className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider block">
            Dimensione Widget
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(["small", "medium", "large"] as const).map((size) => (
              <button
                key={size}
                onClick={() => {
                  setConfig((prev) => ({
                    ...prev,
                    size,
                    showQueue: size === "large" ? prev.showQueue : false,
                  }));
                }}
                className={`p-3 rounded-xl border text-center font-semibold text-xs transition uppercase tracking-wider ${
                  config.size === size
                    ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400"
                    : "bg-[#181818] border-neutral-800 text-neutral-400 hover:border-neutral-700"
                }`}
              >
                {size === "small" ? "Piccolo (2x2)" : size === "medium" ? "Medio (4x2)" : "Grande (4x4)"}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Colors */}
        <div className="space-y-3">
          <span className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider block">
            Colore Principale Accentato
          </span>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((c) => (
              <button
                key={c.name}
                onClick={() => setConfig((prev) => ({ ...prev, themeColor: c.value }))}
                className="w-8 h-8 rounded-full border border-neutral-800 flex items-center justify-center relative transition scale-100 hover:scale-105"
                style={{ backgroundColor: c.value }}
                title={c.name}
              >
                {config.themeColor === c.value && (
                  <Check className="w-4 h-4 text-white drop-shadow-md" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <span className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider block">
            Visualizzazione & Contenuto
          </span>
          <div className="space-y-2">
            {/* Show visualizer */}
            <label className="flex items-center justify-between p-3.5 bg-[#181818] border border-neutral-800 rounded-xl cursor-pointer hover:border-neutral-700 transition">
              <div>
                <span className="text-xs font-bold text-white block">Visualizer Audio</span>
                <span className="text-3xs text-neutral-400 block">Simula le onde dello spettro musicale nel widget</span>
              </div>
              <input
                type="checkbox"
                checked={config.showVisualizer}
                onChange={(e) => setConfig((prev) => ({ ...prev, showVisualizer: e.target.checked }))}
                className="accent-indigo-500 w-4 h-4"
              />
            </label>

            {/* Show queue - only available on Large */}
            <label
              className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${
                config.size === "large"
                  ? "bg-[#181818] border-neutral-800 hover:border-neutral-700"
                  : "bg-[#181818]/30 border-neutral-900/40 opacity-40 cursor-not-allowed"
              }`}
            >
              <div>
                <span className="text-xs font-bold text-white block">Mostra Prossime Canzoni</span>
                <span className="text-3xs text-neutral-400 block">Richiede dimensione del widget Grande (4x4)</span>
              </div>
              <input
                type="checkbox"
                checked={config.showQueue}
                disabled={config.size !== "large"}
                onChange={(e) => setConfig((prev) => ({ ...prev, showQueue: e.target.checked }))}
                className="accent-indigo-500 w-4 h-4"
              />
            </label>
          </div>
        </div>

        {/* Borders */}
        <div className="space-y-3">
          <span className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider block">
            Smussamento Angoli (Border Radius)
          </span>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { label: "Squadrato", val: "0px" },
              { label: "Morbido", val: "1rem" },
              { label: "Rotondo", val: "2rem" },
            ].map((r) => (
              <button
                key={r.label}
                onClick={() => setConfig((prev) => ({ ...prev, borderRadius: r.val }))}
                className={`p-2.5 rounded-xl border text-center font-semibold transition ${
                  config.borderRadius === r.val
                    ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400"
                    : "bg-[#181818] border-neutral-800 text-neutral-400 hover:border-neutral-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Copy Developer Widget Code */}
        <div className="pt-4 border-t border-neutral-800/80">
          <button
            onClick={handleCopyCode}
            className="w-full flex items-center justify-center gap-2 bg-[#222] hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-bold py-3 px-4 rounded-xl text-xs transition"
          >
            <span className="font-mono text-indigo-400">&lt;/&gt;</span>
            {copied ? "Codice Copiato!" : "Copia Codice del Widget"}
          </button>
        </div>
      </div>

      {/* Widget Preview inside Phone Frame */}
      <div className="flex flex-col items-center justify-center">
        <span className="text-2xs font-mono text-neutral-500 uppercase tracking-widest block mb-4">
          Anteprima Live in tempo reale
        </span>

        {/* Smartphone Frame */}
        <div className="w-[320px] h-[550px] bg-[#0c0c0c] border-[10px] border-[#222] rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col justify-between p-4">
          {/* Speaker / Camera Notch */}
          <div className="absolute top-2.5 left-1/2 transform -translate-x-1/2 w-24 h-4 bg-[#222] rounded-full z-20 flex items-center justify-center">
            <div className="w-2 h-2 bg-black rounded-full mr-2" />
            <div className="w-10 h-1 bg-neutral-800 rounded-full" />
          </div>

          {/* Phone Screen Info / Top Bar */}
          <div className="flex justify-between items-center text-3xs font-mono text-neutral-400 px-3 pt-4 z-10">
            <span>09:41</span>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-4 h-2 bg-neutral-600 rounded-sm" />
            </div>
          </div>

          {/* Screen Content - App Widget Showcase */}
          <div className="flex-1 flex flex-col items-center justify-center p-3">
            <span className="text-4xs uppercase tracking-widest text-neutral-500 mb-6 font-semibold">
              Schermata Home iOS / Android
            </span>

            {/* Simulated customizable Widget */}
            <motion.div
              layout
              style={{
                borderRadius: config.borderRadius,
                borderColor: config.themeColor,
              }}
              className="w-full bg-[#1e1e1e] border-l-4 p-4 shadow-xl flex flex-col justify-between overflow-hidden relative"
              animate={{
                height: config.size === "small" ? 140 : config.size === "medium" ? 150 : 280,
              }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            >
              {/* Widget Header */}
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded bg-[#111]">
                    <Music className="w-3.5 h-3.5" style={{ color: config.themeColor }} />
                  </div>
                  <span className="text-4xs uppercase font-bold tracking-widest text-neutral-400">Beatfy</span>
                </div>
                <span className="text-5xs font-mono text-neutral-500">WIDGET ACTIVE</span>
              </div>

              {/* Central Track details */}
              <div className="my-auto flex items-center gap-3">
                <div className="w-12 h-12 rounded bg-[#333] flex items-center justify-center relative overflow-hidden shadow-md">
                  <div className="absolute inset-0 bg-gradient-to-tr opacity-25" style={{ backgroundImage: `linear-gradient(to top right, ${config.themeColor}, black)` }} />
                  <Music className="w-5 h-5 text-neutral-400 relative z-10" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-2xs text-white block truncate">
                    {activeTrackTitle}
                  </span>
                  <span className="text-4xs text-neutral-400 block truncate">
                    {activeTrackArtist}
                  </span>
                </div>
              </div>

              {/* Optional simulated visualizer wave */}
              {config.showVisualizer && (
                <div className="flex items-end gap-1.5 h-6 my-2 px-1">
                  {[4, 8, 3, 7, 5, 2, 6, 9, 3, 7, 5, 4, 8].map((h, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [`${h * 10}%`, `${(h + 2) % 10 * 10}%`, `${h * 10}%`] }}
                      transition={{ duration: 1 + i * 0.1, repeat: Infinity }}
                      className="flex-1 w-1 bg-opacity-70 rounded-full"
                      style={{ backgroundColor: config.themeColor }}
                    />
                  ))}
                </div>
              )}

              {/* Sizing constraints of content */}
              {config.size !== "small" && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-neutral-800/60">
                  <span className="text-5xs font-mono text-neutral-500">HI-FI FLUID PLAYBACK</span>
                  <div className="flex items-center gap-3">
                    <Play className="w-3.5 h-3.5 text-neutral-400 hover:text-white" />
                    <SkipForward className="w-3.5 h-3.5 text-neutral-400 hover:text-white" />
                  </div>
                </div>
              )}

              {/* Large specific view: Queue list */}
              {config.size === "large" && config.showQueue && (
                <div className="mt-3 pt-3 border-t border-neutral-800/80 space-y-2">
                  <span className="text-5xs uppercase tracking-wider font-bold text-neutral-400 block">Prossimi brani</span>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-5xs text-neutral-400">
                      <span className="truncate max-w-[140px]">Midnight City • M83</span>
                      <span>3:40</span>
                    </div>
                    <div className="flex justify-between text-5xs text-neutral-400">
                      <span className="truncate max-w-[140px]">Starlight • Muse</span>
                      <span>3:50</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Bottom Bar Indicator */}
          <div className="w-28 h-1 bg-neutral-600 rounded-full mx-auto mb-1.5" />
        </div>
      </div>
    </div>
  );
}
