<script lang="ts">
	import type { AccessToken } from '@spotify/web-api-ts-sdk'
	import { onMount } from 'svelte'

	import { goto } from '$app/navigation'

	import Player from '$lib/player.svelte'
	import { spotify } from '$lib/spotify/auth'
	import type { SpotifyUserData } from '$lib/types/spotify'

	let userData: SpotifyUserData | null = $state(null)
	let token: AccessToken | null = $state(null)
	let currentTrackUri: string | null = $state(null)

	onMount(async () => {
		token = await spotify.getAccessToken()
		if (!token) {
			goto('/login')
			return
		}

		const savedData = localStorage.getItem('spotifyUserData')
		if (savedData) {
			userData = JSON.parse(savedData)
			return
		}

		const [tracksRes, playlistsRes, albumsRes, artistsRes] = await Promise.all([
			spotify.currentUser.tracks.savedTracks(),
			spotify.currentUser.playlists.playlists(),
			spotify.currentUser.albums.savedAlbums(),
			spotify.currentUser.followedArtists()
		])

		userData = {
			tracks: tracksRes.items.map((item) => item.track),
			playlists: playlistsRes.items.map((item) => item),
			albums: albumsRes.items.map((item) => item.album),
			artists: artistsRes.artists.items.map((item) => item)
		}

		localStorage.setItem('spotifyUserData', JSON.stringify(userData))
	})

	function logout() {
		spotify.logOut()
		localStorage.removeItem('spotifyUserData')
		goto('/login')
	}

	function handleTrackSelect(uri: string) {
		currentTrackUri = uri
	}
</script>

{#if userData}
	<main class="container mx-auto p-4">
		<div class="mb-4 flex justify-end">
			<button
				class="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
				onpointerdown={logout}
			>
				Выйти
			</button>
		</div>

		{#if token}
			<div class="flex min-h-screen items-center justify-center">
				<Player accessToken={token} trackUri={currentTrackUri} />
			</div>
		{/if}

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="rounded border p-4 shadow">
				<h2 class="mb-4 text-xl font-bold">Любимые треки</h2>
				<ul>
					{#each userData.tracks as track}
						<li class="mb-2">
							<button type="button" onpointerdown={() => handleTrackSelect(track.uri)}>
								{track.name} - {track.artists.map((a) => a.name).join(', ')}
							</button>
						</li>
					{/each}
				</ul>
			</div>

			<div class="rounded border p-4 shadow">
				<h2 class="mb-4 text-xl font-bold">Плейлисты</h2>
				<ul>
					{#each userData.playlists as playlist}
						<li class="mb-2">{playlist.name} ({playlist.tracks?.total} треков)</li>
					{/each}
				</ul>
			</div>

			<div class="rounded border p-4 shadow">
				<h2 class="mb-4 text-xl font-bold">Сохраненные альбомы</h2>
				<ul>
					{#each userData.albums as album}
						<li class="mb-2">{album.name} - {album.artists.map((a) => a.name).join(', ')}</li>
					{/each}
				</ul>
			</div>

			<div class="rounded border p-4 shadow">
				<h2 class="mb-4 text-xl font-bold">Отслеживаемые артисты</h2>
				<ul>
					{#each userData.artists as artist}
						<li class="mb-2">{artist.name}</li>
					{/each}
				</ul>
			</div>
		</div>
	</main>
{/if}
