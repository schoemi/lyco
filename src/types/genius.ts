export interface GeniusSearchResult {
  id: number;
  title: string;
  artist: string;
  url: string;
  albumArt: string | null;
}

export interface GeniusSearchRequest {
  query: string;
}

export interface GeniusImportRequest {
  geniusId: number;
  title: string;
  artist: string;
  geniusUrl: string;
  albumArt?: string;
}
