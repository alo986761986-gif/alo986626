import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Heart,
  Download,
  Search,
  Sparkles,
  Radio,
  Tv,
  Speaker,
  Smartphone,
  Watch,
  Award,
  Sliders,
  Layout,
  Code2,
  Terminal,
  Settings,
  Users,
  Flame,
  ArrowUp,
  Send,
  MessageSquare,
  Music,
  Menu,
  X,
  CloudOff,
  Crown,
  Compass,
  ChevronRight,
  HelpCircle,
  Bell,
  RefreshCw,
  Mic,
  LogOut,
} from "lucide-react";

import { Track, SyncDevice, CollabTrack, CollabMessage } from "./types";
import { TRACK_CATALOGUE, GENRES } from "./data/catalogue";

// Import custom sub-components
import EqualizerModal from "./components/EqualizerModal";
import CastModal from "./components/CastModal";
import LyricsModal from "./components/LyricsModal";
import PlaylistCollabSection from "./components/PlaylistCollabSection";
import WidgetCustomizer from "./components/WidgetCustomizer";
import DeveloperApiDocs from "./components/DeveloperApiDocs";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import PremiumCheckoutModal from "./components/PremiumCheckoutModal";
import VoiceAssistantButton from "./components/VoiceAssistantButton";
import AIPromptModal from "./components/AIPromptModal";
import AutoMixConsole, { getTrackBPM } from "./components/AutoMixConsole";
import LoginGate from "./components/LoginGate";

export default function App() {
  // Navigation Section
  const [activeTab, setActiveTab] = useState<string>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // User States and Auth Logic (Google, Facebook, Apple)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => localStorage.getItem("beatfy_authenticated") === "true");
  const [userName, setUserName] = useState<string>(() => localStorage.getItem("beatfy_user_name") || "");
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem("beatfy_user_email") || "");
  const [userAvatar, setUserAvatar] = useState<string>(() => localStorage.getItem("beatfy_user_avatar") || "");

  const handleLogin = (userInfo: { name: string; email: string; avatarUrl: string; provider: string }) => {
    setUserName(userInfo.name);
    setUserEmail(userInfo.email);
    setUserAvatar(userInfo.avatarUrl);
    setIsAuthenticated(true);
    localStorage.setItem("beatfy_user_name", userInfo.name);
    localStorage.setItem("beatfy_user_email", userInfo.email);
    localStorage.setItem("beatfy_user_avatar", userInfo.avatarUrl);
    localStorage.setItem("beatfy_authenticated", "true");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserName("");
    setUserEmail("");
    setUserAvatar("");
    localStorage.removeItem("beatfy_user_name");
    localStorage.removeItem("beatfy_user_email");
    localStorage.removeItem("beatfy_user_avatar");
    localStorage.removeItem("beatfy_authenticated");
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  const [premiumActive, setPremiumActive] = useState<boolean>(() => {
    return localStorage.getItem("beatfy_premium_active") === "true";
  });
  const [isPremiumCheckoutOpen, setIsPremiumCheckoutOpen] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [likedSongs, setLikedSongs] = useState<string[]>(["track-1", "track-4"]);

  // Theme settings
  const [theme, setTheme] = useState<"geometric" | "green" | "cyber" | "space" | "amber">("geometric");

  // Notifications
  const [notifications, setNotifications] = useState<string[]>([
    "Nuovo singolo di Synthwave Voyager rilasciato ora!",
    "Sofia ti ha invitato a collaborare alla playlist 'Roadtrip Collab'.",
  ]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Playback States
  const [currentTrack, setCurrentTrack] = useState<Track>(TRACK_CATALOGUE[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackQueue, setPlaybackQueue] = useState<Track[]>(TRACK_CATALOGUE);
  const [recentHistory, setRecentHistory] = useState<Track[]>([]);

  // DSP and Audio AudioContext variables
  const [eqGains, setEqGains] = useState<number[]>([0, 0, 0, 0, 0]);
  const [spatialAudio, setSpatialAudio] = useState(false);
  const [bassBoost, setBassBoost] = useState(false);
  const [isEqOpen, setIsEqOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);

  // Casting & Sincronizzazione Multidevice
  const [activeDeviceId, setActiveDeviceId] = useState("web-client-1");
  const [devices, setDevices] = useState<SyncDevice[]>([]);
  const [isCastOpen, setIsCastOpen] = useState(false);

  // Collaborative Playlist & Chat Room
  const [collabTracks, setCollabTracks] = useState<CollabTrack[]>([]);
  const [collabMessages, setCollabMessages] = useState<CollabMessage[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Crossfade Transition States
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(false);
  const [crossfadeDuration, setCrossfadeDuration] = useState(5); // in seconds
  const [autoMixEnabled, setAutoMixEnabled] = useState(false);
  const [isAutoMixOpen, setIsAutoMixOpen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const prevTrackBpmRef = useRef<number | null>(null);

  // Refs for audio and visualizer elements
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeOutIntervalRef = useRef<number | null>(null);
  const fadeInIntervalRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const filterNodesRef = useRef<BiquadFilterNode[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Audio setup and fallbacks
  useEffect(() => {
    // Initialize HTML Audio element
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = "anonymous";

    const handleTimeUpdate = () => {
      setCurrentTime(audioRef.current?.currentTime || 0);
    };

    const handleLoadedMetadata = () => {
      setDuration(audioRef.current?.duration || 0);
    };

    const handleTrackEnd = () => {
      handleNextTrack();
    };

    audioRef.current.addEventListener("timeupdate", handleTimeUpdate);
    audioRef.current.addEventListener("loadedmetadata", handleLoadedMetadata);
    audioRef.current.addEventListener("ended", handleTrackEnd);

    // Initial load
    audioRef.current.src = currentTrack.url;
    audioRef.current.volume = volume / 100;

    // Fetch initial databases
    fetchDevices();
    fetchCollabData();

    // Setup polling for devices and collaboration sync (simulate real-time)
    const interval = setInterval(() => {
      fetchDevices();
      fetchCollabData();
    }, 4000);

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener("timeupdate", handleTimeUpdate);
        audioRef.current.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audioRef.current.removeEventListener("ended", handleTrackEnd);
        audioRef.current.pause();
      }
      clearInterval(interval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Update track change
  useEffect(() => {
    if (audioRef.current) {
      const wasPlaying = isPlaying;
      audioRef.current.src = currentTrack.url;
      audioRef.current.load();

      if (isTransitioningRef.current) {
        // This is a crossfade transition! Set volume to 0 initially so we can fade in
        audioRef.current.volume = 0;
        if (fadeInIntervalRef.current) clearInterval(fadeInIntervalRef.current);

        const currentBpm = getTrackBPM(currentTrack.id);
        const prevBpm = prevTrackBpmRef.current || currentBpm;
        const startRate = autoMixEnabled ? prevBpm / currentBpm : 1.0;
        const targetRate = 1.0;

        if (audioRef.current) {
          audioRef.current.playbackRate = startRate;
          setPlaybackRate(startRate);
        }

        const targetVol = isMuted ? 0 : volume / 100;
        const steps = 20;
        const intervalTime = (crossfadeDuration * 1000) / steps;
        let currentStep = 0;

        fadeInIntervalRef.current = window.setInterval(() => {
          currentStep++;
          const currentVol = targetVol * (currentStep / steps);
          const currentRate = startRate + (targetRate - startRate) * (currentStep / steps);
          if (audioRef.current) {
            audioRef.current.volume = Math.min(targetVol, currentVol);
            audioRef.current.playbackRate = currentRate;
            setPlaybackRate(currentRate);
          }
          if (currentStep >= steps) {
            if (fadeInIntervalRef.current) clearInterval(fadeInIntervalRef.current);
            fadeInIntervalRef.current = null;
            isTransitioningRef.current = false;
            // Restore normal volume sync & playbackRate
            if (audioRef.current) {
              audioRef.current.volume = isMuted ? 0 : volume / 100;
              audioRef.current.playbackRate = 1.0;
              setPlaybackRate(1.0);
            }
          }
        }, intervalTime);
      } else {
        // Manual change: cancel any ongoing crossfades and restore volume & playbackRate
        if (fadeOutIntervalRef.current) {
          clearInterval(fadeOutIntervalRef.current);
          fadeOutIntervalRef.current = null;
        }
        if (fadeInIntervalRef.current) {
          clearInterval(fadeInIntervalRef.current);
          fadeInIntervalRef.current = null;
        }
        audioRef.current.volume = isMuted ? 0 : volume / 100;
        if (audioRef.current) {
          audioRef.current.playbackRate = 1.0;
          setPlaybackRate(1.0);
        }
      }

      if (wasPlaying) {
        audioRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      }
      // Add to history
      if (!recentHistory.some((t) => t.id === currentTrack.id)) {
        setRecentHistory((prev) => [currentTrack, ...prev.slice(0, 7)]);
      }
    }
  }, [currentTrack, volume, isMuted, crossfadeDuration, autoMixEnabled]);

  // Sync state changes with node volumes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Handle crossfade trigger during playback
  useEffect(() => {
    if (!audioRef.current || isTransitioningRef.current || !isPlaying) return;
    if (!crossfadeEnabled && !autoMixEnabled) return;

    let shouldTrigger = false;
    let effectiveCrossfadeDuration = crossfadeDuration;

    if (autoMixEnabled) {
      const currentBpm = getTrackBPM(currentTrack.id);
      const beatDuration = 60 / currentBpm;
      const barDuration = 4 * beatDuration;
      // Trigger transition at a bar boundary when in the last 15-20% of the track (e.g., remaining time around 12 seconds)
      const targetRemaining = Math.max(8, Math.min(18, duration * 0.15));
      const transitionRemaining = Math.round(targetRemaining / barDuration) * barDuration;
      const idealTransitionTime = duration - transitionRemaining;

      shouldTrigger = currentTime >= idealTransitionTime;
      effectiveCrossfadeDuration = transitionRemaining;
    } else {
      const canCrossfade = duration > crossfadeDuration * 1.5;
      shouldTrigger = canCrossfade && (duration - currentTime <= crossfadeDuration);
    }

    if (shouldTrigger) {
      // Trigger crossfade transition!
      isTransitioningRef.current = true;
      prevTrackBpmRef.current = getTrackBPM(currentTrack.id);

      const startVol = isMuted ? 0 : volume / 100;
      const steps = 20;
      const intervalTime = (effectiveCrossfadeDuration * 1000) / steps;
      let currentStep = 0;

      if (fadeOutIntervalRef.current) clearInterval(fadeOutIntervalRef.current);

      fadeOutIntervalRef.current = window.setInterval(() => {
        currentStep++;
        const targetVol = startVol * (1 - currentStep / steps);
        if (audioRef.current) {
          audioRef.current.volume = Math.max(0, targetVol);
        }

        if (currentStep >= steps) {
          if (fadeOutIntervalRef.current) clearInterval(fadeOutIntervalRef.current);
          fadeOutIntervalRef.current = null;

          // Go to next track
          const currentIndex = playbackQueue.findIndex((t) => t.id === currentTrack.id);
          let nextTrack = playbackQueue[0];
          if (currentIndex !== -1 && currentIndex < playbackQueue.length - 1) {
            nextTrack = playbackQueue[currentIndex + 1];
          }
          setCurrentTrack(nextTrack);
          setCurrentTime(0);
        }
      }, intervalTime);
    }
  }, [currentTime, crossfadeEnabled, autoMixEnabled, crossfadeDuration, duration, currentTrack, playbackQueue, volume, isMuted, isPlaying]);

  // Sync Play / Pause state
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      updateDeviceState(false);
    } else {
      // Resume or initialize Web Audio
      initWebAudio();
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          updateDeviceState(true);
        })
        .catch((err) => {
          console.warn("Audio play blocked by browser or CORS. Simulating stream progress.", err);
          setIsPlaying(true);
          // If sound source is blocked by CORS, simulate visualizer progress anyway
          startFakePlayback();
        });
    }
  };

  // Fake Playback in case of CORS block / Silent Audio mode
  const fakeIntervalRef = useRef<number | null>(null);
  const startFakePlayback = () => {
    if (fakeIntervalRef.current) clearInterval(fakeIntervalRef.current);
    fakeIntervalRef.current = window.setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= duration) {
          handleNextTrack();
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopFakePlayback = () => {
    if (fakeIntervalRef.current) {
      clearInterval(fakeIntervalRef.current);
      fakeIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      stopFakePlayback();
    }
  }, [isPlaying]);

  // Initialize Web Audio API nodes for EQ & Visualizer
  const initWebAudio = () => {
    if (audioCtxRef.current || !audioRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const sourceNode = ctx.createMediaElementSource(audioRef.current);

      // Create Peaking filters for 5 bands
      // Frequencies: 60Hz, 230Hz, 910Hz, 4kHz, 14kHz
      const freqs = [60, 230, 910, 4000, 14000];
      let previousFilter = sourceNode;

      const filters = freqs.map((f, index) => {
        const filter = ctx.createBiquadFilter();
        filter.type = index === 0 ? "lowshelf" : index === 4 ? "highshelf" : "peaking";
        filter.frequency.value = f;
        filter.Q.value = 1.0;
        filter.gain.value = eqGains[index];
        previousFilter.connect(filter);
        previousFilter = filter as any;
        return filter;
      });

      filterNodesRef.current = filters;

      // Create AnalyserNode
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      previousFilter.connect(analyser);
      analyser.connect(ctx.destination);

      // Trigger dynamic drawing
      drawVisualizer();
    } catch (err) {
      console.warn("Failed to initialize Web Audio API (often due to iframe sandbox):", err);
    }
  };

  // Draw real-time frequencies on visualizer canvas
  const drawVisualizer = () => {
    if (!visualizerCanvasRef.current || !analyserRef.current) return;

    const canvas = visualizerCanvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      canvasCtx.fillStyle = "#121212";
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      // Assign theme accent color
      let barColor = "rgb(34, 197, 94)"; // Green
      if (theme === "geometric") barColor = "rgb(99, 102, 241)"; // Indigo
      if (theme === "cyber") barColor = "rgb(236, 72, 153)";
      if (theme === "space") barColor = "rgb(168, 85, 247)";
      if (theme === "amber") barColor = "rgb(245, 158, 11)";

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 1.5;

        canvasCtx.fillStyle = barColor;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    draw();
  };

  // Sync Slider Gains with actual Web Audio Nodes
  const handleEqGainChange = (index: number, val: number) => {
    const newGains = [...eqGains];
    newGains[index] = val;
    setEqGains(newGains);

    // If filter nodes are connected, update parameters in real-time
    if (filterNodesRef.current[index]) {
      filterNodesRef.current[index].gain.value = val;
    }
  };

  // Handlers for Audio Buttons
  const handleNextTrack = () => {
    isTransitioningRef.current = false;
    if (fadeOutIntervalRef.current) {
      clearInterval(fadeOutIntervalRef.current);
      fadeOutIntervalRef.current = null;
    }
    if (fadeInIntervalRef.current) {
      clearInterval(fadeInIntervalRef.current);
      fadeInIntervalRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }

    const currentIndex = playbackQueue.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex !== -1 && currentIndex < playbackQueue.length - 1) {
      setCurrentTrack(playbackQueue[currentIndex + 1]);
      setCurrentTime(0);
    } else {
      // Loop back to first
      setCurrentTrack(playbackQueue[0]);
      setCurrentTime(0);
    }
  };

  const handlePrevTrack = () => {
    isTransitioningRef.current = false;
    if (fadeOutIntervalRef.current) {
      clearInterval(fadeOutIntervalRef.current);
      fadeOutIntervalRef.current = null;
    }
    if (fadeInIntervalRef.current) {
      clearInterval(fadeInIntervalRef.current);
      fadeInIntervalRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }

    const currentIndex = playbackQueue.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex !== -1 && currentIndex > 0) {
      setCurrentTrack(playbackQueue[currentIndex - 1]);
    } else {
      setCurrentTrack(playbackQueue[playbackQueue.length - 1]);
    }
    setCurrentTime(0);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Offline Mode Switcher
  const handleOfflineToggle = () => {
    const newState = !offlineMode;
    setOfflineMode(newState);

    if (newState) {
      // Restrict queue to non-podcast standard downloaded offline songs
      const offlineSongs = TRACK_CATALOGUE.filter((t) => !t.isPodcast && !t.isRadio);
      setPlaybackQueue(offlineSongs);
      setCurrentTrack(offlineSongs[0]);

      // Trigger offline alert sound / synthetic tone offline
      playSyntheticTone(440, 200);
      setTimeout(() => playSyntheticTone(554, 200), 200);
      setTimeout(() => playSyntheticTone(659, 300), 400);
    } else {
      // Restore full catalogue
      setPlaybackQueue(TRACK_CATALOGUE);
      setCurrentTrack(TRACK_CATALOGUE[0]);
    }
  };

  // Play synthetic melody tone on demand (100% offline synthesizer fallback)
  const playSyntheticTone = (freq: number, durationMs: number) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch (err) {
      console.log("Synthesizer sound generated silently.");
    }
  };

  // Premium Toggle
  const handlePremiumToggle = () => {
    if (!premiumActive) {
      setIsPremiumCheckoutOpen(true);
    } else {
      if (confirm("Sei sicuro di voler disattivare il tuo piano Premium? Per riattivarlo dovrai effettuare nuovamente l'acquisto di 9,99€.")) {
        setPremiumActive(false);
        localStorage.removeItem("beatfy_premium_active");
      }
    }
  };

  // Likes Songs manager
  const handleLikeSong = (songId: string) => {
    setLikedSongs((prev) =>
      prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId]
    );
  };

  // Multi-Device state fetch
  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/sync/devices");
      const data = await res.json();
      if (data && data.devices) {
        setDevices(data.devices);
      }
    } catch (e) {
      console.warn("Could not sync devices from server database.");
    }
  };

  // Collaborative Playlist data fetch
  const fetchCollabData = async () => {
    try {
      const res = await fetch("/api/collaborative/playlist");
      const data = await res.json();
      if (data) {
        setCollabTracks(data.tracks || []);
        setCollabMessages(data.messages || []);
      }
    } catch (e) {
      console.warn("Collab syncing unavailable offline.");
    }
  };

  // Post dynamic device update
  const updateDeviceState = async (playingState: boolean) => {
    try {
      await fetch("/api/sync/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: "web-client-1",
          deviceName: "Beatfy Web Player",
          deviceType: "desktop",
          songId: currentTrack.id,
          isPlaying: playingState,
          progress: Math.floor(currentTime),
        }),
      });
      fetchDevices();
    } catch (e) {
      // Silent error for local offline state
    }
  };

  // Cast playback to smart home devices
  const handleSelectDevice = async (deviceId: string) => {
    setActiveDeviceId(deviceId);
    try {
      const res = await fetch("/api/sync/cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceDeviceId: "web-client-1",
          targetDeviceId: deviceId,
          songId: currentTrack.id,
          progress: Math.floor(currentTime),
          isPlaying: isPlaying,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        fetchDevices();
      }
    } catch (e) {
      console.warn("Casting failed.");
    }
  };

  // Collab adds and votes
  const handleCollabAddTrack = async (title: string, artist: string) => {
    try {
      const res = await fetch("/api/collaborative/add-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, artist, addedBy: userName }),
      });
      const data = await res.json();
      if (data && data.success) {
        setCollabTracks(data.tracks || []);
        setCollabMessages(data.messages || []);
      }
    } catch (e) {
      console.warn("Adding collab track offline.");
    }
  };

  const handleCollabVoteTrack = async (trackId: string) => {
    try {
      const res = await fetch("/api/collaborative/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId, user: userName }),
      });
      const data = await res.json();
      if (data && data.success) {
        setCollabTracks(data.tracks || []);
      }
    } catch (e) {
      console.warn("Collab vote error.");
    }
  };

  const handleCollabSendMessage = async (text: string) => {
    try {
      const res = await fetch("/api/collaborative/add-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userName, text }),
      });
      const data = await res.json();
      if (data && data.success) {
        setCollabMessages(data.messages || []);
      }
    } catch (e) {
      console.warn("Collab chat unavailable offline.");
    }
  };

  // Export Playlists as JSON or CSV
  const handleExportPlaylist = (type: "liked" | "collab", format: "json" | "csv") => {
    let filename = "";
    let content = "";
    let mimeType = "";

    if (type === "liked") {
      const tracks = TRACK_CATALOGUE.filter((track) => likedSongs.includes(track.id));
      filename = `beatfy_liked_songs.${format}`;

      if (format === "json") {
        content = JSON.stringify(tracks, null, 2);
        mimeType = "application/json";
      } else {
        // CSV format
        const headers = ["ID", "Titolo", "Artista", "Durata (sec)", "Genere", "URL"];
        const rows = tracks.map((t) => [
          t.id,
          `"${t.title.replace(/"/g, '""')}"`,
          `"${t.artist.replace(/"/g, '""')}"`,
          t.duration,
          `"${t.genre.replace(/"/g, '""')}"`,
          `"${t.url.replace(/"/g, '""')}"`
        ]);
        content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        mimeType = "text/csv";
      }
    } else {
      // Collab playlist
      filename = `beatfy_collaborative_playlist.${format}`;
      if (format === "json") {
        content = JSON.stringify(collabTracks, null, 2);
        mimeType = "application/json";
      } else {
        // CSV format
        const headers = ["ID", "Titolo", "Artista", "Voti", "Aggiunto Da", "Timestamp"];
        const rows = collabTracks.map((t) => [
          t.id,
          `"${t.title.replace(/"/g, '""')}"`,
          `"${t.artist.replace(/"/g, '""')}"`,
          t.votes,
          `"${t.addedBy.replace(/"/g, '""')}"`,
          new Date(t.timestamp).toISOString()
        ]);
        content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        mimeType = "text/csv";
      }
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Process natural voice assistant actions
  const handleProcessVoiceCommand = (commandAction: {
    action: string;
    targetType: string | null;
    targetName: string | null;
    feedbackMessage: string;
  }) => {
    const act = commandAction.action;
    const type = commandAction.targetType;
    const name = commandAction.targetName;

    if (act === "play") {
      if (type === "genre" && name) {
        const found = TRACK_CATALOGUE.find((t) => t.genre.toLowerCase().includes(name.toLowerCase()));
        if (found) {
          setCurrentTrack(found);
          setIsPlaying(true);
          audioRef.current?.play().catch(() => {});
        }
      } else if (type === "podcast" && name) {
        const found = TRACK_CATALOGUE.find((t) => t.isPodcast && t.artist.toLowerCase().includes(name.toLowerCase()));
        if (found) {
          setCurrentTrack(found);
          setIsPlaying(true);
          audioRef.current?.play().catch(() => {});
        }
      } else if (type === "radio" && name) {
        const found = TRACK_CATALOGUE.find((t) => t.isRadio);
        if (found) {
          setCurrentTrack(found);
          setIsPlaying(true);
          audioRef.current?.play().catch(() => {});
        }
      } else {
        togglePlay();
      }
    } else if (act === "pause") {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else if (act === "next") {
      handleNextTrack();
    } else if (act === "previous") {
      handlePrevTrack();
    } else if (act === "recommend") {
      setActiveTab("discover");
    }
  };

  // Helper formats
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Filter catalogue by search query
  const filteredCatalogue = TRACK_CATALOGUE.filter((track) => {
    if (offlineMode && (track.isRadio || track.isPodcast)) return false;
    const q = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(q) ||
      track.artist.toLowerCase().includes(q) ||
      track.genre.toLowerCase().includes(q)
    );
  });

  // Theme Accent and Tailwind Styles mapping
  const getThemeClass = () => {
    switch (theme) {
      case "cyber":
        return {
          bg: "bg-[#0b040a]",
          header: "bg-[#110610]/95 border-b border-pink-500/20",
          sidebar: "bg-[#140813] border-r border-pink-950/40",
          footer: "bg-[#0d040c] border-t border-pink-500/20",
          accentText: "text-pink-500",
          accentBg: "bg-pink-500",
          accentBorder: "border-pink-500/40",
          accentFill: "fill-pink-500",
          accentShadow: "shadow-pink-500/10",
          accentColor: "accent-pink-500",
        };
      case "space":
        return {
          bg: "bg-[#050510]",
          header: "bg-[#080816]/95 border-b border-purple-500/20",
          sidebar: "bg-[#0c0c20] border-r border-purple-950/40",
          footer: "bg-[#060613] border-t border-purple-500/20",
          accentText: "text-purple-500",
          accentBg: "bg-purple-500",
          accentBorder: "border-purple-500/40",
          accentFill: "fill-purple-500",
          accentShadow: "shadow-purple-500/10",
          accentColor: "accent-purple-500",
        };
      case "amber":
        return {
          bg: "bg-[#100b05]",
          header: "bg-[#181007]/95 border-b border-amber-500/20",
          sidebar: "bg-[#1d140b] border-r border-amber-950/40",
          footer: "bg-[#130d06] border-t border-amber-500/20",
          accentText: "text-amber-500",
          accentBg: "bg-amber-500",
          accentBorder: "border-amber-500/40",
          accentFill: "fill-amber-500",
          accentShadow: "shadow-amber-500/10",
          accentColor: "accent-amber-500",
        };
      case "green":
        return {
          bg: "bg-[#121212]",
          header: "bg-[#181818]/80 border-b border-neutral-800",
          sidebar: "bg-[#000000] border-r border-neutral-900",
          footer: "bg-[#181818] border-t border-neutral-800",
          accentText: "text-green-500",
          accentBg: "bg-green-500",
          accentBorder: "border-green-500/40",
          accentFill: "fill-green-500",
          accentShadow: "shadow-green-500/10",
          accentColor: "accent-green-500",
        };
      case "geometric":
      default: // Geometric Balance (Indigo)
        return {
          bg: "bg-[#050505]",
          header: "bg-[#0a0a0a] border-b border-neutral-800",
          sidebar: "bg-[#080808] border-r border-neutral-900",
          footer: "bg-[#0c0c0c] border-t border-neutral-800",
          accentText: "text-indigo-400",
          accentBg: "bg-indigo-500",
          accentBorder: "border-indigo-500/20",
          accentFill: "fill-indigo-500",
          accentShadow: "shadow-indigo-500/20",
          accentColor: "accent-indigo-500",
        };
    }
  };

  const themeStyles = getThemeClass();

  if (!isAuthenticated) {
    return <LoginGate onLogin={handleLogin} themeStyles={themeStyles} />;
  }

  return (
    <div className={`min-h-screen ${themeStyles.bg} text-white flex flex-col font-sans transition-colors duration-500 overflow-hidden`}>
      {/* Offline Mode Banner Warning */}
      {offlineMode && (
        <div className="bg-red-600/90 py-1.5 px-4 text-center text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-2 z-30">
          <CloudOff className="w-4 h-4" /> SEI OFFLINE - ASCOLTI SOLTANTO I BRANI SCARICATI LOCALMENTE
        </div>
      )}

      {/* Top Main Navigation Bar */}
      <header className={`h-16 ${themeStyles.header} px-6 flex justify-between items-center backdrop-blur-md z-40`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${themeStyles.accentBg} flex items-center justify-center shadow-lg ${themeStyles.accentShadow}`}>
              <Music className="w-4 h-4 text-black font-black" />
            </div>
            <span className="font-black text-xl tracking-tighter">Beatfy</span>
          </div>
        </div>

        {/* Searching Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cosa vuoi ascoltare? Brani, artisti, podcast..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-neutral-800 focus:border-neutral-700 rounded-full pl-10 pr-4 py-1.5 text-xs focus:outline-none transition"
          />
        </div>

        {/* User Badge, Notifications and Voice Assistant */}
        <div className="flex items-center gap-4">
          {/* Voice Search */}
          <VoiceAssistantButton
            onProcessCommand={handleProcessVoiceCommand}
            userName={userName}
            themeStyles={themeStyles}
          />

          {/* New Releases Notification system */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-2 rounded-full hover:bg-neutral-800 text-neutral-300 relative transition"
            >
              <Bell className="w-4.5 h-4.5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
            <AnimatePresence>
              {showNotifDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-0 mt-2.5 w-64 bg-[#1c1c1c] border border-neutral-800 rounded-xl p-3.5 shadow-2xl z-50 space-y-2.5"
                >
                  <span className="text-4xs font-bold text-neutral-400 uppercase tracking-wider block font-mono">Nuove Notifiche</span>
                  <div className="space-y-2">
                    {notifications.map((notif, index) => (
                      <p key={index} className="text-3xs text-neutral-200 leading-normal border-b border-neutral-800/60 pb-1.5 last:border-0 last:pb-0">
                        {notif}
                      </p>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Card & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-800/80 flex items-center justify-center text-black font-black font-mono text-sm shadow shrink-0">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-green-500 to-emerald-500 flex items-center justify-center text-black font-black font-mono text-sm">
                    {userName ? userName.charAt(0) : "U"}
                  </div>
                )}
              </div>
              <div className="hidden sm:block max-w-[110px]">
                <span className="text-2xs font-bold text-white block truncate">{userName}</span>
                <span className="text-4xs text-neutral-400 font-semibold uppercase flex items-center gap-0.5">
                  {premiumActive ? (
                    <>
                      <Crown className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" /> Premium
                    </>
                  ) : (
                    <button
                      onClick={() => setIsPremiumCheckoutOpen(true)}
                      className="text-yellow-400 font-bold hover:underline flex items-center gap-0.5 uppercase transition shrink-0"
                    >
                      <Crown className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0 animate-pulse" /> Upgrade - €9,99
                    </button>
                  )}
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-400 transition"
              title="Disconnetti"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <nav className={`fixed inset-y-16 left-0 w-64 ${themeStyles.sidebar} z-40 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 flex flex-col justify-between p-4`}>
          <div className="space-y-6">
            {/* Primary Nav tab links */}
            <div className="space-y-1">
              <span className="text-4xs font-bold text-neutral-500 uppercase tracking-widest px-3 block mb-2 font-mono">Navigazione</span>
              <button
                onClick={() => { setActiveTab("home"); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "home" ? `bg-neutral-800 text-white ${themeStyles.accentText}` : "text-neutral-400 hover:text-white"
                }`}
              >
                <Compass className="w-4.5 h-4.5" /> Esplora Home
              </button>
              <button
                onClick={() => { setActiveTab("discover"); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "discover" ? `bg-neutral-800 text-white ${themeStyles.accentText}` : "text-neutral-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-4.5 h-4.5" /> AI Discover Radar
              </button>
              <button
                onClick={() => { setActiveTab("podcasts"); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "podcasts" ? `bg-neutral-800 text-white ${themeStyles.accentText}` : "text-neutral-400 hover:text-white"
                }`}
              >
                <Radio className="w-4.5 h-4.5" /> Podcast Esclusivi
              </button>
              <button
                onClick={() => { setActiveTab("collab"); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "collab" ? `bg-neutral-800 text-white ${themeStyles.accentText}` : "text-neutral-400 hover:text-white"
                }`}
              >
                <Users className="w-4.5 h-4.5" /> Playlist Collab
              </button>
              <button
                onClick={() => { setActiveTab("widget"); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "widget" ? `bg-neutral-800 text-white ${themeStyles.accentText}` : "text-neutral-400 hover:text-white"
                }`}
              >
                <Layout className="w-4.5 h-4.5" /> Widget Schermata Home
              </button>
              <button
                onClick={() => { setActiveTab("analytics"); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "analytics" ? `bg-neutral-800 text-white ${themeStyles.accentText}` : "text-neutral-400 hover:text-white"
                }`}
              >
                <Flame className="w-4.5 h-4.5" /> Analisi Statistiche
              </button>
              <button
                onClick={() => { setActiveTab("developer"); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "developer" ? `bg-neutral-800 text-white ${themeStyles.accentText}` : "text-neutral-400 hover:text-white"
                }`}
              >
                <Code2 className="w-4.5 h-4.5" /> Developer API Docs
              </button>
              <button
                onClick={() => { setActiveTab("settings"); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "settings" ? `bg-neutral-800 text-white ${themeStyles.accentText}` : "text-neutral-400 hover:text-white"
                }`}
              >
                <Settings className="w-4.5 h-4.5" /> Impostazioni
              </button>
            </div>

            {/* Offline and Premium Fast Swappers */}
            <div className="space-y-3 pt-4 border-t border-neutral-800/60 px-3">
              <span className="text-4xs font-bold text-neutral-500 uppercase tracking-widest block font-mono">Opzioni Rapide</span>

              {/* Offline mode */}
              <div className="flex items-center justify-between">
                <span className="text-3xs text-neutral-300 font-bold">Ascolto Offline</span>
                <button
                  onClick={handleOfflineToggle}
                  className={`w-9 h-5 rounded-full p-0.5 transition ${
                    offlineMode ? "bg-red-500" : "bg-neutral-700"
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transform transition ${
                    offlineMode ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Premium toggle */}
              <div className="flex items-center justify-between">
                <span className="text-3xs text-neutral-300 font-bold">Piano Premium</span>
                <button
                  onClick={handlePremiumToggle}
                  className={`w-9 h-5 rounded-full p-0.5 transition ${
                    premiumActive ? "bg-green-500" : "bg-neutral-700"
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transform transition ${
                    premiumActive ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>
            </div>

            {/* Premium Promo Box in Sidebar */}
            {!premiumActive && (
              <div className="p-3 bg-gradient-to-tr from-yellow-400/5 to-amber-500/10 rounded-2xl border border-yellow-500/15 text-center space-y-2 mt-4 mx-3">
                <div className="flex items-center justify-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-[10px] font-extrabold text-yellow-400 tracking-tight uppercase">SBLOCCA PREMIUM</span>
                </div>
                <p className="text-[9px] text-neutral-400 leading-normal">
                  Sblocca l'equalizzatore Hi-Fi, i podcast esclusivi e l'audio FLAC a soli 9,99€!
                </p>
                <button
                  onClick={() => setIsPremiumCheckoutOpen(true)}
                  className="w-full py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-4xs font-black uppercase tracking-wider transition cursor-pointer"
                >
                  Attiva Ora (9,99€)
                </button>
              </div>
            )}
          </div>

          {/* Quick info footer */}
          <div className="p-3 bg-neutral-900/60 rounded-2xl border border-neutral-800/40 text-center space-y-1">
            <span className="text-4xs text-neutral-500 font-mono block">AUDIO ENGINE STATUS</span>
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
              <span className="text-2xs text-neutral-300">
                {offlineMode ? "Offline (Local)" : "Hi-Res Connected"}
              </span>
            </div>
          </div>
        </nav>

        {/* Content Panel Area */}
        <main className="flex-1 overflow-hidden p-6 md:pl-[17rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="h-full"
            >
              {/* Home explore page */}
              {activeTab === "home" && (
                <div className="space-y-6 h-full overflow-y-auto pr-1">
                  {/* Hero banner section */}
                  <div className={`p-8 rounded-2xl bg-gradient-to-tr ${
                    theme === "cyber"
                      ? "from-pink-900/40 to-black border-pink-500/15"
                      : theme === "space"
                      ? "from-purple-900/40 to-black border-purple-500/15"
                      : theme === "amber"
                      ? "from-amber-900/40 to-black border-amber-500/15"
                      : "from-green-900/40 to-black border-green-500/15"
                  } border shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6`}>
                    <div className="space-y-4 max-w-lg">
                      <span className="text-4xs font-bold uppercase tracking-widest text-green-400 font-mono flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> CANZONI AI SUGGERITE
                      </span>
                      <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none">
                        Trova la tua sintonia acustica quotidiana su Beatfy
                      </h1>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        Interroga l'algoritmo di raccomandazione dell'intelligenza artificiale per sbloccare sonorità inedite ad alta fedeltà.
                      </p>
                      <button
                        onClick={() => setActiveTab("discover")}
                        className={`font-black text-xs px-5 py-2.5 rounded-full ${themeStyles.accentBg} text-black font-bold uppercase tracking-wider transition hover:scale-105 shadow-md`}
                      >
                        Avvia Discover AI
                      </button>
                    </div>
                    {/* Visual mockup / abstract decorative */}
                    <div className="w-40 h-40 bg-black/40 rounded-full border border-neutral-800 flex items-center justify-center relative shadow-inner">
                      <div className="absolute inset-4 rounded-full border border-dashed border-neutral-800 animate-spin" />
                      <Music className={`w-12 h-12 ${themeStyles.accentText} animate-pulse`} />
                    </div>
                  </div>

                  {/* Built-in Tracks List Grid */}
                  <div className="space-y-4">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block font-mono">
                      {offlineMode ? "Brani Scaricati Offline" : "Tendenza su Beatfy"}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredCatalogue.slice(0, 6).map((track) => {
                        const isCurrent = track.id === currentTrack.id;
                        const liked = likedSongs.includes(track.id);
                        return (
                          <div
                            key={track.id}
                            className={`p-3 rounded-xl border flex items-center justify-between group transition ${
                              isCurrent
                                ? "bg-neutral-900 border-neutral-700"
                                : "bg-[#181818]/60 border-neutral-800/80 hover:border-neutral-700/60"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                onClick={() => {
                                  setCurrentTrack(track);
                                  if (!isPlaying) togglePlay();
                                }}
                                className={`w-10 h-10 rounded-lg bg-[#222] flex items-center justify-center relative shrink-0 transition ${
                                  isCurrent ? `${themeStyles.accentText}` : "text-neutral-400 group-hover:text-white"
                                }`}
                              >
                                {isCurrent && isPlaying ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4 fill-current" />
                                )}
                              </button>
                              <div className="min-w-0">
                                <span className={`font-bold text-xs block truncate ${isCurrent ? themeStyles.accentText : "text-white"}`}>
                                  {track.title}
                                </span>
                                <span className="text-3xs text-neutral-400 block truncate">
                                  {track.artist}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleLikeSong(track.id)}
                                className={`p-1.5 rounded-full hover:bg-neutral-800 transition ${
                                  liked ? "text-red-500" : "text-neutral-500 hover:text-neutral-300"
                                }`}
                              >
                                <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
                              </button>
                              <span className="text-4xs font-mono text-neutral-500">
                                {formatTime(track.duration)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Radio Stations */}
                  {!offlineMode && (
                    <div className="space-y-4">
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block font-mono">
                        Le tue Stazioni Radio Personalizzate
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {TRACK_CATALOGUE.filter((t) => t.isRadio).map((station) => (
                          <div
                            key={station.id}
                            className="p-5 rounded-2xl bg-gradient-to-tr from-neutral-900 to-[#181818] border border-neutral-800/60 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
                                <Radio className="w-5 h-5 animate-pulse" />
                              </div>
                              <div>
                                <span className="font-bold text-sm text-white block">
                                  {station.title}
                                </span>
                                <span className="text-2xs text-neutral-400 block">
                                  Sintonizzazione automatica basata sulla cronologia
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setCurrentTrack(station);
                                if (!isPlaying) togglePlay();
                              }}
                              className={`p-3 rounded-full hover:scale-105 transition ${
                                station.id === currentTrack.id && isPlaying
                                  ? "bg-neutral-800 text-green-500"
                                  : "bg-green-500 text-black"
                              }`}
                            >
                              {station.id === currentTrack.id && isPlaying ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4 fill-current" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI recommendation panel */}
              {activeTab === "discover" && (
                <AIPromptModal
                  onPlayRecommendation={(title, artist) => {
                    // Create simulated recommendation track URL
                    const newTrack: Track = {
                      id: `rec-${Date.now()}`,
                      title,
                      artist,
                      duration: 210,
                      genre: "Discovery",
                      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
                    };
                    setPlaybackQueue((prev) => [newTrack, ...prev]);
                    setCurrentTrack(newTrack);
                    setIsPlaying(true);
                    audioRef.current?.play().catch(() => {});
                  }}
                  offlineMode={offlineMode}
                  history={recentHistory}
                  themeStyles={themeStyles}
                />
              )}

              {/* Podcasts List Tab */}
              {activeTab === "podcasts" && (
                <div className="space-y-6 h-full overflow-y-auto pr-1">
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">Podcast Esclusivi Beatfy</h2>
                    <p className="text-xs text-neutral-400">Episodi originali e riflessioni sul futuro, riservati per gli utenti Premium.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {TRACK_CATALOGUE.filter((t) => t.isPodcast).map((pod) => {
                      const isCurrent = pod.id === currentTrack.id;
                      return (
                        <div
                          key={pod.id}
                          className={`p-5 rounded-2xl border flex flex-col justify-between transition h-56 ${
                            isCurrent
                              ? "bg-neutral-900 border-neutral-700"
                              : "bg-[#181818]/60 border-neutral-800/80 hover:border-neutral-700/60"
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-4xs font-bold text-green-500 uppercase tracking-widest font-mono">PODCAST ORIGINALE</span>
                              <span className="text-4xs font-mono text-neutral-500">{formatTime(pod.duration)}</span>
                            </div>
                            <h3 className={`font-black text-sm block ${isCurrent ? themeStyles.accentText : "text-white"}`}>
                              {pod.title}
                            </h3>
                            <span className="text-3xs text-neutral-400 block mb-3">{pod.artist}</span>
                            <p className="text-2xs text-neutral-400 leading-relaxed line-clamp-3">
                              {pod.description}
                            </p>
                          </div>

                          <div className="flex justify-between items-center mt-4 pt-3 border-t border-neutral-800/60">
                            <span className="text-5xs font-mono text-neutral-500 uppercase">STREAM HIGH FIDELITY</span>
                            <button
                              onClick={() => {
                                if (!premiumActive) {
                                  setIsPremiumCheckoutOpen(true);
                                  return;
                                }
                                if (offlineMode) {
                                  alert("I podcast non sono disponibili in modalità Offline.");
                                  return;
                                }
                                setCurrentTrack(pod);
                                if (!isPlaying) togglePlay();
                              }}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-2xs font-bold uppercase tracking-wider transition ${
                                !premiumActive
                                  ? "bg-neutral-800 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-400/10"
                                  : isCurrent && isPlaying
                                    ? "bg-neutral-800 text-green-500"
                                    : "bg-white text-black hover:bg-neutral-200"
                              }`}
                            >
                              {!premiumActive ? (
                                <>
                                  <Crown className="w-3.5 h-3.5 fill-yellow-400 shrink-0" /> Sblocca - €9,99
                                </>
                              ) : isCurrent && isPlaying ? (
                                <>
                                  <Pause className="w-3.5 h-3.5" /> In Ascolto
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5 fill-current" /> Ascolta Ora
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Collaborative Playlists */}
              {activeTab === "collab" && (
                <PlaylistCollabSection
                  tracks={collabTracks}
                  messages={collabMessages}
                  onAddTrack={handleCollabAddTrack}
                  onVoteTrack={handleCollabVoteTrack}
                  onSendMessage={handleCollabSendMessage}
                  userName={userName}
                  themeStyles={themeStyles}
                  onExport={(format) => handleExportPlaylist("collab", format)}
                  onPlayTrack={(title, artist) => {
                    const newTrack: Track = {
                      id: `collab-p-${Date.now()}`,
                      title,
                      artist,
                      duration: 240,
                      genre: "Collab",
                      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                    };
                    setCurrentTrack(newTrack);
                    setIsPlaying(true);
                    audioRef.current?.play().catch(() => {});
                  }}
                />
              )}

              {/* Home widget customizable designer */}
              {activeTab === "widget" && <WidgetCustomizer currentTrack={currentTrack} />}

              {/* Analytics dashboard */}
              {activeTab === "analytics" && (
                <AnalyticsDashboard
                  userName={userName}
                  premiumActive={premiumActive}
                  onUpgrade={() => setIsPremiumCheckoutOpen(true)}
                />
              )}

              {/* Developer APIs */}
              {activeTab === "developer" && <DeveloperApiDocs />}

              {/* System Settings */}
              {activeTab === "settings" && (
                <div className="bg-[#121212]/90 border border-neutral-800/80 rounded-2xl p-6 h-full space-y-6 overflow-y-auto pr-1">
                  <div className="border-b border-neutral-800 pb-3">
                    <h2 className="text-lg font-bold text-white tracking-tight">Impostazioni Applicazione</h2>
                    <p className="text-xs text-neutral-400">Personalizza il tuo client Beatfy e i moduli audio</p>
                  </div>

                  {/* Profile Edit */}
                  <div className="space-y-3.5 p-4 bg-[#181818]/60 border border-neutral-800/60 rounded-xl">
                    <span className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider block">
                      Profilo Utente
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-3xs font-bold text-neutral-400 uppercase block mb-1.5">Nome Utente</label>
                        <input
                          type="text"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          className="w-full bg-[#111] border border-neutral-800 focus:border-green-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Theme Selectors */}
                  <div className="space-y-4 p-4 bg-[#181818]/60 border border-neutral-800/60 rounded-xl">
                    <span className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider block">
                      Temi Dinamici d'Interfaccia
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: "geometric", label: "Geometric Balance", color: "bg-indigo-500" },
                        { id: "green", label: "Beatfy Green", color: "bg-green-500" },
                        { id: "cyber", label: "Cyber Neon", color: "bg-pink-500" },
                        { id: "space", label: "Cosmic Purple", color: "bg-purple-500" },
                        { id: "amber", label: "Amber Fusion", color: "bg-amber-500" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id as any)}
                          className={`p-4 rounded-xl border text-left flex flex-col gap-2.5 transition ${
                            theme === t.id
                              ? "bg-white/5 border-neutral-700 text-white"
                              : "bg-[#181818] border-neutral-800/80 text-neutral-400 hover:border-neutral-700"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full ${t.color} shadow`} />
                          <span className="text-xs font-bold text-white block">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Crossfade Transition Settings */}
                  <div className="space-y-4 p-4 bg-[#181818]/60 border border-neutral-800/60 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider block">
                          Transizioni Dissolvenza (Crossfade)
                        </span>
                        <p className="text-3xs text-neutral-400 mt-0.5">
                          Sfuma e mixa i brani in modo fluido prima del termine della riproduzione per evitare pause silenziose.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setCrossfadeEnabled(!crossfadeEnabled);
                          if (!crossfadeEnabled) setAutoMixEnabled(false);
                        }}
                        className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 cursor-pointer ${
                          crossfadeEnabled ? themeStyles.accentBg : "bg-neutral-700"
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transform transition ${
                          crossfadeEnabled ? "translate-x-4" : "translate-x-0"
                        }`} />
                      </button>
                    </div>

                    {crossfadeEnabled && (
                      <div className="space-y-2 pt-2 border-t border-neutral-800/40">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-3xs font-bold text-neutral-300 uppercase">Durata Dissolvenza</span>
                          <span className={`font-mono font-bold ${themeStyles.accentText}`}>{crossfadeDuration} secondi</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="12"
                          value={crossfadeDuration}
                          onChange={(e) => setCrossfadeDuration(parseInt(e.target.value))}
                          className={`w-full ${themeStyles.accentColor} h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer`}
                        />
                        <div className="flex justify-between text-4xs text-neutral-500 font-mono">
                          <span>2 SECONDI</span>
                          <span>12 SECONDI</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Auto-Mix Transition Settings */}
                  <div className="space-y-4 p-4 bg-[#181818]/60 border border-neutral-800/60 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider block">
                          Modalità Auto-Mix Intelligente
                        </span>
                        <p className="text-3xs text-neutral-400 mt-0.5">
                          Sincronizza automaticamente la velocità e i battiti (BPM) del brano in entrata con quello attivo per una transizione da DJ professionista.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setAutoMixEnabled(!autoMixEnabled);
                          if (!autoMixEnabled) setCrossfadeEnabled(false);
                        }}
                        className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 cursor-pointer ${
                          autoMixEnabled ? themeStyles.accentBg : "bg-neutral-700"
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transform transition ${
                          autoMixEnabled ? "translate-x-4" : "translate-x-0"
                        }`} />
                      </button>
                    </div>

                    {autoMixEnabled && (
                      <div className="pt-2 border-t border-neutral-800/40 flex justify-between items-center">
                        <span className="text-3xs font-bold text-neutral-300 uppercase">Apri console DJ di monitoraggio</span>
                        <button
                          onClick={() => setIsAutoMixOpen(true)}
                          className={`px-3 py-1.5 text-3xs font-black rounded-lg transition border ${themeStyles.accentBorder} ${themeStyles.accentText} bg-white/5 hover:bg-white/10`}
                        >
                          APRI CONSOLE MIX
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Playlist & Data Export Section */}
                  <div className="space-y-4 p-4 bg-[#181818]/60 border border-neutral-800/60 rounded-xl">
                    <div>
                      <span className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider block">
                        Esportazione Playlist e Dati Locali
                      </span>
                      <p className="text-3xs text-neutral-400 mt-0.5">
                        Salva una copia locale in formato JSON o CSV dei tuoi brani selezionati e dei meta-data delle tue playlist preferite e collaborative.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {/* Liked songs export */}
                      <div className="bg-[#121212]/80 border border-neutral-800 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            I Miei Preferiti ({likedSongs.length})
                          </h4>
                          <p className="text-4xs text-neutral-400 font-medium mt-1 uppercase tracking-wider font-mono">
                            LISTA BRANI LIKED SONGS
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled={likedSongs.length === 0}
                            onClick={() => handleExportPlaylist("liked", "json")}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-neutral-200 border border-neutral-800 hover:border-neutral-700 disabled:opacity-40 disabled:pointer-events-none py-2 px-3 rounded-lg text-2xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> JSON
                          </button>
                          <button
                            disabled={likedSongs.length === 0}
                            onClick={() => handleExportPlaylist("liked", "csv")}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-neutral-200 border border-neutral-800 hover:border-neutral-700 disabled:opacity-40 disabled:pointer-events-none py-2 px-3 rounded-lg text-2xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> CSV
                          </button>
                        </div>
                      </div>

                      {/* Collaborative songs export */}
                      <div className="bg-[#121212]/80 border border-neutral-800 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${themeStyles.accentBg} animate-pulse`} />
                            Playlist Collaborativa ({collabTracks.length})
                          </h4>
                          <p className="text-4xs text-neutral-400 font-medium mt-1 uppercase tracking-wider font-mono">
                            LIVE COLLAB ROOM METADATA
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled={collabTracks.length === 0}
                            onClick={() => handleExportPlaylist("collab", "json")}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-neutral-200 border border-neutral-800 hover:border-neutral-700 disabled:opacity-40 disabled:pointer-events-none py-2 px-3 rounded-lg text-2xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> JSON
                          </button>
                          <button
                            disabled={collabTracks.length === 0}
                            onClick={() => handleExportPlaylist("collab", "csv")}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-neutral-200 border border-neutral-800 hover:border-neutral-700 disabled:opacity-40 disabled:pointer-events-none py-2 px-3 rounded-lg text-2xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> CSV
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* High Fidelity information block */}
                  <div className="bg-gradient-to-tr from-[#1b251d] to-[#121212] border border-green-500/10 p-5 rounded-xl space-y-2">
                    <span className="text-3xs font-bold text-green-500 uppercase tracking-widest font-mono block">AUDIO ENHANCED HIGH FIDELITY (Hi-Fi)</span>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      L'ascolto Hi-Fi di Beatfy esegue uno streaming audio codificato fino a 24-bit/96kHz. Il nostro Equalizzatore integrato e la simulazione acustica 3D utilizzano le funzionalità native dell'API Web Audio per minimizzare i rumori di picco e garantire una timbrica impeccabile sul tuo impianto audio.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Main bottom Music Player Bar */}
      <footer className={`h-24 ${themeStyles.footer} px-6 flex items-center justify-between z-40 relative`}>
        {/* Playback visualizer canvas left aligned (decorational / active feedback) */}
        <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden">
          <canvas
            ref={visualizerCanvasRef}
            className="w-full h-1 opacity-70"
            width={1200}
            height={4}
          />
        </div>

        {/* Current Track Detail Left */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-[200px]">
          <div className="w-14 h-14 rounded-lg bg-gradient-to-tr from-neutral-800 to-neutral-900 flex items-center justify-center shrink-0 border border-neutral-800 relative overflow-hidden">
            <Music className="w-6 h-6 text-neutral-500" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-bold text-sm text-white block truncate hover:underline cursor-pointer">
              {currentTrack.title}
            </span>
            <span className="text-xs text-neutral-400 block truncate">
              {currentTrack.artist}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-300 text-[10px] font-bold font-mono">
                <span className="relative flex h-2 w-2">
                  <span 
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${themeStyles.accentBg}`}
                    style={{ animationDuration: `${60 / (getTrackBPM(currentTrack.id) * playbackRate)}s` }}
                  />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${themeStyles.accentBg}`} />
                </span>
                <span>{Math.round(getTrackBPM(currentTrack.id) * playbackRate)} BPM</span>
              </span>
            </div>
          </div>
          <button
            onClick={() => handleLikeSong(currentTrack.id)}
            className={`p-1.5 rounded-full transition shrink-0 ${
              likedSongs.includes(currentTrack.id) ? "text-red-500" : "text-neutral-500 hover:text-white"
            }`}
          >
            <Heart className={`w-4 h-4 ${likedSongs.includes(currentTrack.id) ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* Central Audio Play Controllers */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-xl">
          <div className="flex items-center gap-5">
            <button
              onClick={handlePrevTrack}
              className="text-neutral-400 hover:text-white transition"
              title="Precedente"
            >
              <SkipBack className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={togglePlay}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition scale-100 hover:scale-105 ${themeStyles.accentBg} text-black font-black shadow`}
              title={isPlaying ? "Pausa" : "Riproduci"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
            <button
              onClick={handleNextTrack}
              className="text-neutral-400 hover:text-white transition"
              title="Successiva"
            >
              <SkipForward className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Range Slider for Music Progress */}
          <div className="flex items-center gap-3 w-full text-xs font-mono text-neutral-400">
            <span>{formatTime(currentTime)}</span>
            <div className="flex-1 relative flex items-center">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCurrentTime(val);
                  if (audioRef.current) {
                    audioRef.current.currentTime = val;
                  }
                }}
                className={`w-full ${themeStyles.accentColor} h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer`}
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right audio tools / casting / EQ / volume controls */}
        <div className="flex items-center justify-end gap-3.5 w-1/4 min-w-[200px]">
          {/* Smart home Cast button */}
          <button
            onClick={() => {
              fetchDevices();
              setIsCastOpen(true);
            }}
            className={`p-2 rounded-lg transition ${
              activeDeviceId !== "web-client-1" ? `${themeStyles.accentText} bg-white/5` : "text-neutral-400 hover:text-white"
            }`}
            title="Sincronizza Dispositivi"
          >
            <Tv className="w-4.5 h-4.5" />
          </button>

          {/* Equalizer triggers */}
          <button
            onClick={() => {
              if (!premiumActive) {
                setIsPremiumCheckoutOpen(true);
              } else {
                setIsEqOpen(true);
              }
            }}
            className={`p-2 rounded-lg transition relative ${
              !premiumActive ? "text-yellow-400/80 hover:text-yellow-400 hover:bg-yellow-400/5" : "text-neutral-400 hover:text-white"
            }`}
            title={premiumActive ? "Equalizzatore audio" : "Equalizzatore (Richiede Premium)"}
          >
            <Sliders className="w-4.5 h-4.5" />
            {!premiumActive && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full flex items-center justify-center border border-[#050508]" />
            )}
          </button>

          {/* Lyrics Button */}
          <button
            onClick={() => setIsLyricsOpen(true)}
            className={`p-2 rounded-lg transition ${
              isLyricsOpen ? `${themeStyles.accentText} bg-white/5` : "text-neutral-400 hover:text-white"
            }`}
            title="Mostra testi sincronizzati"
          >
            <Mic className="w-4.5 h-4.5" />
          </button>

          {/* Auto-Mix Button */}
          {autoMixEnabled && (
            <button
              onClick={() => setIsAutoMixOpen(true)}
              className={`p-2 rounded-lg transition ${
                isAutoMixOpen ? `${themeStyles.accentText} bg-white/5` : "text-neutral-400 hover:text-white"
              }`}
              title="Console Auto-Mix"
            >
              <Sparkles className="w-4.5 h-4.5 animate-pulse" />
            </button>
          )}

          {/* Volume bars */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-neutral-400 hover:text-white transition"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseInt(e.target.value));
                setIsMuted(false);
              }}
              className={`w-16 sm:w-24 ${themeStyles.accentColor} h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer`}
            />
          </div>
        </div>
      </footer>

      {/* Modals & Popups Overlays */}
      <EqualizerModal
        isOpen={isEqOpen}
        onClose={() => setIsEqOpen(false)}
        gains={eqGains}
        onGainChange={handleEqGainChange}
        spatialAudio={spatialAudio}
        onSpatialToggle={() => setSpatialAudio(!spatialAudio)}
        bassBoost={bassBoost}
        onBassToggle={() => setBassBoost(!bassBoost)}
        themeStyles={themeStyles}
      />

      <CastModal
        isOpen={isCastOpen}
        onClose={() => setIsCastOpen(false)}
        devices={devices}
        activeDeviceId={activeDeviceId}
        onSelectDevice={handleSelectDevice}
        onRefresh={fetchDevices}
        currentSongTitle={currentTrack.title}
      />

      <LyricsModal
        isOpen={isLyricsOpen}
        onClose={() => setIsLyricsOpen(false)}
        currentTrack={currentTrack}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onSeek={handleSeek}
        onNextTrack={handleNextTrack}
        onPrevTrack={handlePrevTrack}
        themeStyles={themeStyles}
      />

      <AutoMixConsole
        isOpen={isAutoMixOpen}
        onClose={() => setIsAutoMixOpen(false)}
        currentTrack={currentTrack}
        nextTrack={(() => {
          const currentIndex = playbackQueue.findIndex((t) => t.id === currentTrack.id);
          if (currentIndex !== -1 && currentIndex < playbackQueue.length - 1) {
            return playbackQueue[currentIndex + 1];
          }
          return playbackQueue[0];
        })()}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        autoMixEnabled={autoMixEnabled}
        onToggleAutoMix={() => {
          setAutoMixEnabled(!autoMixEnabled);
          if (!autoMixEnabled) setCrossfadeEnabled(false);
        }}
        playbackRate={playbackRate}
        themeStyles={themeStyles}
      />

      <PremiumCheckoutModal
        isOpen={isPremiumCheckoutOpen}
        onClose={() => setIsPremiumCheckoutOpen(false)}
        onSuccess={() => {
          setPremiumActive(true);
          localStorage.setItem("beatfy_premium_active", "true");
        }}
        themeStyles={themeStyles}
      />
    </div>
  );
}
