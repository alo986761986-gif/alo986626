import { useState } from "react";
import { motion } from "motion/react";
import { Code2, Terminal, Play, Check, Copy, ExternalLink, Cpu } from "lucide-react";
import { DeveloperEndpoint } from "../types";

const ENDPOINTS: DeveloperEndpoint[] = [
  {
    path: "/api/v1/me/player",
    method: "GET",
    description: "Recupera lo stato corrente di riproduzione attiva (canzone, durata, riproduzione).",
    sampleResponse: {
      status: "active",
      device: "Beatfy Web Premium App",
      current_track: {
        id: "track-1",
        title: "Midnight Horizon",
        artist: "Synthwave Voyager",
        duration_s: 372
      },
      volume: 80,
      is_playing: true,
      audio_quality: "hi-fi"
    }
  },
  {
    path: "/api/v1/me/playlists",
    method: "GET",
    description: "Ottiene la lista di tutte le playlist personali e collaborative dell'utente loggato.",
    sampleResponse: {
      items: [
        { id: "fav-99", name: "I miei preferiti", tracks_count: 42, collaborative: false },
        { id: "collab-room", name: "Roadtrip Playlist Collab", tracks_count: 5, collaborative: true }
      ]
    }
  },
  {
    path: "/api/v1/recommendations/discover",
    method: "POST",
    description: "Interroga l'intelligenza artificiale di Beatfy per suggerimenti on-demand.",
    sampleResponse: {
      query_mood: "Focalizzato",
      confidence: 0.98,
      recommended: [
        { id: "rec-0", title: "Neon Skyline", artist: "Stella & the Keys", duration_s: 290 }
      ]
    }
  }
];

export default function DeveloperApiDocs() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [lang, setLang] = useState<"js" | "python" | "go" | "curl">("js");
  const [copied, setCopied] = useState(false);
  const [responseOutput, setResponseOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const activeEndpoint = ENDPOINTS[activeTab];

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const triggerSimulate = () => {
    setLoading(true);
    setResponseOutput(null);
    setTimeout(() => {
      setResponseOutput(activeEndpoint.sampleResponse);
      setLoading(false);
    }, 700);
  };

  const getCodeSnippet = () => {
    const p = activeEndpoint.path;
    const m = activeEndpoint.method;

    switch (lang) {
      case "js":
        return `// SDK Javascript ufficiale Beatfy
import { BeatfyClient } from '@beatfy/sdk';

const client = new BeatfyClient({ apiKey: 'bf_live_9a8f7c6d5e4d3c2b1a' });

async function getPlaybackData() {
  try {
    const res = await client.request({
      path: '${p}',
      method: '${m}'
    });
    console.log(res);
  } catch (error) {
    console.error('Si è verificato un errore:', error);
  }
}

getPlaybackData();`;
      case "python":
        return `# SDK Python ufficiale Beatfy
from beatfy import BeatfyClient

client = BeatfyClient(api_key="bf_live_9a8f7c6d5e4d3c2b1a")

try:
    response = client.request(
        path="${p}",
        method="${m}"
    )
    print(response)
except Exception as e:
    print(f"Errore API: {e}")`;
      case "go":
        return `package main

import (
	"context"
	"fmt"
	"github.com/beatfy/sdk-go/beatfy"
)

func main() {
	client := beatfy.NewClient("bf_live_9a8f7c6d5e4d3c2b1a")
	ctx := context.Background()

	res, err := client.Request(ctx, "${m}", "${p}", nil)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Risultato: %v\\n", res)
}`;
      case "curl":
        return `curl -X ${m} "https://api.beatfy.com${p}" \\
  -H "Authorization: Bearer bf_live_9a8f7c6d5e4d3c2b1a" \\
  -H "Content-Type: application/json"`;
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
      {/* Sidebar navigation for API endpoints */}
      <div className="bg-[#121212]/90 border border-neutral-800/80 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
          <div className="p-2.5 bg-green-500/10 rounded-xl">
            <Cpu className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Developer API Suite</h2>
            <p className="text-xs text-neutral-400 font-mono">INTEGRAZIONI TERZE PARTI</p>
          </div>
        </div>

        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Endpoints Disponibili
        </span>
        <div className="space-y-1.5 flex-1">
          {ENDPOINTS.map((ep, i) => (
            <button
              key={ep.path}
              onClick={() => {
                setActiveTab(i);
                setResponseOutput(null);
              }}
              className={`w-full p-3.5 rounded-xl text-left border transition flex flex-col gap-1.5 ${
                activeTab === i
                  ? "bg-green-500/10 border-green-500/40 text-green-400"
                  : "bg-[#181818] border-neutral-800 text-neutral-400 hover:border-neutral-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-4xs font-bold px-1.5 py-0.5 rounded ${
                  ep.method === "GET" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                }`}>
                  {ep.method}
                </span>
                <span className="font-mono text-2xs font-bold text-white">{ep.path}</span>
              </div>
              <p className="text-3xs text-neutral-400 leading-normal">{ep.description}</p>
            </button>
          ))}
        </div>

        <div className="bg-[#181818] border border-neutral-800 p-4 rounded-xl">
          <span className="text-2xs font-bold text-white block mb-1">Developer Keys</span>
          <p className="text-4xs text-neutral-400 leading-normal">
            Richiedi la tua chiave API di produzione nella sezione impostazioni. Non divulgare la chiave <code className="text-green-500">bf_live_...</code>.
          </p>
        </div>
      </div>

      {/* Code generator & Playground Panel */}
      <div className="xl:col-span-2 bg-[#121212]/90 border border-neutral-800/80 rounded-2xl p-5 flex flex-col h-full space-y-5">
        {/* Languages Tabs */}
        <div className="flex justify-between items-center border-b border-neutral-800 pb-3 flex-wrap gap-3">
          <div className="flex gap-1.5">
            {([
              { id: "js", label: "Javascript" },
              { id: "python", label: "Python" },
              { id: "go", label: "Go" },
              { id: "curl", label: "cURL" },
            ] as const).map((langObj) => (
              <button
                key={langObj.id}
                onClick={() => setLang(langObj.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  lang === langObj.id
                    ? "bg-[#222] text-green-500"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {langObj.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleCopyCode(getCodeSnippet())}
            className="flex items-center gap-1 bg-[#222] hover:bg-neutral-800 border border-neutral-800 text-neutral-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" /> Copiato!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copia Codice
              </>
            )}
          </button>
        </div>

        {/* Code Block Display */}
        <div className="relative">
          <pre className="bg-[#0c0c0c] border border-neutral-800 rounded-xl p-4 text-3xs font-mono text-green-400 overflow-x-auto h-52 leading-relaxed">
            {getCodeSnippet()}
          </pre>
        </div>

        {/* Interactive Simulator / Request Sandbox */}
        <div className="flex-1 flex flex-col border border-neutral-800 rounded-xl p-4 bg-[#181818]/60 space-y-3">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-green-500" />
              <span className="text-2xs font-mono font-bold text-neutral-300">Simulatore di Richieste API (Sandbox)</span>
            </div>
            <button
              onClick={triggerSimulate}
              disabled={loading}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-black font-bold px-3 py-1.5 rounded-lg text-xs transition"
            >
              <Play className="w-3.5 h-3.5" />
              {loading ? "Esecuzione..." : "Invia Richiesta"}
            </button>
          </div>

          <div className="flex-1 bg-black/60 rounded-lg p-3 overflow-y-auto max-h-52 font-mono text-3xs text-neutral-400">
            {loading && (
              <div className="flex items-center gap-2 text-neutral-500 py-4 justify-center">
                <span className="animate-spin border-2 border-green-500 border-t-transparent w-4 h-4 rounded-full" />
                Interrogando il server Beatfy v1 API...
              </div>
            )}
            {!loading && !responseOutput && (
              <span className="text-neutral-600 italic">Clicca su 'Invia Richiesta' per vedere la risposta JSON in tempo reale.</span>
            )}
            {!loading && responseOutput && (
              <pre className="text-green-500 font-mono text-3xs whitespace-pre-wrap leading-normal">
                {JSON.stringify(responseOutput, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
