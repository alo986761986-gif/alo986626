import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY not found. Running in simulation mode for AI recommendations.");
}

// Memory databases for real-time collaboration and device synchronization
interface SyncState {
  deviceId: string;
  deviceName: string;
  deviceType: "mobile" | "desktop" | "speaker" | "tv" | "watch";
  songId: string;
  isPlaying: boolean;
  progress: number;
  lastUpdated: number;
}

interface CollabTrack {
  id: string;
  title: string;
  artist: string;
  votes: number;
  addedBy: string;
  timestamp: number;
}

interface CollabMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
}

let activeDevices: Record<string, SyncState> = {
  "web-client-1": {
    deviceId: "web-client-1",
    deviceName: "Beatfy Web Player",
    deviceType: "desktop",
    songId: "track-1",
    isPlaying: false,
    progress: 0,
    lastUpdated: Date.now()
  },
  "smart-speaker-living": {
    deviceId: "smart-speaker-living",
    deviceName: "Salotto (Google Nest)",
    deviceType: "speaker",
    songId: "track-3",
    isPlaying: false,
    progress: 45,
    lastUpdated: Date.now() - 100000
  },
  "smart-tv-bedroom": {
    deviceId: "smart-tv-bedroom",
    deviceName: "TV Camera da Letto",
    deviceType: "tv",
    songId: "track-5",
    isPlaying: false,
    progress: 120,
    lastUpdated: Date.now() - 200000
  }
};

let collaborativeTracks: CollabTrack[] = [
  { id: "track-2", title: "Midnight City", artist: "M83", votes: 4, addedBy: "Alessandro", timestamp: Date.now() - 3600000 },
  { id: "track-4", title: "Starlight", artist: "Muse", votes: 2, addedBy: "Sofia", timestamp: Date.now() - 1800000 }
];

let collaborativeMessages: CollabMessage[] = [
  { id: "msg-1", user: "Alessandro", text: "Ragazzi ho aggiunto Midnight City, che ne pensate?", timestamp: Date.now() - 3600000 },
  { id: "msg-2", user: "Sofia", text: "Adoro! Voto subito la traccia 💖", timestamp: Date.now() - 1750000 }
];

// Fallback tracks in case recommendations fail or for baseline recommendations
const CATALOGUE = [
  { id: "track-1", title: "Blinding Lights", artist: "The Weeknd", duration: 200, genre: "Pop", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: "track-2", title: "Midnight City", artist: "M83", duration: 240, genre: "Electronic", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: "track-3", title: "Stairway to Heaven", artist: "Led Zeppelin", duration: 480, genre: "Rock", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { id: "track-4", title: "Starlight", artist: "Muse", duration: 230, genre: "Alternative", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  { id: "track-5", title: "Blue in Green", artist: "Miles Davis", duration: 330, genre: "Jazz", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  { id: "track-6", title: "Clair de Lune", artist: "Claude Debussy", duration: 300, genre: "Classical", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
  { id: "podcast-1", title: "Il Futuro dell'AI Esclusivo", artist: "Beatfy Tech Talk", duration: 1200, genre: "Podcast", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", isPodcast: true, description: "Un'analisi approfondita su come l'AI sta plasmando l'arte, la musica e la creatività umana." },
  { id: "podcast-2", title: "True Crime: Il Mistero di Beatfy", artist: "Crimini Esclusivi", duration: 1500, genre: "Podcast", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", isPodcast: true, description: "Un thriller audiolibro esclusivo per i membri Premium di Beatfy." },
  { id: "radio-1", title: "Custom Synthwave Radio", artist: "AI Generated Radio", duration: 9999, genre: "Radio", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", isRadio: true }
];

// API: AI Recommendations
app.post("/api/recommendations", async (req, res) => {
  const { currentSong, preferredGenres, mood, history, offlineMode } = req.body;

  if (offlineMode) {
    return res.json({
      recommendations: [
        {
          id: "track-1",
          title: "Blinding Lights [Offline]",
          artist: "The Weeknd",
          genre: "Pop",
          justification: "Disponibile offline e corrisponde alla tua passione per il Pop."
        },
        {
          id: "track-2",
          title: "Midnight City [Offline]",
          artist: "M83",
          genre: "Electronic",
          justification: "Salvataggio locale pronto. Perfetto per ascolti senza connessione."
        }
      ],
      aiExplanation: "Modalità Offline attiva. Ti mostriamo solo i brani scaricati localmente nella tua libreria di Beatfy."
    });
  }

  const promptText = `Sei l'algoritmo di raccomandazione AI di 'Beatfy', un'app musicale premium.
  L'utente sta ascoltando o preferisce:
  - Brano Corrente: ${currentSong ? JSON.stringify(currentSong) : "Nessuno"}
  - Generi preferiti: ${preferredGenres ? preferredGenres.join(", ") : "Pop, Rock, Electronic, Jazz"}
  - Stato emotivo/Mood: ${mood || "Nessuno specificato"}
  - Cronologia recente: ${history ? history.map((h: any) => h.title).join(", ") : "Nessuna"}

  Genera 4 raccomandazioni di canzoni o podcast dal catalogo (puoi inventare titoli affascinanti o usare classici) con una breve spiegazione del perché si adatta al loro mood.
  Inoltre, scrivi una breve spiegazione testuale personalizzata (aiExplanation) che descrive l'analisi del loro profilo d'ascolto.

  Restituisci i dati in formato JSON valido che segue questa struttura:
  {
    "recommendations": [
      {
        "id": "string (un id univoco tipo rec-1, rec-2...)",
        "title": "Titolo del brano o podcast",
        "artist": "Nome dell'artista o podcast creator",
        "genre": "Genere musicale",
        "justification": "Spiegazione in italiano del perché è consigliata"
      }
    ],
    "aiExplanation": "Una spiegazione globale in italiano scritta con stile intimo e futuristico dall'AI di Beatfy"
  }`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    artist: { type: Type.STRING },
                    genre: { type: Type.STRING },
                    justification: { type: Type.STRING }
                  },
                  required: ["id", "title", "artist", "genre", "justification"]
                }
              },
              aiExplanation: { type: Type.STRING }
            },
            required: ["recommendations", "aiExplanation"]
          }
        }
      });

      const responseText = response.text;
      if (responseText) {
        return res.json(JSON.parse(responseText.trim()));
      }
    } catch (err: any) {
      console.error("Gemini API Error:", err);
    }
  }

  // Fallback if AI fails or is not configured
  const mockAIResponse = {
    recommendations: [
      {
        id: "rec-1",
        title: "Synth Horizon",
        artist: "Neon Dreamer",
        genre: "Electronic",
        justification: `Visto il tuo interesse per ${preferredGenres && preferredGenres[0] ? preferredGenres[0] : "la musica elettronica"}, questo brano synthwave eleverà la tua concentrazione.`
      },
      {
        id: "rec-2",
        title: "Afternoon Coffee",
        artist: "Lo-Fi Beats Collective",
        genre: "Chill",
        justification: `Perfetto per un mood ${mood || "rilassato"}. Ritmi morbidi pensati per farti compagnia.`
      },
      {
        id: "rec-3",
        title: "Shadows in the Woods",
        artist: "True Crime Chronicles",
        genre: "Podcast",
        justification: "Podcast esclusivo Beatfy consigliato in base alla tua cronologia di podcast e misteri."
      },
      {
        id: "rec-4",
        title: "Autumn Breeze",
        artist: "Stella & the Keys",
        genre: "Jazz",
        justification: "Un tocco acustico caldo per bilanciare le tue sessioni di ascolto odierne."
      }
    ],
    aiExplanation: "Abbiamo analizzato la tua impronta sonora. Il tuo profilo rivela un ascolto eclettico con una preferenza per atmosfere avvolgenti. Ecco una selezione sintonizzata sul tuo stato d'animo."
  };

  return res.json(mockAIResponse);
});

// API: Voice Commands Process
app.post("/api/voice-command", async (req, res) => {
  const { commandText } = req.body;

  if (!commandText) {
    return res.status(400).json({ error: "Comando vocale vuoto." });
  }

  const promptText = `Sei l'assistente vocale integrato di 'Beatfy'. Analizza questa trascrizione di comando vocale dell'utente:
  "${commandText}"

  Determina l'azione voluta e restituisci un oggetto JSON con queste proprietà:
  - action: "play" | "pause" | "next" | "previous" | "search" | "recommend" | "unknown"
  - targetType: "track" | "podcast" | "radio" | "genre" | "any" | null
  - targetName: "nome della canzone, artista, genere o stazione radio trovata nel comando" (oppure null)
  - feedbackMessage: "Una frase affettuosa e immediata in italiano dell'assistente Beatfy che conferma l'azione eseguita (es. 'Subito! Riproduco canzoni rock')"

  Esempi:
  "metti un po' di rock" -> { "action": "play", "targetType": "genre", "targetName": "Rock", "feedbackMessage": "Certamente! Sintonizzo Beatfy sulle frequenze del Rock." }
  "prossima canzone" -> { "action": "next", "targetType": null, "targetName": null, "feedbackMessage": "Passo alla prossima traccia!" }
  "cerca il podcast di AI" -> { "action": "search", "targetType": "podcast", "targetName": "AI", "feedbackMessage": "Cerco subito il podcast esclusivo sull'AI." }

  Rispondi SOLO con il JSON valido.`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING },
              targetType: { type: Type.STRING },
              targetName: { type: Type.STRING },
              feedbackMessage: { type: Type.STRING }
            },
            required: ["action", "targetType", "targetName", "feedbackMessage"]
          }
        }
      });

      const responseText = response.text;
      if (responseText) {
        return res.json(JSON.parse(responseText.trim()));
      }
    } catch (err) {
      console.error("Voice Command API Error:", err);
    }
  }

  // Local rule-based fallback
  const normalized = commandText.toLowerCase();
  let responsePayload = {
    action: "unknown",
    targetType: null,
    targetName: null,
    feedbackMessage: "Non sono sicuro di aver capito il comando vocale, ma proverò ad aiutarti!"
  };

  if (normalized.includes("play") || normalized.includes("metti") || normalized.includes("riproduci") || normalized.includes("ascolta")) {
    responsePayload.action = "play";
    if (normalized.includes("rock")) {
      responsePayload.targetType = "genre";
      responsePayload.targetName = "Rock";
      responsePayload.feedbackMessage = "Subito! Avvio una sessione Rock energizzante.";
    } else if (normalized.includes("pop")) {
      responsePayload.targetType = "genre";
      responsePayload.targetName = "Pop";
      responsePayload.feedbackMessage = "Certamente, sintonizzo la playlist Pop di Beatfy.";
    } else if (normalized.includes("podcast")) {
      responsePayload.targetType = "podcast";
      responsePayload.targetName = "Beatfy Tech Talk";
      responsePayload.feedbackMessage = "Avvio l'ultimo episodio di Beatfy Tech Talk.";
    } else if (normalized.includes("radio")) {
      responsePayload.targetType = "radio";
      responsePayload.targetName = "Custom Synthwave Radio";
      responsePayload.feedbackMessage = "Sintonizzo la tua Radio AI Personalizzata.";
    } else {
      responsePayload.targetType = "any";
      responsePayload.feedbackMessage = "Riproduco musica consigliata per te!";
    }
  } else if (normalized.includes("stop") || normalized.includes("pausa") || normalized.includes("ferma")) {
    responsePayload.action = "pause";
    responsePayload.feedbackMessage = "Musica messa in pausa.";
  } else if (normalized.includes("prossim") || normalized.includes("avanti") || normalized.includes("successiv")) {
    responsePayload.action = "next";
    responsePayload.feedbackMessage = "Traccia successiva.";
  } else if (normalized.includes("precedent") || normalized.includes("indietro")) {
    responsePayload.action = "previous";
    responsePayload.feedbackMessage = "Traccia precedente.";
  } else if (normalized.includes("consigli") || normalized.includes("raccomanda") || normalized.includes("ai")) {
    responsePayload.action = "recommend";
    responsePayload.feedbackMessage = "Interrogo l'algoritmo di raccomandazione Beatfy...";
  }

  return res.json(responsePayload);
});

// API: Multi-Device Sync
app.get("/api/sync/devices", (req, res) => {
  res.json({ devices: Object.values(activeDevices) });
});

app.post("/api/sync/update", (req, res) => {
  const { deviceId, deviceName, deviceType, songId, isPlaying, progress } = req.body;
  if (!deviceId) return res.status(400).json({ error: "Missing deviceId" });

  activeDevices[deviceId] = {
    deviceId,
    deviceName: deviceName || "Beatfy Device",
    deviceType: deviceType || "web",
    songId: songId || "track-1",
    isPlaying: !!isPlaying,
    progress: progress || 0,
    lastUpdated: Date.now()
  };

  // Clean stale devices (inactive for > 15 minutes)
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  for (const key in activeDevices) {
    if (activeDevices[key].lastUpdated < fifteenMinutesAgo && key !== "smart-speaker-living" && key !== "smart-tv-bedroom") {
      delete activeDevices[key];
    }
  }

  res.json({ success: true, devices: Object.values(activeDevices) });
});

app.post("/api/sync/cast", (req, res) => {
  const { sourceDeviceId, targetDeviceId, songId, progress, isPlaying } = req.body;
  if (!targetDeviceId) return res.status(400).json({ error: "Missing targetDeviceId" });

  // Update target device status to mirror state
  if (activeDevices[targetDeviceId]) {
    activeDevices[targetDeviceId].songId = songId;
    activeDevices[targetDeviceId].progress = progress || 0;
    activeDevices[targetDeviceId].isPlaying = isPlaying ?? true;
    activeDevices[targetDeviceId].lastUpdated = Date.now();
  }

  // Update source device status to represent receiver is playing
  if (sourceDeviceId && activeDevices[sourceDeviceId]) {
    activeDevices[sourceDeviceId].isPlaying = false;
  }

  res.json({ success: true, targetState: activeDevices[targetDeviceId], devices: Object.values(activeDevices) });
});

// API: Collaborative Playlist
app.get("/api/collaborative/playlist", (req, res) => {
  res.json({
    tracks: collaborativeTracks,
    messages: collaborativeMessages
  });
});

app.post("/api/collaborative/add-track", (req, res) => {
  const { title, artist, addedBy } = req.body;
  if (!title || !artist) return res.status(400).json({ error: "Missing title or artist" });

  const newTrack: CollabTrack = {
    id: `collab-${Date.now()}`,
    title,
    artist,
    votes: 1,
    addedBy: addedBy || "Anonimo",
    timestamp: Date.now()
  };

  collaborativeTracks.push(newTrack);

  // Add system message
  collaborativeMessages.push({
    id: `msg-sys-${Date.now()}`,
    user: "Sistema",
    text: `${addedBy || "Qualcuno"} ha aggiunto "${title}" alla playlist collaborativa.`,
    timestamp: Date.now()
  });

  res.json({ success: true, tracks: collaborativeTracks, messages: collaborativeMessages });
});

app.post("/api/collaborative/vote", (req, res) => {
  const { trackId, user } = req.body;
  const track = collaborativeTracks.find(t => t.id === trackId);
  if (!track) return res.status(404).json({ error: "Track not found" });

  track.votes += 1;

  res.json({ success: true, tracks: collaborativeTracks });
});

app.post("/api/collaborative/add-message", (req, res) => {
  const { user, text } = req.body;
  if (!user || !text) return res.status(400).json({ error: "Missing user or text" });

  const newMessage: CollabMessage = {
    id: `msg-${Date.now()}`,
    user,
    text,
    timestamp: Date.now()
  };

  collaborativeMessages.push(newMessage);
  // Keep last 50 messages
  if (collaborativeMessages.length > 50) {
    collaborativeMessages.shift();
  }

  res.json({ success: true, messages: collaborativeMessages });
});

// Third-Party Developer API Mock Docs (Returns simulated endpoints response or doc schema)
app.get("/api/developer/docs", (req, res) => {
  res.json({
    appName: "Beatfy Developer API",
    version: "v1.0.0",
    auth: "Bearer Token required (Simulated inside the developer playground)",
    endpoints: [
      {
        path: "/api/v1/me/player",
        method: "GET",
        description: "Recupera lo stato di riproduzione corrente dell'utente.",
        sampleResponse: {
          device: "Beatfy Web Player",
          song: "Midnight City",
          artist: "M83",
          progress_ms: 45000,
          is_playing: true
        }
      },
      {
        path: "/api/v1/me/playlists",
        method: "GET",
        description: "Ritorna tutte le playlist dell'utente.",
        sampleResponse: {
          items: [
            { id: "p-1", name: "I miei preferiti", tracks_count: 42 },
            { id: "collab-room", name: "Roadtrip Playlist (Collaborativa)", tracks_count: 5 }
          ]
        }
      },
      {
        path: "/api/v1/recommendations",
        method: "POST",
        description: "Richiede suggerimenti personalizzati basati su generi e stato emotivo.",
        sampleResponse: {
          recommendations: [
            { title: "Neon Horizon", artist: "Stella & the Keys", confidence: "98%" }
          ]
        }
      }
    ]
  });
});

// Integration with external stream imports
app.post("/api/external/import", (req, res) => {
  const { service, playlistUrl } = req.body;
  if (!service || !playlistUrl) return res.status(400).json({ error: "Missing service or URL" });

  // Simulate import
  let importedTracks = [];
  if (service === "apple") {
    importedTracks = [
      { title: "Levitating", artist: "Dua Lipa", genre: "Pop" },
      { title: "Save Your Tears", artist: "The Weeknd", genre: "Pop" }
    ];
  } else if (service === "youtube") {
    importedTracks = [
      { title: "Heat Waves", artist: "Glass Animals", genre: "Alternative" },
      { title: "Stay", artist: "The Kid LAROI & Justin Bieber", genre: "Pop" }
    ];
  } else {
    importedTracks = [
      { title: "After Gold", artist: "Big Wild", genre: "Electronic" },
      { title: "Glow", artist: "Fred again..", genre: "Electronic" }
    ];
  }

  res.json({
    success: true,
    service,
    importedCount: importedTracks.length,
    tracks: importedTracks,
    message: `Importati correttamente ${importedTracks.length} brani da ${service === "apple" ? "Apple Music" : service === "youtube" ? "YouTube Music" : "Tidal"}!`
  });
});

// Vite middleware and Fallback for SPA routing
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Beatfy server running on http://localhost:${PORT}`);
  });
}

startServer();
