declare module "genius-lyrics-api" {
  interface SearchSongOptions {
    apiKey: string;
    title: string;
    artist?: string;
    optimizeQuery?: boolean;
    authHeader?: boolean;
  }

  interface SearchResult {
    id: number;
    title: string;
    url: string;
    albumArt: string;
  }

  interface Song {
    id: number;
    title: string;
    url: string;
    lyrics: string;
    albumArt: string;
  }

  export function searchSong(
    options: SearchSongOptions
  ): Promise<SearchResult[] | null>;

  export function getLyrics(options: SearchSongOptions | string): Promise<string | null>;

  export function getSong(options: SearchSongOptions): Promise<Song | null>;

  export function getAlbumArt(options: SearchSongOptions): Promise<string | null>;

  export function getSongById(
    id: number | string,
    accessToken: string
  ): Promise<Song | null>;
}
