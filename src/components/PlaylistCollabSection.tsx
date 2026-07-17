import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, Plus, ArrowUp, Send, MessageSquare, Play, Download } from "lucide-react";
import { CollabTrack, CollabMessage } from "../types";

interface PlaylistCollabSectionProps {
  tracks: CollabTrack[];
  messages: CollabMessage[];
  onAddTrack: (title: string, artist: string) => void;
  onVoteTrack: (trackId: string) => void;
  onSendMessage: (text: string) => void;
  userName: string;
  onPlayTrack: (title: string, artist: string) => void;
  themeStyles?: any;
  onExport?: (format: "json" | "csv") => void;
}

export default function PlaylistCollabSection({
  tracks,
  messages,
  onAddTrack,
  onVoteTrack,
  onSendMessage,
  userName,
  onPlayTrack,
  themeStyles,
  onExport,
}: PlaylistCollabSectionProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [msgText, setMsgText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const activeThemeStyles = themeStyles || {
    accentText: "text-green-500",
    accentBg: "bg-green-500",
    accentBorder: "border-green-500/40",
    accentFill: "fill-green-500",
    accentShadow: "shadow-green-500/10",
  };

  const handleSubmitTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newArtist.trim()) return;
    onAddTrack(newTitle.trim(), newArtist.trim());
    setNewTitle("");
    setNewArtist("");
    setIsAdding(false);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim()) return;
    onSendMessage(msgText.trim());
    setMsgText("");
  };

  // Sort tracks by votes descending
  const sortedTracks = [...tracks].sort((a, b) => b.votes - a.votes);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Collaborative Tracks List */}
      <div className="lg:col-span-2 bg-[#121212]/90 border border-neutral-800/80 rounded-2xl p-5 flex flex-col h-[550px]">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 ${activeThemeStyles.accentBg}/10 rounded-xl`}>
              <Users className={`w-5 h-5 ${activeThemeStyles.accentText}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Playlist Collaborativa</h2>
              <p className="text-xs text-neutral-400">Vota i brani preferiti per scalarli in coda</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tracks.length > 0 && onExport && (
              <div className="hidden sm:flex items-center bg-[#181818] border border-neutral-800 rounded-full p-1 gap-1">
                <span className="text-[9px] font-bold text-neutral-500 px-2 font-mono flex items-center gap-1 shrink-0">
                  <Download className="w-3 h-3" /> ESPORTA:
                </span>
                <button
                  onClick={() => onExport("json")}
                  className="px-2.5 py-1 rounded-full text-[9px] font-extrabold text-neutral-300 hover:text-white transition uppercase font-mono bg-neutral-900 border border-neutral-800 hover:border-neutral-700"
                  title="Esporta in formato JSON"
                >
                  JSON
                </button>
                <button
                  onClick={() => onExport("csv")}
                  className="px-2.5 py-1 rounded-full text-[9px] font-extrabold text-neutral-300 hover:text-white transition uppercase font-mono bg-neutral-900 border border-neutral-800 hover:border-neutral-700"
                  title="Esporta in formato CSV"
                >
                  CSV
                </button>
              </div>
            )}
            <button
              onClick={() => setIsAdding(!isAdding)}
              className={`flex items-center gap-1.5 ${activeThemeStyles.accentBg} hover:opacity-90 text-black px-4 py-2 rounded-full text-xs font-bold transition shadow-lg ${activeThemeStyles.accentShadow}`}
            >
              <Plus className="w-4 h-4" /> Aggiungi Brano
            </button>
          </div>
        </div>

        {/* Add Track Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleSubmitTrack}
              className="bg-[#181818] border border-neutral-800 p-4 rounded-xl mb-4 space-y-3 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Canzone..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#111] border border-neutral-800 focus:border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                  required
                />
                <input
                  type="text"
                  placeholder="Artista..."
                  value={newArtist}
                  onChange={(e) => setNewArtist(e.target.value)}
                  className="w-full bg-[#111] border border-neutral-800 focus:border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 text-2xs font-bold">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded-lg transition ${activeThemeStyles.accentBg} text-black hover:opacity-95`}
                >
                  Salva nella Playlist
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {sortedTracks.length === 0 ? (
            <div className="text-center py-20 text-neutral-500 text-xs">
              Nessun brano aggiunto. Sii il primo ad aggiungere una traccia collaborativa!
            </div>
          ) : (
            sortedTracks.map((track, i) => (
              <motion.div
                key={track.id}
                layout
                className="flex items-center justify-between p-3.5 bg-[#181818] border border-neutral-800 hover:border-neutral-700/60 rounded-xl transition"
              >
                <div className="flex items-center gap-3">
                  <div className="text-xs font-mono text-neutral-500 w-5 text-center">
                    {i + 1}
                  </div>
                  <button
                    onClick={() => onPlayTrack(track.title, track.artist)}
                    className={`p-2 bg-neutral-800 hover:${activeThemeStyles.accentBg}/20 text-neutral-300 hover:${activeThemeStyles.accentText} rounded-lg transition`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <div>
                    <span className="font-bold text-xs text-white block">
                      {track.title}
                    </span>
                    <span className="text-3xs text-neutral-400 block">
                      {track.artist} • aggiunto da <span className={activeThemeStyles.accentText}>{track.addedBy}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-neutral-300">
                    {track.votes} {track.votes === 1 ? "voto" : "voti"}
                  </span>
                  <button
                    onClick={() => onVoteTrack(track.id)}
                    className={`p-2 rounded-lg ${activeThemeStyles.accentBg}/10 ${activeThemeStyles.accentText} hover:${activeThemeStyles.accentBg} hover:text-black transition flex items-center gap-1 text-2xs font-bold border ${activeThemeStyles.accentBorder}`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" /> Vota
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Playlist Room Live Chat */}
      <div className="bg-[#121212]/90 border border-neutral-800/80 rounded-2xl p-5 flex flex-col h-[550px]">
        <div className="flex items-center gap-3 mb-4 border-b border-neutral-800 pb-3">
          <MessageSquare className={`w-4 h-4 ${activeThemeStyles.accentText}`} />
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Chat di Gruppo</h3>
            <p className="text-4xs text-neutral-400 font-mono">LIVE COLLAB CONVERSATION ROOM</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4 flex flex-col-reverse">
          <div className="space-y-2.5">
            {messages.map((msg) => {
              const isSys = msg.user === "Sistema";
              const isMe = msg.user === userName;
              return (
                <div
                  key={msg.id}
                  className={`p-2.5 rounded-xl text-xs max-w-[90%] leading-relaxed ${
                    isSys
                      ? `${activeThemeStyles.accentBg}/5 ${activeThemeStyles.accentText} text-3xs border ${activeThemeStyles.accentBorder} italic text-center mx-auto w-full`
                      : isMe
                      ? `${activeThemeStyles.accentBg}/15 text-white ml-auto border ${activeThemeStyles.accentBorder}`
                      : "bg-[#181818] text-neutral-200 border border-neutral-800"
                  }`}
                >
                  {!isSys && (
                    <span className="font-bold block text-2xs text-neutral-400 mb-0.5">
                      {msg.user}
                    </span>
                  )}
                  {msg.text}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            placeholder="Scrivi un messaggio..."
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            className="flex-1 bg-[#111] border border-neutral-800 focus:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
          />
          <button
            type="submit"
            className={`p-2.5 ${activeThemeStyles.accentBg} hover:opacity-90 text-black rounded-xl transition flex items-center justify-center`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
