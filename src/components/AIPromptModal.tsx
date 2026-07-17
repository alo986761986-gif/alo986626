import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Music, Loader2, Play, Compass } from "lucide-react";
import { GENRES, MOODS } from "../data/catalogue";
import { Recommendation } from "../types";

interface AIPromptModalProps {
  onPlayRecommendation: (title: string, artist: string) => void;
  offlineMode: boolean;
  history: Array<{ title: string; artist: string }>;
  themeStyles?: any;
}

export default function AIPromptModal({ onPlayRecommendation, offlineMode, history, themeStyles }: AIPromptModalProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(["Pop", "Electronic"]);
  const [selectedMood, setSelectedMood] = useState<string>("Rilassato ☕");
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [aiExplanation, setAiExplanation] = useState("");

  const activeThemeStyles = themeStyles || {
    accentText: "text-green-500",
    accentBg: "bg-green-500",
    accentBorder: "border-green-500/40",
    accentFill: "fill-green-500",
    accentShadow: "shadow-green-500/10",
  };

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredGenres: selectedGenres,
          mood: selectedMood,
          history: history.slice(-5),
          offlineMode: offlineMode,
        }),
      });
      const data = await response.json();
      if (data) {
        setRecommendations(data.recommendations || []);
        setAiExplanation(data.aiExplanation || "");
      }
    } catch (err) {
      console.error("Failed to generate recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#121212]/90 border border-neutral-800/80 rounded-2xl p-6 h-full space-y-6 overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-neutral-800/60 pb-4">
        <div className={`p-2.5 ${activeThemeStyles.accentBg}/10 rounded-xl`}>
          <Sparkles className={`w-5 h-5 ${activeThemeStyles.accentText}`} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">AI Discover Radar</h2>
          <p className="text-xs text-neutral-400">Lascia che l'intelligenza artificiale di Beatfy crei la tua impronta sonora</p>
        </div>
      </div>

      {/* Inputs Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-[#181818]/40 p-4 rounded-xl border border-neutral-800/40">
        {/* Mood Selection */}
        <div className="space-y-2">
          <span className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider block">
            Qual è il tuo mood attuale?
          </span>
          <div className="flex flex-wrap gap-1.5">
            {MOODS.map((mood) => {
              const isActive = selectedMood === mood;
              return (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition ${
                    isActive
                      ? `${activeThemeStyles.accentBg} text-black shadow-md font-extrabold`
                      : "bg-[#222] text-neutral-300 hover:bg-neutral-800 border border-neutral-800/50"
                  }`}
                >
                  {mood}
                </button>
              );
            })}
          </div>
        </div>

        {/* Genres Selection */}
        <div className="space-y-2">
          <span className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider block">
            Scegli i tuoi generi di riferimento
          </span>
          <div className="flex flex-wrap gap-1.5">
            {GENRES.map((genre) => {
              const active = selectedGenres.includes(genre);
              return (
                <button
                  key={genre}
                  onClick={() => handleGenreToggle(genre)}
                  className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition ${
                    active
                      ? `bg-neutral-800 ${activeThemeStyles.accentText} border ${activeThemeStyles.accentBorder}`
                      : "bg-[#222] text-neutral-300 hover:bg-neutral-800 border border-neutral-800/50"
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={generateRecommendations}
        disabled={loading}
        className={`w-full ${activeThemeStyles.accentBg} hover:opacity-90 text-black font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg ${activeThemeStyles.accentShadow}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Elaborazione algoritmo Beatfy AI...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" /> Genera Raccomandazioni AI Personalizzate
          </>
        )}
      </button>

      {/* Results */}
      <div className="space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <span className={`animate-spin border-4 border-t-transparent w-8 h-8 rounded-full`} style={{ borderColor: "rgba(99,102,241,0.2)", borderTopColor: "currentColor" }} />
            <p className="text-2xs font-mono text-neutral-500 uppercase tracking-widest text-center">
              Analisi delle frequenze acustiche in corso...
            </p>
          </div>
        )}

        <AnimatePresence>
          {!loading && recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* Global AI analysis response */}
              {aiExplanation && (
                <div className={`p-4 bg-[#181818]/60 border ${activeThemeStyles.accentBorder} rounded-xl space-y-2`}>
                  <span className={`text-4xs font-bold ${activeThemeStyles.accentText} uppercase tracking-widest font-mono block`}>PROFILO IMPRONTA SONORA</span>
                  <p className="text-xs text-neutral-200 leading-relaxed italic">{aiExplanation}</p>
                </div>
              )}

              {/* Recommended Tracks Grid */}
              <div className="space-y-2.5">
                <span className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider block">
                  Brani Suggeriti per Te
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 bg-[#181818] border border-neutral-800 rounded-xl hover:border-neutral-700 transition flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <div className="p-2 bg-neutral-800 rounded-lg shrink-0 flex items-center justify-center">
                            <Music className={`w-4 h-4 ${activeThemeStyles.accentText}`} />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-white block">{rec.title}</span>
                            <span className="text-3xs text-neutral-400 block">{rec.artist} • <span className={activeThemeStyles.accentText}>{rec.genre}</span></span>
                          </div>
                        </div>
                        <button
                          onClick={() => onPlayRecommendation(rec.title, rec.artist)}
                          className={`p-2 ${activeThemeStyles.accentBg}/10 ${activeThemeStyles.accentText} hover:${activeThemeStyles.accentBg} hover:text-black rounded-lg transition`}
                          title="Riproduci Brano"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-neutral-800/60 text-3xs text-neutral-400 leading-normal">
                        <span className={`font-semibold ${activeThemeStyles.accentText}`}>Perché consigliato:</span> {rec.justification}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && recommendations.length === 0 && (
          <div className="text-center py-16 bg-[#181818]/20 border border-dashed border-neutral-800/60 rounded-xl flex flex-col items-center justify-center gap-3">
            <Compass className="w-8 h-8 text-neutral-600 animate-pulse" />
            <div>
              <p className="text-xs text-neutral-400 font-bold">Nessun suggerimento attivo</p>
              <p className="text-3xs text-neutral-500 max-w-[280px] mx-auto mt-1">Imposta il tuo stato d'animo e sintonizza il radar per ricevere nuove scoperte musicali esclusive.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
