import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Music, 
  ArrowRight, 
  Sparkles, 
  Shield, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle2, 
  Smartphone, 
  Loader2,
  Lock,
  User,
  Fingerprint
} from "lucide-react";

interface LoginGateProps {
  onLogin: (userInfo: { name: string; email: string; avatarUrl: string; provider: string }) => void;
  themeStyles: any;
}

export default function LoginGate({ onLogin, themeStyles }: LoginGateProps) {
  const [activeSimulation, setActiveSimulation] = useState<"google" | "facebook" | "apple" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [successUser, setSuccessUser] = useState<{ name: string; avatarUrl: string } | null>(null);
  const [guestName, setGuestName] = useState("");
  const [showGuestInput, setShowGuestInput] = useState(false);

  // Soundwave animation bars
  const [bars, setBars] = useState<number[]>([30, 60, 45, 90, 75, 40, 80]);
  useEffect(() => {
    const timer = setInterval(() => {
      setBars(bars.map(() => Math.floor(Math.random() * 65) + 25));
    }, 180);
    return () => clearInterval(timer);
  }, [bars]);

  // Handle simulation login execution
  const executeLogin = (name: string, email: string, avatarUrl: string, provider: string) => {
    setIsLoading(true);
    setActiveSimulation(null);
    
    const steps = [
      "Connessione al server sicuro...",
      "Autenticazione token crittografato...",
      "Sincronizzazione delle tue preferenze...",
      "Caricamento libreria Beatfy..."
    ];

    let currentStep = 0;
    setLoadingStep(steps[currentStep]);

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setLoadingStep(steps[currentStep]);
      } else {
        clearInterval(interval);
        setIsLoading(false);
        setSuccessUser({ name, avatarUrl });
        
        // Final transition into the app
        setTimeout(() => {
          onLogin({ name, email, avatarUrl, provider });
        }, 1800);
      }
    }, 900);
  };

  const handleGuestLogin = (e: FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    executeLogin(
      guestName.trim(), 
      "ospite@beatfy.it", 
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80", 
      "guest"
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a] text-white select-none overflow-hidden font-sans">
      {/* Immersive Animated Visual Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-green-500/5 blur-[150px]" />
        
        {/* Abstract moving overlay lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6 py-8">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Main Landing Login Gate */}
          {!isLoading && !successUser && (
            <motion.div
              key="auth-selection"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="bg-[#121212]/80 border border-neutral-800/80 rounded-2xl p-7 sm:p-9 shadow-2xl backdrop-blur-xl relative"
            >
              {/* Premium Top Line Accent */}
              <div className={`absolute top-0 left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-green-500 to-transparent`} />

              {/* Header section with brand logo */}
              <div className="text-center space-y-4 mb-8">
                <div className="flex items-center justify-center gap-1.5 h-10 mb-2">
                  {bars.map((height, i) => (
                    <motion.div
                      key={i}
                      className={`w-1 rounded-full ${themeStyles?.accentBg || "bg-green-500"}`}
                      style={{ height: `${height}%` }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    />
                  ))}
                </div>
                
                <h1 className="text-2xl font-black tracking-tight text-white uppercase flex items-center justify-center gap-2">
                  <Music className={`w-6 h-6 ${themeStyles?.accentText || "text-green-500"}`} />
                  Beatfy Premium
                </h1>
                <p className="text-xs text-neutral-400 font-medium max-w-[280px] mx-auto leading-relaxed">
                  Sincronizza i tuoi ritmi, sblocca l'audio ad alta fedeltà e condividi le tue playlist preferite.
                </p>
              </div>

              {/* Login Options Container */}
              <div className="space-y-3.5">
                {/* GOOGLE SIGN IN */}
                <button
                  onClick={() => setActiveSimulation("google")}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-neutral-100 text-neutral-900 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    {/* Google custom SVG */}
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.4 3.65 1.54 7.54l3.87 3C6.31 7.55 8.9 5.04 12 5.04z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.43c-.28 1.44-1.09 2.66-2.31 3.48l3.6 2.79c2.1-1.94 3.32-4.79 3.32-8.38z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.41 10.54c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.54 2.96C.56 4.93 0 7.15 0 9.5s.56 4.57 1.54 6.54l3.87-3z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c3.24 0 5.97-1.08 7.96-2.91l-3.6-2.79c-1.1.74-2.51 1.18-4.36 1.18-3.1 0-5.69-2.51-6.59-5.5l-3.87 3C3.4 20.35 7.35 23 12 23z"
                      />
                    </svg>
                    <span>Accedi con Google</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-400" />
                </button>

                {/* FACEBOOK SIGN IN */}
                <button
                  onClick={() => setActiveSimulation("facebook")}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    {/* Facebook custom SVG */}
                    <svg className="w-5 h-5 shrink-0 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>Accedi con Facebook</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/75" />
                </button>

                {/* APPLE SIGN IN */}
                <button
                  onClick={() => setActiveSimulation("apple")}
                  className="w-full flex items-center justify-between px-4 py-3 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-white rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    {/* Apple custom SVG */}
                    <svg className="w-5 h-5 shrink-0 fill-current" viewBox="0 0 24 24">
                      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.029-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.51 12.059 1.002 1.45 2.19 3.078 3.76 3.022 1.514-.061 2.085-.98 3.914-.98 1.815 0 2.357.98 3.939.951 1.614-.029 2.633-1.478 3.617-2.906 1.144-1.673 1.614-3.291 1.643-3.375-.035-.015-3.159-1.211-3.192-4.793-.025-2.99 2.455-4.427 2.569-4.502-1.402-2.053-3.568-2.285-4.329-2.35-1.99-.162-3.337 1.04-4.001 1.04zM15.98 3.84c.836-1.012 1.393-2.422 1.24-3.84-1.209.049-2.684.805-3.551 1.819-.757.873-1.42 2.304-1.243 3.699 1.353.106 2.721-.661 3.554-1.678z" />
                    </svg>
                    <span>Accedi con Apple</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/50" />
                </button>
              </div>

              {/* Guest Access Option */}
              <div className="mt-6 pt-5 border-t border-neutral-800/60 text-center">
                {showGuestInput ? (
                  <form onSubmit={handleGuestLogin} className="space-y-3">
                    <input
                      type="text"
                      placeholder="Inserisci il tuo nome..."
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                      autoFocus
                      className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 text-white rounded-xl text-xs sm:text-sm focus:outline-none focus:border-green-500/60"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowGuestInput(false)}
                        className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-3xs font-black uppercase tracking-wider text-neutral-400 transition"
                      >
                        Annulla
                      </button>
                      <button
                        type="submit"
                        className={`flex-1 py-2 rounded-lg text-3xs font-black uppercase tracking-wider text-black font-mono transition ${themeStyles?.accentBg || "bg-green-500"}`}
                      >
                        Accedi Ora
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowGuestInput(true)}
                    className="text-3xs font-black text-neutral-400 hover:text-white uppercase tracking-widest transition cursor-pointer"
                  >
                    O continua come Ospite
                  </button>
                )}
              </div>

              {/* Trust & Security footer badge */}
              <div className="mt-8 flex items-center justify-center gap-1.5 text-4xs text-neutral-500 font-mono uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-neutral-600" />
                <span>Crittografia di grado militare SSL</span>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Authenticating and Syncing Screen */}
          {isLoading && (
            <motion.div
              key="auth-loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="bg-[#121212]/90 border border-neutral-800/80 rounded-2xl p-9 shadow-2xl text-center space-y-6 max-w-sm w-full"
            >
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <Loader2 className={`w-12 h-12 animate-spin absolute ${themeStyles?.accentText || "text-green-500"}`} />
                <Lock className="w-5 h-5 text-neutral-400 absolute" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Connessione Sicura...
                </h3>
                <p className="text-3xs text-neutral-400 font-mono uppercase tracking-widest animate-pulse h-4">
                  {loadingStep}
                </p>
              </div>
              <div className="h-1 bg-neutral-900 rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full ${themeStyles?.accentBg || "bg-green-500"}`} 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3.2, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          )}

          {/* STEP 3: Beautiful Access Welcome Animation */}
          {successUser && (
            <motion.div
              key="auth-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-[#121212]/90 border border-green-500/20 rounded-2xl p-8 shadow-2xl text-center space-y-5 max-w-sm w-full relative overflow-hidden"
            >
              {/* Green Glow particles */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
              
              <div className="w-16 h-16 rounded-full mx-auto overflow-hidden border-2 border-green-500/50 shadow-lg shadow-green-500/10 relative">
                {successUser.avatarUrl ? (
                  <img src={successUser.avatarUrl} alt={successUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                    <User className="w-7 h-7 text-neutral-400" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-center items-center gap-1 text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-5xs font-mono font-bold uppercase tracking-widest">Accesso Riuscito</span>
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  Bentornato, {successUser.name}!
                </h2>
                <p className="text-3xs text-neutral-400 leading-normal">
                  La tua sessione Beatfy Premium è pronta. Le melodie ti aspettano.
                </p>
              </div>

              <div className="flex justify-center items-center gap-1 text-neutral-500 font-mono text-5xs uppercase tracking-widest mt-2">
                <Sparkles className="w-3.5 h-3.5 text-green-500 animate-bounce" />
                <span>Caricamento Deck Completato</span>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* POPUP SIMULATIONS FOR GOOGLE, FACEBOOK & APPLE */}
      <AnimatePresence>
        {activeSimulation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[#161616] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-200"
            >
              {/* Simulation Window Header */}
              <div className="bg-[#1e1e1e] px-4 py-3 border-b border-neutral-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-4xs font-mono text-neutral-400 select-none">
                    {activeSimulation === "google" && "accounts.google.com"}
                    {activeSimulation === "facebook" && "facebook.com/oauth"}
                    {activeSimulation === "apple" && "appleid.apple.com"}
                  </span>
                </div>
                <button
                  onClick={() => setActiveSimulation(null)}
                  className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition"
                >
                  Annulla
                </button>
              </div>

              {/* Simulation Window Body */}
              {activeSimulation === "google" && (
                <div className="p-6 space-y-6">
                  <div className="text-center space-y-2">
                    {/* Google standard colorful logo */}
                    <div className="flex justify-center mb-1">
                      <svg className="w-9 h-9" viewBox="0 0 24 24">
                        <path
                          fill="#EA4335"
                          d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.4 3.65 1.54 7.54l3.87 3C6.31 7.55 8.9 5.04 12 5.04z"
                        />
                        <path
                          fill="#4285F4"
                          d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.43c-.28 1.44-1.09 2.66-2.31 3.48l3.6 2.79c2.1-1.94 3.32-4.79 3.32-8.38z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.41 10.54c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.54 2.96C.56 4.93 0 7.15 0 9.5s.56 4.57 1.54 6.54l3.87-3z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c3.24 0 5.97-1.08 7.96-2.91l-3.6-2.79c-1.1.74-2.51 1.18-4.36 1.18-3.1 0-5.69-2.51-6.59-5.5l-3.87 3C3.4 20.35 7.35 23 12 23z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-white">Scegli un account</h3>
                    <p className="text-3xs text-neutral-400">per procedere su <span className="font-bold text-neutral-300">Beatfy</span></p>
                  </div>

                  {/* Account select list */}
                  <div className="space-y-2">
                    <button
                      onClick={() => executeLogin("Alessandro Rossi", "alessandro.rossi@gmail.com", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80", "google")}
                      className="w-full p-3 bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800/60 rounded-xl flex items-center gap-3 text-left transition"
                    >
                      <img
                        src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"
                        alt="Alessandro"
                        className="w-8 h-8 rounded-full border border-neutral-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block">Alessandro Rossi</span>
                        <span className="text-3xs text-neutral-400 block truncate">alessandro.rossi@gmail.com</span>
                      </div>
                    </button>

                    <button
                      onClick={() => executeLogin("Sofia Bianchi", "sofia.b@gmail.com", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80", "google")}
                      className="w-full p-3 bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800/60 rounded-xl flex items-center gap-3 text-left transition"
                    >
                      <img
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80"
                        alt="Sofia"
                        className="w-8 h-8 rounded-full border border-neutral-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block">Sofia Bianchi</span>
                        <span className="text-3xs text-neutral-400 block truncate">sofia.b@gmail.com</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        const customName = prompt("Inserisci nome per un nuovo account Google:");
                        if (customName) {
                          executeLogin(customName, `${customName.toLowerCase().replace(/ /g, "")}@gmail.com`, "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80", "google");
                        }
                      }}
                      className="w-full p-3 bg-neutral-950/40 hover:bg-neutral-900 border border-neutral-900 rounded-xl flex items-center gap-3 text-left transition"
                    >
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700 text-neutral-400 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-neutral-300 block">Utilizza un altro account</span>
                        <span className="text-4xs text-neutral-500 block">Usa un indirizzo email differente</span>
                      </div>
                    </button>
                  </div>

                  <p className="text-5xs text-neutral-500 text-center leading-normal">
                    Google protegge i tuoi dati ed impedisce condivisioni non approvate.
                    Consulti l'informativa sulla privacy per saperne di più.
                  </p>
                </div>
              )}

              {activeSimulation === "facebook" && (
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-neutral-800/40 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#1877F2] flex items-center justify-center text-white shrink-0">
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </div>
                      <span className="text-2xs font-bold text-[#1877F2] uppercase tracking-wider font-mono">Facebook Login</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs text-neutral-300 leading-normal">
                      L'applicazione <span className="font-bold text-white">Beatfy</span> richiede l'autorizzazione per accedere al tuo nome pubblico, indirizzo email e foto del profilo.
                    </p>

                    <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center gap-3">
                      <img
                        src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"
                        alt="Alessandro"
                        className="w-10 h-10 rounded-full border border-neutral-700"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">Alessandro Rossi</span>
                        <span className="text-4xs text-neutral-400 block font-mono">ID: fb_984572</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={() => setActiveSimulation(null)}
                      className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-2xs font-bold text-neutral-400 transition"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={() => executeLogin("Alessandro Rossi", "alessandro.rossi@gmail.com", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80", "facebook")}
                      className="flex-1 py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl text-2xs font-bold transition"
                    >
                      Continua come Alessandro
                    </button>
                  </div>
                </div>
              )}

              {activeSimulation === "apple" && (
                <div className="p-6 space-y-6">
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-white">
                      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.029-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.51 12.059 1.002 1.45 2.19 3.078 3.76 3.022 1.514-.061 2.085-.98 3.914-.98 1.815 0 2.357.98 3.939.951 1.614-.029 2.633-1.478 3.617-2.906 1.144-1.673 1.614-3.291 1.643-3.375-.035-.015-3.159-1.211-3.192-4.793-.025-2.99 2.455-4.427 2.569-4.502-1.402-2.053-3.568-2.285-4.329-2.35-1.99-.162-3.337 1.04-4.001 1.04zM15.98 3.84c.836-1.012 1.393-2.422 1.24-3.84-1.209.049-2.684.805-3.551 1.819-.757.873-1.42 2.304-1.243 3.699 1.353.106 2.721-.661 3.554-1.678z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-white">Accedi con Apple ID</h3>
                    <p className="text-3xs text-neutral-400">Verifica biometrica sicura tramite Apple ID</p>
                  </div>

                  <div className="p-4 bg-neutral-900 border border-neutral-800/80 rounded-xl space-y-4">
                    <div className="flex items-center justify-between text-2xs">
                      <span className="text-neutral-400">Utente</span>
                      <span className="font-bold text-white">alessandro.rossi@icloud.com</span>
                    </div>

                    <div className="border-t border-neutral-800/60 pt-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-green-500 animate-pulse border border-neutral-700">
                        <Fingerprint className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block">Face ID / Touch ID</span>
                        <span className="text-4xs text-neutral-500 block leading-tight">Posiziona il dito sul sensore o inquadra il viso</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      onClick={() => setActiveSimulation(null)}
                      className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-2xs font-bold text-neutral-400 transition"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={() => executeLogin("Alessandro Rossi", "alessandro.rossi@icloud.com", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80", "apple")}
                      className="flex-1 py-2.5 bg-white hover:bg-neutral-100 text-black rounded-xl text-2xs font-black transition uppercase tracking-wider"
                    >
                      Autentica
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
