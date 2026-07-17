export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export const MOCK_LYRICS: Record<string, LyricLine[]> = {
  "track-1": [
    { time: 0, text: "🎵 [Intro Strumentale Synthwave] 🎵" },
    { time: 10, text: "Sotto le luci della città elettrica" },
    { time: 18, text: "Corriamo veloci, nessun freno ci fermerà" },
    { time: 26, text: "Un orizzonte di neon dipinto di blu" },
    { time: 34, text: "Nel riflesso dei tuoi occhi ci sei solo tu" },
    { time: 42, text: "🎵 [Sintetizzatore Assolo] 🎵" },
    { time: 55, text: "Strade bagnate dalla pioggia digitale" },
    { time: 63, text: "Questo viaggio notturno sembra quasi irreale" },
    { time: 71, text: "Siamo anime perse nel flusso dei dati" },
    { time: 79, text: "Ma stasera siamo liberi, non programmati" },
    { time: 87, text: "Portami oltre la mezzanotte" },
    { time: 95, text: "Verso l'orizzonte infinito di questa notte!" },
    { time: 105, text: "🎵 [Guitar Synth Solo] 🎵" },
    { time: 130, text: "Un orizzonte di neon dipinto di blu" },
    { time: 138, text: "Nel riflesso dei tuoi occhi ci sei solo tu..." }
  ],
  "track-2": [
    { time: 0, text: "🎵 [Onde del mare ed intro acustico] 🎵" },
    { time: 12, text: "Il sole scende piano sulla spiaggia calda" },
    { time: 22, text: "Mentre l'acqua riflette una luce dorata" },
    { time: 32, text: "E lasciamo andare ogni nostra preoccupazione" },
    { time: 42, text: "Sintonizzati sul ritmo di questa canzone" },
    { time: 52, text: "Onde dell'ora d'oro, cullateci voi" },
    { time: 62, text: "Non c'è ieri o domani, ci siamo solo noi" },
    { time: 72, text: "🎵 [Intermezzo Chill] 🎵" },
    { time: 90, text: "Sfumature d'arancio e di rosa nel cielo" },
    { time: 100, text: "Il vento sussurra un dolce segreto..." }
  ],
  "track-3": [
    { time: 0, text: "🎵 [Intro Spaziale ed Etereo] 🎵" },
    { time: 8, text: "Perso nel cosmo infinito delle stelle" },
    { time: 16, text: "Scrivo il tuo nome sulla polvere cosmica" },
    { time: 24, text: "Una melodia che attraversa le galassie" },
    { time: 32, text: "Fino ad arrivare al tuo cuore pulsante" },
    { time: 40, text: "Siamo fatti di polvere di stelle, lo sai" },
    { time: 48, text: "E nell'oscurità dello spazio non ti perderò mai" },
    { time: 56, text: "🎵 [Assolo di Tastiera Cosmica] 🎵" },
    { time: 75, text: "La gravità ci attira l'uno verso l'altro..." }
  ],
  "track-4": [
    { time: 0, text: "⚡ [Intro Cyberpunk ad alta energia] ⚡" },
    { time: 8, text: "Tokyo ore tre, asfalto bagnato" },
    { time: 15, text: "Sfrecciamo nel futuro che abbiamo sognato" },
    { time: 22, text: "Interfacce neurali, ologrammi giganti" },
    { time: 29, text: "Un passo avanti a tutti, mai esitanti!" },
    { time: 36, text: "Corri attraverso la rete cibernetica" },
    { time: 43, text: "Questa notte è nostra, è pura estetica" },
    { time: 50, text: "⚡ [Assolo Cyber Acid Synth] ⚡" }
  ],
  "track-5": [
    { time: 0, text: "🎵 [Suono della pioggia e pianoforte malinconico] 🎵" },
    { time: 10, text: "Gocce fredde accarezzano i vetri scuri" },
    { time: 20, text: "E disegnano percorsi di ricordi lontani" },
    { time: 30, text: "Le foglie d'autunno cadono silenziose" },
    { time: 40, text: "Come parole che non ci siamo mai detti..." },
    { time: 50, text: "Ma c'è calore in questa malinconia" },
    { time: 60, text: "Una tazza di tè, e la tua armonia." }
  ],
  "track-6": [
    { time: 0, text: "🎷 [Intro di sassofono caldo e jazz] 🎷" },
    { time: 12, text: "Luci soffuse, un vecchio club fumoso" },
    { time: 24, text: "La tromba sussurra un blues silenzioso" },
    { time: 36, text: "Note che fluttuano lente nell'aria" },
    { time: 48, text: "Mentre il tempo rallenta la sua corsa solitaria" },
    { time: 60, text: "Questo è il ritmo della notte inoltrata" },
    { time: 72, text: "Una carezza jazz per l'anima stancata..." }
  ],
  "track-7": [
    { time: 0, text: "🎵 [Groove Lounge super rilassato] 🎵" },
    { time: 15, text: "Siamo seduti nel salotto di velluto" },
    { time: 30, text: "Sorseggiando un momento che credevamo perduto" },
    { time: 45, text: "Bassi profondi, vibrazioni gentili" },
    { time: 60, text: "Dimentichiamo gli impegni e le ansie febrili" },
    { time: 75, text: "Lasciati cullare da questo battito lento..." }
  ],
  "track-8": [
    { time: 0, text: "🎵 [Tessiture d'ambiente eteree e misteriose] 🎵" },
    { time: 20, text: "Echi lontani di un mondo sommerso" },
    { time: 40, text: "Voci fluttuanti nel profondo universo" },
    { time: 60, text: "Un oceano di calma ci avvolge la mente" },
    { time: 80, text: "Siamo liberi e fluiamo eternamente..." }
  ],
  "podcast-1": [
    { time: 0, text: "🎙️ Benvenuti a Beatfy Tech Talk! 🎙️" },
    { time: 6, text: "Oggi parleremo dell'incredibile rivoluzione dell'AI musicale nel 2026." },
    { time: 12, text: "Molti si chiedono: l'intelligenza artificiale sostituirà gli artisti umani?" },
    { time: 18, text: "La risposta, come vedremo, è un affascinante cammino di co-creazione." },
    { time: 25, text: "Gli algoritmi generativi non creano emozioni da zero, ma amplificano l'ispirazione..." }
  ],
  "podcast-2": [
    { time: 0, text: "🎙️ Benvenuti a Future Horizons. 🎙️" },
    { time: 6, text: "La tecnologia corre a ritmi vertiginosi." },
    { time: 12, text: "Qual è il limite tra l'innovazione tecnologica e la vera essenza umana?" },
    { time: 18, text: "Oggi esploreremo l'impatto dei sistemi intelligenti integrati sul nostro quotidiano." }
  ],
  "podcast-3": [
    { time: 0, text: "🧘 Benvenuti alla sessione speciale di Mente Serena Premium. 🧘" },
    { time: 8, text: "Trova una posizione comoda, chiudi gli occhi e rilassa le spalle." },
    { time: 16, text: "Inspiriamo profondamente riempiendo i polmoni..." },
    { time: 24, text: "Ed espiriamo lentamente, lasciando andare ogni tensione..." },
    { time: 32, text: "Senti il flusso d'aria fresca entrare ed uscire..." }
  ],
  "radio-1": [
    { time: 0, text: "📻 Deep Space Focus Radio 📻" },
    { time: 10, text: "La tua frequenza ideale per lo studio e la concentrazione profonda." },
    { time: 20, text: "Un flusso ininterrotto di sonorità cosmiche e ambient." },
    { time: 50, text: "Lascia scorrere i pensieri, focalizzati solo sul presente." }
  ],
  "radio-2": [
    { time: 0, text: "📻 Lounge House Session Live 📻" },
    { time: 10, text: "Mixa in diretta i migliori ritmi lounge e deep house della settimana." },
    { time: 25, text: "Vibrazioni di classe per il tuo aperitivo domestico o relax di fine giornata." }
  ]
};

// Procedural generator for any tracks that are missing
export function getLyricsForTrack(trackId: string, trackTitle: string, artistName: string): LyricLine[] {
  if (MOCK_LYRICS[trackId]) {
    return MOCK_LYRICS[trackId];
  }
  
  // Return some nicely formatted procedural lyrics so it always works beautifully!
  return [
    { time: 0, text: `🎵 Inizio della riproduzione: ${trackTitle} 🎵` },
    { time: 5, text: `Un brano straordinario di ${artistName}` },
    { time: 15, text: "Sintonizzati sulle vibrazioni sonore..." },
    { time: 30, text: "Goditi l'esperienza audio ad alta fedeltà di Beatfy" },
    { time: 45, text: "Musica pura per la tua mente e per il tuo cuore" },
    { time: 60, text: "🎵 [Pausa Strumentale] 🎵" },
    { time: 90, text: "Il suono fluisce liberamente attraverso lo spazio" },
    { time: 120, text: `Stai ascoltando ${trackTitle}` },
    { time: 150, text: "Fatti trasportare da questa atmosfera unica" },
    { time: 180, text: "Beatfy Premium - Musica senza limiti" }
  ];
}
