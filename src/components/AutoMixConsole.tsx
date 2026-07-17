import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, RefreshCw, Layers, Radio, Sliders } from "lucide-react";
import { Track } from "../types";

// Static mapping of BPMs for standard tracks to make the DJ mix incredibly realistic
export const getTrackBPM = (trackId: string): number => {
  const bpmMap: Record<string, number> = {
    "track-1": 124, // Midnight Horizon (Electronic)
    "track-2": 105, // Golden Hour Waves (Pop)
    "track-3": 118, // Stardust Serenade (Pop)
    "track-4": 128, // Neon Cyberpunk Run (Electronic)
    "track-5": 84,  // Rainy Autumn Leaves (Classical)
    "track-6": 90,  // Late Night Jazz Mood (Jazz)
    "track-7": 95,  // Velvet Lounge Chillout (Ambient)
    "track-8": 80,  // Ethereal Echoes (Ambient)
    "podcast-1": 100,
    "podcast-2": 95,
    "podcast-3": 85,
    "radio-1": 110,
    "radio-2": 122,
  };
  return bpmMap[trackId] || 120;
};

interface AutoMixConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track;
  nextTrack: Track;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  autoMixEnabled: boolean;
  onToggleAutoMix: () => void;
  playbackRate: number;
  themeStyles: any;
}

export default function AutoMixConsole({
  isOpen,
  onClose,
  currentTrack,
  nextTrack,
  currentTime,
  duration,
  isPlaying,
  autoMixEnabled,
  onToggleAutoMix,
  playbackRate,
  themeStyles,
}: AutoMixConsoleProps) {
  const [pulseScale, setPulseScale] = useState(1);
  const [activeBeat, setActiveBeat] = useState(0);

  const currentBpm = getTrackBPM(currentTrack.id);
  const nextBpm = getTrackBPM(nextTrack.id);

  // Time calculations
  const beatDuration = 60 / currentBpm;
  const barDuration = 4 * beatDuration;
  
  // Transition window configuration
  const targetRemaining = Math.max(8, Math.min(18, duration * 0.15));
  const transitionRemaining = Math.round(targetRemaining / barDuration) * barDuration;
  const idealTransitionTime = duration - transitionRemaining;
  const isMixingWindow = currentTime >= idealTransitionTime && currentTime < duration;
  const remainingUntilTransition = Math.max(0, idealTransitionTime - currentTime);

  // Simulate beat pulsation based on BPM
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = (60 / currentBpm) * 1000;
    const interval = setInterval(() => {
      setPulseScale(1.12);
      setActiveBeat((prev) => (prev + 1) % 4);
      setTimeout(() => setPulseScale(1.0), 120);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [currentBpm, isPlaying]);

  if (!isOpen) return null;

  const pitchDiffPercent = ((currentBpm / nextBpm) - 1) * 100;
  const syncedBpm = Math.round(currentBpm);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div 
        id="automix-modal-card"
        className="relative w-full max-w-lg bg-[#121212] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Background Ambient DJ Deck Glow */}
        <div className={`absolute -top-32 -right-32 w-72 h-72 rounded-full opacity-10 blur-3xl ${themeStyles.accentBg}`} />
        <div className="absolute -bottom-32 -left-32 w-72 h-72 rounded-full opacity-5 blur-3xl bg-neutral-800" />

        {/* Modal Header */}
        <div className="relative z-10 p-5 border-b border-neutral-800/80 flex justify-between items-center bg-[#161616]/90">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg bg-neutral-900 border border-neutral-800 ${themeStyles.accentText}`}>
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Console Auto-Mix Intelligente
              </h2>
              <p className="text-4xs font-mono text-neutral-400 uppercase tracking-widest mt-0.5">
                Rilevamento e Sincronizzazione Beat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800/80 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 relative z-10 overflow-y-auto max-h-[70vh]">
          {/* Main Activation Slider / Switch */}
          <div className="p-4 bg-[#181818]/60 border border-neutral-800/80 rounded-xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-2xs font-bold text-white uppercase tracking-wider block">
                Abilita Auto-Mix
              </span>
              <p className="text-4xs text-neutral-400 max-w-[280px]">
                Attiva l'algoritmo di allineamento ritmico e transizione fraseggiata sul cambio traccia.
              </p>
            </div>
            <button
              onClick={onToggleAutoMix}
              className={`w-11 h-6 rounded-full p-0.5 transition shrink-0 cursor-pointer ${
                autoMixEnabled ? themeStyles.accentBg : "bg-neutral-800 border border-neutral-700"
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition duration-200 ${
                autoMixEnabled ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>

          {autoMixEnabled ? (
            <div className="space-y-6">
              {/* DJ Pitch & Sync Engine Status */}
              <div className="grid grid-cols-2 gap-4">
                {/* Deck A - Current Song */}
                <div className="p-4 bg-neutral-900/60 border border-neutral-800/40 rounded-xl relative overflow-hidden">
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="text-5xs font-mono font-bold text-red-500 bg-red-500/10 px-1 py-0.2 rounded uppercase">
                      DECK A
                    </span>
                  </div>
                  <span className="text-4xs font-mono text-neutral-400 uppercase block tracking-widest">
                    Brano Attivo
                  </span>
                  <p className="text-xs font-bold text-white truncate mt-1.5 mb-1">
                    {currentTrack.title}
                  </p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-black text-white font-mono">
                      {Math.round(currentBpm)}
                    </span>
                    <span className="text-4xs font-bold text-neutral-400 font-mono">BPM</span>
                  </div>
                  <p className="text-5xs font-mono text-neutral-500 uppercase mt-1">
                    Velocità nativa: {currentBpm} BPM
                  </p>
                </div>

                {/* Deck B - Next Song */}
                <div className="p-4 bg-neutral-900/60 border border-neutral-800/40 rounded-xl relative overflow-hidden">
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="text-5xs font-mono font-bold text-blue-500 bg-blue-500/10 px-1 py-0.2 rounded uppercase">
                      DECK B
                    </span>
                  </div>
                  <span className="text-4xs font-mono text-neutral-400 uppercase block tracking-widest">
                    Prossimo Brano
                  </span>
                  <p className="text-xs font-bold text-white truncate mt-1.5 mb-1">
                    {nextTrack.title}
                  </p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-black text-indigo-400 font-mono">
                      {Math.round(nextBpm)}
                    </span>
                    <span className="text-4xs font-bold text-neutral-400 font-mono">BPM</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-5xs font-mono font-bold ${pitchDiffPercent > 0 ? "text-green-400" : "text-red-400"}`}>
                      {pitchDiffPercent > 0 ? "+" : ""}{pitchDiffPercent.toFixed(2)}%
                    </span>
                    <span className="text-5xs font-mono text-neutral-500 uppercase">
                      Pitch Sync Bend
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time Beat Match Grid Indicator */}
              <div className="p-4 bg-neutral-950 border border-neutral-900 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-4xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
                    Allineamento Griglia Ritmica
                  </span>
                  <span className={`text-4xs font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                    isMixingWindow 
                      ? "bg-amber-500/10 text-amber-500 animate-pulse" 
                      : "bg-green-500/10 text-green-500"
                  }`}>
                    {isMixingWindow ? "MIX IN CORSO (FADING)" : "ALLINEAMENTO ATTIVO"}
                  </span>
                </div>

                {/* Beat pulses */}
                <div className="flex justify-between gap-2.5 py-2">
                  {[0, 1, 2, 3].map((b) => {
                    const isActive = b === activeBeat;
                    return (
                      <div
                        key={b}
                        className="flex-1 h-6 rounded-lg border flex items-center justify-center transition-all duration-150"
                        style={{
                          backgroundColor: isActive ? `${themeStyles.accentBg}15` : "transparent",
                          borderColor: isActive ? themeStyles.accentBorder : "#262626",
                          transform: isActive ? `scale(${pulseScale})` : "scale(1.0)",
                        }}
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full transition-all duration-150 ${
                            isActive ? themeStyles.accentBg : "bg-neutral-800"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Pitch Return Meter */}
                <div className="space-y-1 pt-1.5">
                  <div className="flex justify-between text-5xs font-mono text-neutral-400 uppercase">
                    <span>Fattore Riproduzione (Tempo Multiplier)</span>
                    <span className="font-bold text-white">{playbackRate.toFixed(4)}x</span>
                  </div>
                  <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-150 ${themeStyles.accentBg}`}
                      style={{ width: `${Math.min(100, Math.max(0, (playbackRate - 0.8) / 0.4 * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Ideal Transition Point Countdown block */}
              <div className="p-4 bg-neutral-900/40 border border-neutral-800/40 rounded-xl space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-3xs font-bold text-neutral-300 uppercase">
                    Punto di Transizione Ideale
                  </span>
                  <span className="text-4xs font-mono text-neutral-500">
                    Sincronizzato al battito {Math.floor(idealTransitionTime * (currentBpm / 60))}
                  </span>
                </div>

                <div className="flex items-center gap-4 py-1">
                  <div className="w-12 h-12 rounded-xl bg-[#161616] border border-neutral-800 flex flex-col items-center justify-center shrink-0">
                    <Layers className={`w-5 h-5 ${isMixingWindow ? "text-amber-500 animate-spin" : themeStyles.accentText}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isMixingWindow ? (
                      <div>
                        <p className="text-xs font-black text-amber-500 uppercase tracking-wide animate-pulse">
                          Transizione in corso...
                        </p>
                        <p className="text-4xs text-neutral-400 mt-0.5">
                          Dissolvenza fraseggiata attiva. Allineamento dei beat in corso.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-white">
                          Inizio mix tra <span className={`font-mono ${themeStyles.accentText}`}>{remainingUntilTransition.toFixed(1)}s</span>
                        </p>
                        <p className="text-4xs text-neutral-400 mt-0.5">
                          Il mixer rileva la fine della frase musicale a {formatTime(idealTransitionTime)} (battito {Math.round(idealTransitionTime / beatDuration)}).
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                <Sliders className="w-7 h-7" />
              </div>
              <div className="max-w-xs mx-auto space-y-1.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Auto-Mix Disattivato
                </h3>
                <p className="text-3xs text-neutral-500 leading-normal">
                  Abilita l'Auto-Mix per far analizzare all'algoritmo il ritmo (BPM) del brano attivo e del successivo, calcolando la transizione perfetta.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#161616] border-t border-neutral-800 flex justify-between items-center text-4xs text-neutral-400 font-mono uppercase tracking-widest">
          <span>Beatfy DJ Engine v2.0</span>
          <span>Pitch Sync locked</span>
        </div>
      </div>
    </div>
  );
}

function formatTime(secs: number) {
  if (isNaN(secs) || secs === Infinity) return "0:00";
  const mins = Math.floor(secs / 60);
  const remainingSecs = Math.floor(secs % 60);
  return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
}
