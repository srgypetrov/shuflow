<script lang="ts">
	import type { AccessToken } from '@spotify/web-api-ts-sdk'
	import { onMount } from 'svelte'

	import { goto } from '$app/navigation'

	import { LibraryManager } from '$lib/manager.svelte'
	import Player from '$lib/player.svelte'
	import { spotify } from '$lib/spotify/auth'

	let manager: LibraryManager = new LibraryManager(spotify)
	let token: AccessToken | null = $state(null)
	let currentTrackUri: string | null = $state(null)

	onMount(async () => {
		token = await spotify.getAccessToken()
		if (!token) {
			goto('/login')
			return
		}
		await manager.sync()
	})

	function logout() {
		spotify.logOut()
		goto('/login')
	}

	function handleTrackSelect(uri: string) {
		currentTrackUri = uri
	}
</script>

{#if manager}
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
				<ul>
					<li class="mb-2">Albums: {manager.albumsCount.value}</li>
					<li class="mb-2">Artists: {manager.artistsCount.value}</li>
					<li class="mb-2">Playlists: {manager.playlistsCount.value}</li>
					<li class="mb-2">Tracks: {manager.tracksCount.value}</li>
				</ul>
			</div>
		</div>
	</main>
{/if}
