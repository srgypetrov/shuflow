import type { Album, Artist, SimplifiedPlaylist, Track } from '@spotify/web-api-ts-sdk'

export interface SpotifyUserData {
	artists: Artist[]
	albums: Album[]
	playlists: SimplifiedPlaylist[]
	tracks: Track[]
}
