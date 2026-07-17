export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  genre: string;
  url: string;
  isPodcast?: boolean;
  isRadio?: boolean;
  description?: string;
}

export interface SyncDevice {
  deviceId: string;
  deviceName: string;
  deviceType: "mobile" | "desktop" | "speaker" | "tv" | "watch";
  songId: string;
  isPlaying: boolean;
  progress: number;
  lastUpdated: number;
}

export interface CollabTrack {
  id: string;
  title: string;
  artist: string;
  votes: number;
  addedBy: string;
  timestamp: number;
}

export interface CollabMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
}

export interface Recommendation {
  id: string;
  title: string;
  artist: string;
  genre: string;
  justification: string;
}

export interface ExternalImportResult {
  success: boolean;
  service: string;
  importedCount: number;
  tracks: Array<{ title: string; artist: string; genre: string }>;
  message: string;
}

export interface DeveloperEndpoint {
  path: string;
  method: string;
  description: string;
  sampleResponse: Record<string, any>;
}

export type ThemeType = "green" | "cyber" | "space" | "amber";

export interface CustomWidgetConfig {
  size: "small" | "medium" | "large";
  themeColor: string;
  showVisualizer: boolean;
  showQueue: boolean;
  borderRadius: string;
}
