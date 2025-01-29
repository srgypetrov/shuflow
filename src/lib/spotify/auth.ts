import { SpotifyApi } from '@spotify/web-api-ts-sdk'

export const spotify = SpotifyApi.withUserAuthorization(
	import.meta.env.VITE_CLIENT_ID,
	import.meta.env.VITE_REDIRECT_URI,
	[
		'playlist-read-private',
		'streaming',
		'user-follow-read',
		'user-library-read',
		'user-read-email',
		'user-read-private'
	]
)
