import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, CreditCard, Check, Crown, ShieldCheck, Loader2, Sparkles } from "lucide-react";

interface PremiumCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  themeStyles: any;
}

export default function PremiumCheckoutModal({
  isOpen,
  onClose,
  onSuccess,
  themeStyles,
}: PremiumCheckoutModalProps) {
  const [step, setStep] = useState<"intro" | "form" | "processing" | "success">("intro");
  
  // Form fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setStep("intro");
      setCardNumber("");
      setExpiry("");
      setCvv("");
      setName("");
      setEmail("");
      setErrors({});
    }
  }, [isOpen]);

  // Format Card Number (adds spaces)
  const handleCardNumberChange = (val: string) => {
    const clean = val.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = clean.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(" "));
    } else {
      setCardNumber(clean.substring(0, 19));
    }
  };

  // Format Expiry Date (MM/YY)
  const handleExpiryChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    if (clean.length >= 2) {
      setExpiry(`${clean.slice(0, 2)}/${clean.slice(2, 4)}`);
    } else {
      setExpiry(clean);
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (cardNumber.replace(/\s/g, "").length !== 16) {
      newErrors.cardNumber = "Numero di carta non valido (richieste 16 cifre)";
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      newErrors.expiry = "Data non valida (MM/GG)";
    }
    if (cvv.length !== 3 || !/^\d{3}$/.test(cvv)) {
      newErrors.cvv = "CVV non valido (richieste 3 cifre)";
    }
    if (!name.trim()) {
      newErrors.name = "Nome intestatario richiesto";
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Indirizzo email non valido";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStep("processing");

    // Simulate payment steps
    setTimeout(() => {
      setStep("success");
    }, 3200);
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  const premiumFeatures = [
    {
      title: "Audio Equalizer Hi-Fi",
      desc: "Regola i cursori a 5 bande ed esalta bassi o alti con precisione acustica estrema.",
    },
    {
      title: "Podcast Esclusivi e Interviste",
      desc: "Sblocca l'accesso illimitato alle storie e ai contenuti premium non disponibili per utenti Free.",
    },
    {
      title: "Statistiche d'Ascolto Avanzate",
      desc: "Monitora i minuti totali, i generi più ascoltati e mantieni attivo il tuo streak giornaliero.",
    },
    {
      title: "Zero Pubblicità & Qualità Lossless",
      desc: "Ascolto puro e ininterrotto con streaming in qualità FLAC ad alta definizione.",
    },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-lg bg-[#0e0e12] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl z-10"
        >
          {/* Header */}
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {step === "intro" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 mb-2">
                    <Crown className="w-6 h-6 fill-yellow-400" />
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight">Sblocca Beatfy Premium</h3>
                  <p className="text-xs text-neutral-400">
                    Sblocca l'esperienza sonora definitiva a soli <span className="font-extrabold text-white">9,99€</span> una tantum.
                  </p>
                </div>

                {/* Features list */}
                <div className="space-y-3 bg-neutral-900/40 border border-neutral-900 p-4 rounded-2xl">
                  {premiumFeatures.map((feat, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="mt-0.5 w-4 h-4 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <div>
                        <h4 className="text-2xs font-extrabold text-neutral-200">{feat.title}</h4>
                        <p className="text-4xs text-neutral-400 leading-relaxed">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-center">
                  <button
                    onClick={() => setStep("form")}
                    className={`w-full py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-black transition shadow-lg flex items-center justify-center gap-2 cursor-pointer ${themeStyles.accentBg} ${themeStyles.accentShadow} hover:opacity-95`}
                  >
                    Procedi al Pagamento (9,99€)
                  </button>
                  <p className="text-[10px] text-neutral-500 mt-3 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" /> Transazione protetta con crittografia SSL a 256-bit
                  </p>
                </div>
              </div>
            )}

            {step === "form" && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black text-white tracking-tight">Dettagli di Pagamento</h3>
                  <p className="text-3xs text-neutral-400">
                    Inserisci i dati della tua carta di credito o di debito. Totale: <span className="font-bold text-white">9,99€</span>.
                  </p>
                </div>

                {/* Simulated credit card illustration */}
                <div className="bg-gradient-to-tr from-[#1b122c] to-[#0d0914] border border-neutral-800 p-4 rounded-2xl relative overflow-hidden shadow-inner font-mono text-white/90">
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-neutral-500 font-sans font-bold uppercase tracking-wider">BEATFY PREMIUM CARD</span>
                      <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    </div>
                    <span className="text-[10px] text-neutral-400 font-bold">9,99 EUR</span>
                  </div>
                  <div className="space-y-4">
                    <div className="text-sm font-bold tracking-widest min-h-[20px]">
                      {cardNumber || "•••• •••• •••• ••••"}
                    </div>
                    <div className="flex justify-between items-end text-3xs text-neutral-400">
                      <div>
                        <div className="text-[8px] uppercase font-sans text-neutral-500 font-bold mb-0.5">Titolare</div>
                        <div className="font-bold text-neutral-200 uppercase truncate max-w-[150px]">{name || "NOME COGNOME"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] uppercase font-sans text-neutral-500 font-bold mb-0.5">Scadenza</div>
                        <div className="font-bold text-neutral-200">{expiry || "MM/AA"}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Email */}
                  <div>
                    <label className="text-4xs font-bold text-neutral-400 uppercase tracking-wider block mb-1">Email per Ricevuta</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="la-tua-email@esempio.com"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 font-sans"
                    />
                    {errors.email && <p className="text-[10px] text-red-500 mt-1 font-sans">{errors.email}</p>}
                  </div>

                  {/* Card owner name */}
                  <div>
                    <label className="text-4xs font-bold text-neutral-400 uppercase tracking-wider block mb-1">Nome sulla Carta</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="E.g. Mario Rossi"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 font-sans"
                    />
                    {errors.name && <p className="text-[10px] text-red-500 mt-1 font-sans">{errors.name}</p>}
                  </div>

                  {/* Card details grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-4xs font-bold text-neutral-400 uppercase tracking-wider block mb-1">Numero Carta</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => handleCardNumberChange(e.target.value)}
                          maxLength={19}
                          placeholder="4000 1234 5678 9010"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 font-mono"
                        />
                        <CreditCard className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
                      </div>
                      {errors.cardNumber && <p className="text-[10px] text-red-500 mt-1 font-sans">{errors.cardNumber}</p>}
                    </div>

                    <div>
                      <label className="text-4xs font-bold text-neutral-400 uppercase tracking-wider block mb-1">Scadenza</label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => handleExpiryChange(e.target.value)}
                        maxLength={5}
                        placeholder="MM/AA"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 text-center focus:outline-none focus:border-neutral-700 font-mono"
                      />
                      {errors.expiry && <p className="text-[10px] text-red-500 mt-1 font-sans">{errors.expiry}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="text-4xs font-bold text-neutral-400 uppercase tracking-wider block mb-1">CVV / CVC (Retro)</label>
                    <input
                      type="password"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ""))}
                      maxLength={3}
                      placeholder="123"
                      className="w-24 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 text-center focus:outline-none focus:border-neutral-700 font-mono"
                    />
                    {errors.cvv && <p className="text-[10px] text-red-500 mt-1 font-sans">{errors.cvv}</p>}
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("intro")}
                    className="flex-1 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 py-3 rounded-xl text-xs font-bold transition font-sans"
                  >
                    Indietro
                  </button>
                  <button
                    type="submit"
                    className={`flex-[2] py-3 rounded-xl text-xs font-black uppercase tracking-wider text-black transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer ${themeStyles.accentBg} ${themeStyles.accentShadow} hover:opacity-95 font-sans`}
                  >
                    Completa Acquisto (9,99€)
                  </button>
                </div>
              </form>
            )}

            {step === "processing" && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  <div className={`absolute inset-0 rounded-full blur-xl opacity-30 ${themeStyles.accentBg}`} />
                  <Loader2 className={`w-12 h-12 animate-spin relative ${themeStyles.accentText}`} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-white font-sans">Elaborazione del pagamento...</h4>
                  <p className="text-3xs text-neutral-500 font-mono">STABILISCO CONNESSIONE SICURA CON LA BANCA (SSL 256-BIT)...</p>
                </div>
                <div className="w-48 bg-neutral-900 h-1 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3, ease: "easeInOut" }}
                    className={`h-full ${themeStyles.accentBg}`}
                  />
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-2xl opacity-40 bg-yellow-400 animate-pulse" />
                  <div className="w-16 h-16 rounded-2xl bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 flex items-center justify-center relative shadow-lg">
                    <Crown className="w-8 h-8 fill-yellow-400 animate-bounce" />
                    <Sparkles className="w-5 h-5 text-yellow-300 absolute -top-1 -right-1" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white tracking-tight font-sans">Abbonamento Premium Attivato!</h3>
                  <p className="text-xs text-neutral-400">
                    Congratulazioni! Ora hai accesso completo a tutte le funzionalità high-fidelity e advanced di Beatfy.
                  </p>
                </div>

                <div className="bg-neutral-900/60 border border-neutral-900 p-4 rounded-xl w-full text-left space-y-1.5 text-3xs text-neutral-400">
                  <div className="flex justify-between">
                    <span>Prodotto:</span>
                    <span className="font-bold text-neutral-200">Beatfy Premium Lifetime</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prezzo:</span>
                    <span className="font-bold text-neutral-200">€9.99 (Pagato)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Metodo:</span>
                    <span className="font-bold text-neutral-200 font-mono">Carta terminante in •••• {cardNumber.slice(-4) || "4010"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ricevuta inviata a:</span>
                    <span className="font-bold text-neutral-200 truncate max-w-[180px]">{email || "la-tua-email@esempio.com"}</span>
                  </div>
                </div>

                <button
                  onClick={handleFinish}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-black transition shadow-lg cursor-pointer ${themeStyles.accentBg} ${themeStyles.accentShadow} hover:opacity-95 font-sans`}
                >
                  Inizia l'ascolto Premium
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
