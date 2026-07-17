import { useEffect, useRef, useState } from "react";
import { X, Music, Mic, Play, Pause, SkipForward, SkipBack, Sparkles } from "lucide-react";
import { Track } from "../types";
import { getLyricsForTrack } from "../data/lyrics";

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onNextTrack?: () => void;
  onPrevTrack?: () => void;
  themeStyles?: any;
}

export default function LyricsModal({
  isOpen,
  onClose,
  currentTrack,
  currentTime,
  isPlaying,
  onTogglePlay,
  onSeek,
  onNextTrack,
  onPrevTrack,
  themeStyles,
}: LyricsModalProps) {
  const [karaokeMode, setKaraokeMode] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLButtonElement | null>(null);

  const lyrics = getLyricsForTrack(currentTrack.id, currentTrack.title, currentTrack.artist);

  // Find the active lyric line index based on current time
  const activeIndex = lyrics.reduce((acc, line, index) => {
    if (currentTime >= line.time) {
      return index;
    }
    return acc;
  }, 0);

  // Auto-scroll to active line
  useEffect(() => {
    if (isOpen && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex, isOpen, karaokeMode]);

  if (!isOpen) return null;

  const activeThemeStyles = themeStyles || {
    accentText: "text-green-500",
    accentBg: "bg-green-500",
    accentBorder: "border-green-500/40",
    accentFill: "fill-green-500",
    accentShadow: "shadow-green-500/10",
    accentColor: "accent-green-500",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        id="lyrics-modal-card"
        className="relative w-full max-w-3xl h-[85vh] flex flex-col bg-[#121212]/95 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Background Ambient Glow */}
        <div className={`absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-15 blur-3xl ${activeThemeStyles.accentBg}`} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl bg-neutral-800" />

        {/* Modal Header */}
        <div className="relative z-10 p-5 border-b border-neutral-800/80 flex justify-between items-center bg-[#161616]/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 ${activeThemeStyles.accentText}`}>
              <Mic className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono uppercase tracking-wider">
                  Testi Sincronizzati
                </span>
                {currentTrack.isPodcast && (
                  <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono uppercase tracking-wider">
                    Podcast
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5 leading-snug">
                {currentTrack.title}
              </h2>
              <p className="text-xs text-neutral-400 font-medium">
                {currentTrack.artist}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Karaoke Mode Toggle */}
            <button
              onClick={() => setKaraokeMode(!karaokeMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                karaokeMode
                  ? `${activeThemeStyles.accentBg}/15 ${activeThemeStyles.accentText} ${activeThemeStyles.accentBorder}`
                  : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
              title="Attiva modalità focus Karaoke"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Karaoke Mode</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800/80 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lyrics Container */}
        <div 
          ref={containerRef}
          className={`relative z-10 flex-1 overflow-y-auto px-6 py-12 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent ${
            karaokeMode ? "flex flex-col justify-center items-center" : "space-y-4"
          }`}
          style={{ scrollBehavior: "smooth" }}
        >
          {karaokeMode ? (
            <div className="w-full text-center max-w-xl py-8">
              <span className="text-4xs font-mono uppercase tracking-widest text-neutral-600 block mb-4">
                LINEA ATTUALE
              </span>
              <p className={`text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight transition duration-300 leading-normal ${activeThemeStyles.accentText} drop-shadow-md filter drop-shadow-[0_0_12px_rgba(34,197,94,0.15)]`}>
                {lyrics[activeIndex]?.text}
              </p>
              {activeIndex < lyrics.length - 1 && (
                <div className="mt-8 pt-8 border-t border-neutral-900 space-y-1.5 opacity-30">
                  <span className="text-4xs font-mono uppercase tracking-widest text-neutral-600 block">
                    A SEGUIRE
                  </span>
                  <p className="text-lg text-neutral-400 font-medium">
                    {lyrics[activeIndex + 1]?.text}
                  </p>
                </div>
              )}
            </div>
          ) : (
            lyrics.map((line, index) => {
              const isActive = index === activeIndex;
              const isPast = index < activeIndex;

              return (
                <button
                  key={index}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => onSeek(line.time)}
                  className={`w-full text-left py-3 px-4 rounded-xl transition duration-300 group flex items-start gap-4 ${
                    isActive
                      ? "bg-neutral-800/40 text-white font-extrabold"
                      : isPast
                      ? "text-neutral-500 font-medium opacity-85 hover:text-neutral-300"
                      : "text-neutral-600 font-medium hover:text-neutral-400"
                  }`}
                >
                  <span className={`font-mono text-3xs pt-1 shrink-0 select-none ${
                    isActive ? activeThemeStyles.accentText : "text-neutral-600"
                  }`}>
                    {Math.floor(line.time / 60)}:{(line.time % 60).toString().padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <p className={`text-base sm:text-lg tracking-tight leading-relaxed transition-all ${
                      isActive 
                        ? `${activeThemeStyles.accentText} scale-[1.01] origin-left` 
                        : ""
                    }`}>
                      {line.text}
                    </p>
                  </div>
                  <span className={`text-4xs font-mono tracking-widest uppercase transition-opacity duration-250 shrink-0 ${
                    isActive ? "opacity-80" : "opacity-0 group-hover:opacity-40"
                  } ${activeThemeStyles.accentText}`}>
                    {isActive ? "LIVE" : "SALTA A"}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer / Playback Sync */}
        <div className="relative z-10 p-5 bg-[#161616]/95 border-t border-neutral-800/80 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onPrevTrack}
              className="text-neutral-400 hover:text-white transition p-1.5 hover:bg-neutral-800/40 rounded-lg"
              title="Precedente"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={onTogglePlay}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition scale-100 hover:scale-105 ${activeThemeStyles.accentBg} text-black font-black shadow-lg shadow-black/40`}
              title={isPlaying ? "Pausa" : "Riproduci"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
            <button
              onClick={onNextTrack}
              className="text-neutral-400 hover:text-white transition p-1.5 hover:bg-neutral-800/40 rounded-lg"
              title="Successiva"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-neutral-400 w-full sm:max-w-md">
            <span>{Math.floor(currentTime / 60)}:{(Math.floor(currentTime) % 60).toString().padStart(2, "0")}</span>
            <div className="flex-1 relative flex items-center">
              <div className="absolute inset-0 bg-neutral-800 h-1.5 rounded-full" />
              <div 
                className={`absolute left-0 h-1.5 rounded-full ${activeThemeStyles.accentBg}`} 
                style={{ width: `${currentTrack.duration ? (currentTime / currentTrack.duration) * 100 : 0}%` }}
              />
              <input
                type="range"
                min="0"
                max={currentTrack.duration || 100}
                value={currentTime}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className={`absolute w-full h-1.5 opacity-0 cursor-pointer`}
              />
            </div>
            <span>{Math.floor(currentTrack.duration / 60)}:{(currentTrack.duration % 60).toString().padStart(2, "0")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
