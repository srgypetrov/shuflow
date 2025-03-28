<script lang="ts">
	import { onMount } from 'svelte'

	import { goto } from '$app/navigation'

	import { LibraryManager } from '$lib/manager.svelte'
	import Player from '$lib/player.svelte'
	import { Queue } from '$lib/queue'
	import { spotify } from '$lib/spotify/auth'

	let manager = new LibraryManager()
	let queue = new Queue(manager)

	onMount(async () => {
		if (!(await spotify.getAccessToken())) {
			goto('/login')
			return
		}
		await manager.sync()
	})

	function logout() {
		spotify.logOut()
		goto('/login')
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

		<div class="flex min-h-screen items-center justify-center">
			<Player {queue} />
		</div>

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
