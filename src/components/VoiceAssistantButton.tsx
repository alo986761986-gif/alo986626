import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, Play, Send, Sparkles, X, Command } from "lucide-react";

interface VoiceAssistantButtonProps {
  onProcessCommand: (commandAction: {
    action: string;
    targetType: string | null;
    targetName: string | null;
    feedbackMessage: string;
  }) => void;
  userName: string;
  themeStyles?: any;
}

export default function VoiceAssistantButton({ onProcessCommand, userName, themeStyles }: VoiceAssistantButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const activeThemeStyles = themeStyles || {
    accentText: "text-green-500",
    accentBg: "bg-green-500",
    accentBorder: "border-green-500/40",
    accentFill: "fill-green-500",
    accentShadow: "shadow-green-500/10",
  };

  // Initialize Web Speech API if supported
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = "it-IT";
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
        setTranscript("In ascolto... parla ora 🎙️");
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error", e);
        setIsListening(false);
        setTranscript("Errore o microfono non autorizzato. Prova ad inserire il testo!");
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const speechToText = event.results[0][0].transcript;
        setTranscript(speechToText);
        sendToGemini(speechToText);
      };

      setRecognition(rec);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      setTranscript("Trascrizione vocale non supportata in questo browser. Digita il comando!");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      setAiFeedback("");
      try {
        recognition.start();
      } catch (err) {
        console.error("Start recognition failed:", err);
      }
    }
  };

  const sendToGemini = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setAiFeedback("");

    try {
      const response = await fetch("/api/voice-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commandText: text }),
      });
      const data = await response.json();

      if (data && data.feedbackMessage) {
        setAiFeedback(data.feedbackMessage);
        // Dispatch the parsed command to the main application state
        onProcessCommand(data);
      } else {
        setAiFeedback("Comando registrato, ma non sono riuscito ad associarlo a un'azione.");
      }
    } catch (err) {
      console.error("Error processing voice command", err);
      setAiFeedback("Errore di rete nella sintonizzazione vocale.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) return;
    sendToGemini(transcript);
  };

  const applyPreset = (text: string) => {
    setTranscript(text);
    sendToGemini(text);
  };

  return (
    <>
      {/* Launcher Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 bg-[#222] hover:${activeThemeStyles.accentBg} hover:text-black border border-neutral-800 text-neutral-300 font-bold px-4 py-2.5 rounded-full text-xs transition duration-300 group shadow-lg`}
      >
        <Mic className={`w-4 h-4 ${activeThemeStyles.accentText} group-hover:text-black transition`} />
        <span>Assistente Vocale</span>
      </button>

      {/* Voice Dialog overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-55 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#181818] border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative"
            >
              {/* Close */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (recognition && isListening) recognition.stop();
                }}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-6 pt-4">
                <div className="flex justify-center">
                  <div className={`p-3.5 ${activeThemeStyles.accentBg}/10 rounded-full border ${activeThemeStyles.accentBorder} relative`}>
                    {isListening && (
                      <span className={`absolute inset-0 rounded-full border ${activeThemeStyles.accentText} animate-ping opacity-75`} />
                    )}
                    <Mic className={`w-8 h-8 ${activeThemeStyles.accentText}`} />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Come posso aiutarti su Beatfy?</h3>
                  <p className="text-xs text-neutral-400 mt-1">Pronuncia o scrivi un comando vocale AI</p>
                </div>

                {/* Simulated/Real Transcript Display */}
                <div className="bg-[#111] border border-neutral-800 rounded-xl p-4 min-h-[70px] flex items-center justify-center text-xs text-neutral-200">
                  {transcript || (
                    <span className="text-neutral-500 italic">
                      {recognition ? "Tocca il microfono e parla..." : "Scrivi un comando vocale qui sotto..."}
                    </span>
                  )}
                </div>

                {/* AI feedback bubble */}
                {aiFeedback && (
                  <motion.div
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={`p-3.5 ${activeThemeStyles.accentBg}/10 border ${activeThemeStyles.accentBorder} rounded-xl text-left text-xs ${activeThemeStyles.accentText} flex items-start gap-2.5`}
                  >
                    <Sparkles className={`w-4 h-4 ${activeThemeStyles.accentText} shrink-0 mt-0.5`} />
                    <span>{aiFeedback}</span>
                  </motion.div>
                )}

                {/* Control elements */}
                <div className="space-y-4">
                  {/* Speech Trigger */}
                  {recognition && (
                    <button
                      onClick={toggleListening}
                      className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
                        isListening
                          ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                          : `${activeThemeStyles.accentBg} hover:opacity-90 text-black shadow-lg ${activeThemeStyles.accentShadow}`
                      }`}
                    >
                      {isListening ? "Ferma Ascolto" : "Avvia Ascolto Vocale"}
                    </button>
                  )}

                  {/* Manual Type Input Form */}
                  <form onSubmit={handleManualSubmit} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Oppure digita qui (es. 'metti pop')"
                      value={transcript.startsWith("In ascolto") ? "" : transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      className={`flex-1 bg-[#111] border border-neutral-800 focus:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none transition font-medium`}
                    />
                    <button
                      type="submit"
                      disabled={loading || !transcript.trim()}
                      className={`p-2.5 ${activeThemeStyles.accentBg}/10 ${activeThemeStyles.accentText} hover:${activeThemeStyles.accentBg} hover:text-black border ${activeThemeStyles.accentBorder} rounded-xl transition flex items-center justify-center disabled:opacity-45`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                {/* Quick Presets */}
                <div className="space-y-2 text-left border-t border-neutral-800/80 pt-4">
                  <span className="text-4xs font-bold text-neutral-400 uppercase tracking-widest block mb-2 font-mono flex items-center gap-1">
                    <Command className="w-3 h-3 text-neutral-500" /> SUGGERIMENTI RAPIDI
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Riproduci un po' di rock",
                      "Metti Custom Synthwave Radio",
                      "Consigliami musica con l'AI",
                      "Metti in pausa",
                    ].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => applyPreset(preset)}
                        className="px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-[#111] hover:bg-neutral-800 hover:border-neutral-700 text-3xs text-neutral-300 transition"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
