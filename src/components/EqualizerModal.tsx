import { motion } from "motion/react";
import { Sliders, X, Radio, Volume2, Sparkles } from "lucide-react";

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gains: number[]; // 5 values for 60Hz, 230Hz, 910Hz, 4kHz, 14kHz
  onGainChange: (index: number, value: number) => void;
  spatialAudio: boolean;
  onSpatialToggle: () => void;
  bassBoost: boolean;
  onBassToggle: () => void;
  themeStyles?: any;
}

const PRESETS = [
  { name: "Piatto (Flat)", values: [0, 0, 0, 0, 0] },
  { name: "Rock", values: [5, 3, -1, 2, 4] },
  { name: "Jazz", values: [3, 2, 1, 3, 2] },
  { name: "Bass", values: [8, 5, 0, -3, -3] },
  { name: "Vocal", values: [-3, -1, 4, 5, 2] },
  { name: "Electronic", values: [6, 4, -2, 3, 5] },
];

export default function EqualizerModal({
  isOpen,
  onClose,
  gains,
  onGainChange,
  spatialAudio,
  onSpatialToggle,
  bassBoost,
  onBassToggle,
  themeStyles,
}: EqualizerModalProps) {
  if (!isOpen) return null;

  const activeThemeStyles = themeStyles || {
    accentText: "text-green-500",
    accentBg: "bg-green-500",
    accentBorder: "border-green-500/40",
    accentFill: "fill-green-500",
    accentShadow: "shadow-green-500/10",
    accentColor: "accent-green-500",
  };

  const isPresetActive = (presetValues: number[]) => {
    return gains.every((val, i) => val === presetValues[i]);
  };

  const applyPreset = (values: number[]) => {
    values.forEach((val, i) => onGainChange(i, val));
  };

  const labels = ["60Hz (Sub)", "230Hz (Bass)", "910Hz (Mid)", "4kHz (Presence)", "14kHz (Treble)"];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#181818] border border-neutral-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-[#1e1e1e]">
          <div className="flex items-center gap-3">
            <Sliders className={`w-5 h-5 ${activeThemeStyles.accentText}`} />
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Equalizzatore Audio Hi-Fi</h2>
              <p className="text-xs text-neutral-400">Modella il tuo suono ad altissima fedeltà</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Preset Buttons */}
          <div>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-3">
              Preset Audio
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
                const active = isPresetActive(preset.values);
                return (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset.values)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                      active
                        ? `bg-[#222] ${activeThemeStyles.accentText} border ${activeThemeStyles.accentBorder}`
                        : "border-neutral-800 bg-[#222] hover:bg-neutral-800 text-neutral-200 hover:border-neutral-700"
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Equalizer Bands Sliders */}
          <div>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-4">
              Bande Frequenze (dB)
            </span>
            <div className="grid grid-cols-5 gap-3 h-52 bg-black/30 p-4 rounded-xl border border-neutral-900">
              {gains.map((gain, index) => (
                <div key={index} className="flex flex-col items-center justify-between h-full">
                  <span className={`text-2xs font-mono ${activeThemeStyles.accentText} font-bold`}>
                    {gain > 0 ? `+${gain}` : gain}
                  </span>
                  <div className="relative flex-1 flex items-center justify-center my-2">
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={gain}
                      onChange={(e) => onGainChange(index, parseInt(e.target.value))}
                      className={`${activeThemeStyles.accentColor} cursor-pointer h-full vertical-range`}
                      style={{
                        writingMode: "bt-lr",
                        WebkitAppearance: "slider-vertical",
                        width: "8px",
                      }}
                    />
                  </div>
                  <span className="text-4xs font-mono text-neutral-500 text-center uppercase tracking-tight leading-3">
                    {labels[index]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Additional DSP Options */}
          <div className="grid grid-cols-2 gap-4">
            {/* Spatial Audio */}
            <button
              onClick={onSpatialToggle}
              className={`p-4 rounded-xl border flex flex-col gap-2 items-start text-left transition ${
                spatialAudio
                  ? `${activeThemeStyles.accentBg}/10 ${activeThemeStyles.accentBorder} ${activeThemeStyles.accentText}`
                  : "bg-[#222] border-neutral-800 text-neutral-300 hover:border-neutral-700"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <Radio className={`w-5 h-5 ${activeThemeStyles.accentText}`} />
                <span className={`text-3xs font-bold uppercase px-1.5 py-0.5 ${activeThemeStyles.accentBg} text-black rounded`}>
                  {spatialAudio ? "ATTIVO" : "OFF"}
                </span>
              </div>
              <div>
                <span className="font-bold text-sm block text-white">Audio Spaziale 3D</span>
                <span className="text-2xs text-neutral-400 leading-normal block">
                  Simula una dispersione a 360° per un'immersione cinematografica.
                </span>
              </div>
            </button>

            {/* Bass Boost */}
            <button
              onClick={onBassToggle}
              className={`p-4 rounded-xl border flex flex-col gap-2 items-start text-left transition ${
                bassBoost
                  ? `${activeThemeStyles.accentBg}/10 ${activeThemeStyles.accentBorder} ${activeThemeStyles.accentText}`
                  : "bg-[#222] border-neutral-800 text-neutral-300 hover:border-neutral-700"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <Sparkles className={`w-5 h-5 ${activeThemeStyles.accentText}`} />
                <span className={`text-3xs font-bold uppercase px-1.5 py-0.5 ${activeThemeStyles.accentBg} text-black rounded`}>
                  {bassBoost ? "ATTIVO" : "OFF"}
                </span>
              </div>
              <div>
                <span className="font-bold text-sm block text-white">Bass Booster Pro</span>
                <span className="text-2xs text-neutral-400 leading-normal block">
                  Esalta le frequenze sub-bassi profonde senza distorsione di picco.
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-[#141414] text-center">
          <p className="text-3xs text-neutral-500 font-mono flex items-center justify-center gap-1">
            <Volume2 className="w-3.5 h-3.5" /> STREAMING AUDIO DSP PROCESSOR INTEGRATO • HI-RES ACCELERATED
          </p>
        </div>
      </motion.div>
    </div>
  );
}
