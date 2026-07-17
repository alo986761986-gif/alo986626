import { motion } from "motion/react";
import { BarChart3, Clock, Play, Award, Disc, User, Flame, Crown } from "lucide-react";

interface AnalyticsDashboardProps {
  userName: string;
  premiumActive: boolean;
  onUpgrade?: () => void;
}

export default function AnalyticsDashboard({ userName, premiumActive, onUpgrade }: AnalyticsDashboardProps) {
  // Mock statistic data
  const totalMinutes = premiumActive ? 4280 : 1240;
  const totalTracks = premiumActive ? 342 : 98;
  const streakDays = premiumActive ? 18 : 5;

  const topArtists = [
    { name: "The Weeknd", plays: 84, img: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=120&auto=format&fit=crop" },
    { name: "M83", plays: 62, img: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=120&auto=format&fit=crop" },
    { name: "Miles Davis Duo", plays: 39, img: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=120&auto=format&fit=crop" },
    { name: "Coastal Echoes", plays: 28, img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=120&auto=format&fit=crop" },
  ];

  const genres = [
    { name: "Electronic", pct: 40, color: "bg-green-500" },
    { name: "Pop", pct: 30, color: "bg-pink-500" },
    { name: "Jazz", pct: 15, color: "bg-purple-500" },
    { name: "Ambient", pct: 10, color: "bg-blue-500" },
    { name: "Classical", pct: 5, color: "bg-amber-500" },
  ];

  const weeklyListening = [
    { day: "Lun", hours: 1.5 },
    { day: "Mar", hours: 2.2 },
    { day: "Mer", hours: 3.8 },
    { day: "Gio", hours: 1.1 },
    { day: "Ven", hours: 4.5 },
    { day: "Sab", hours: 5.2 },
    { day: "Dom", hours: 2.8 },
  ];

  const maxHours = Math.max(...weeklyListening.map(d => d.hours));

  return (
    <div className="space-y-6 h-full overflow-y-auto pr-1">
      {/* Welcome & Overview Header */}
      <div className="bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-3xs font-bold text-green-500 uppercase tracking-widest font-mono">PANNELLO TELEMETRIA UTENTE</span>
          <h2 className="text-xl font-bold text-white tracking-tight">Le Tue Statistiche d'Ascolto, {userName}</h2>
          <p className="text-xs text-neutral-400">Analizziamo continuamente le tue vibrazioni acustiche per suggerirti musica sintonizzata.</p>
        </div>
        {premiumActive ? (
          <span className="flex items-center gap-1 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full">
            <Award className="w-4 h-4" /> ABBONAMENTO PREMIUM ATTIVO
          </span>
        ) : (
          <span className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold px-3 py-1.5 rounded-full">
            PIANO BASE CON PUBBLICITÀ
          </span>
        )}
      </div>

      {/* Promo banner for Free users */}
      {!premiumActive && (
        <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-yellow-500/15 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-pulse" />
              Sblocca Statistiche Avanzate e Audio HD
            </h4>
            <p className="text-xs text-neutral-400 max-w-xl">
              Sei attualmente limitato alle statistiche di base. Sblocca grafici avanzati, ascolto in alta fedeltà (FLAC 320kbps), equalizzatore ed elimina ogni annuncio a soli <span className="font-extrabold text-white">9,99€</span> una tantum!
            </p>
          </div>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shrink-0 shadow-lg shadow-yellow-500/10 cursor-pointer"
            >
              Passa a Premium - €9,99
            </button>
          )}
        </div>
      )}

      {/* Numerical Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Minutes Card */}
        <div className="bg-[#121212]/90 border border-neutral-800/80 p-5 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-xl text-green-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-3xs font-bold text-neutral-400 uppercase tracking-wider block">Minuti Ascoltati</span>
            <span className="text-xl font-black text-white block">{totalMinutes} m</span>
            <span className="text-4xs text-green-400 block font-mono">Aggiornato in tempo reale</span>
          </div>
        </div>

        {/* Tracks Card */}
        <div className="bg-[#121212]/90 border border-neutral-800/80 p-5 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-pink-500/10 rounded-xl text-pink-500">
            <Disc className="w-6 h-6" />
          </div>
          <div>
            <span className="text-3xs font-bold text-neutral-400 uppercase tracking-wider block">Brani Unici</span>
            <span className="text-xl font-black text-white block">{totalTracks} traccie</span>
            <span className="text-4xs text-pink-400 block font-mono">Frequenza elevata d'ascolto</span>
          </div>
        </div>

        {/* Streak Card */}
        <div className="bg-[#121212]/90 border border-neutral-800/80 p-5 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-3xs font-bold text-neutral-400 uppercase tracking-wider block">Streak d'Ascolto</span>
            <span className="text-xl font-black text-white block">{streakDays} Giorni</span>
            <span className="text-4xs text-amber-400 block font-mono">Sincronizzazione completata</span>
          </div>
        </div>
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Genre Percentage Bar Chart */}
        <div className="bg-[#121212]/90 border border-neutral-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-2.5">
            <span className="text-2xs font-bold text-white uppercase tracking-wider">I Tuoi Generi Prediletti</span>
            <BarChart3 className="w-4 h-4 text-green-500" />
          </div>
          <div className="space-y-3.5">
            {genres.map((genre) => (
              <div key={genre.name} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-neutral-300">{genre.name}</span>
                  <span className="font-mono text-neutral-400 font-bold">{genre.pct}%</span>
                </div>
                <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${genre.pct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${genre.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly hours chart */}
        <div className="bg-[#121212]/90 border border-neutral-800/80 rounded-2xl p-5 space-y-4">
          <span className="text-2xs font-bold text-white uppercase tracking-wider block border-b border-neutral-800 pb-2.5">
            Ore di Ascolto Settimanale
          </span>
          {/* SVG representation of bar peaks */}
          <div className="flex items-end justify-between h-44 pt-4 px-2">
            {weeklyListening.map((dayData) => {
              const barHeight = (dayData.hours / maxHours) * 100;
              return (
                <div key={dayData.day} className="flex flex-col items-center flex-1 space-y-2">
                  <span className="text-4xs font-mono font-bold text-neutral-400">{dayData.hours}h</span>
                  <div className="w-4 sm:w-6 bg-neutral-900 rounded-md h-28 relative overflow-hidden flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${barHeight}%` }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                      className="w-full bg-green-500 rounded-md"
                    />
                  </div>
                  <span className="text-3xs text-neutral-500 font-bold uppercase">{dayData.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Artists Panel */}
      <div className="bg-[#121212]/90 border border-neutral-800/80 rounded-2xl p-5 space-y-4">
        <span className="text-2xs font-bold text-white uppercase tracking-wider block border-b border-neutral-800 pb-2.5">
          I Tuoi Artisti Più Ascoltati del Mese
        </span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {topArtists.map((artist, i) => (
            <div key={artist.name} className="bg-[#181818] p-3 rounded-xl border border-neutral-800/60 flex items-center gap-3">
              <img src={artist.img} alt={artist.name} className="w-10 h-10 rounded-full object-cover border border-neutral-700" />
              <div className="min-w-0">
                <span className="font-bold text-xs text-white block truncate">{artist.name}</span>
                <span className="text-4xs font-mono text-neutral-400 block">{artist.plays} riproduzioni</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
