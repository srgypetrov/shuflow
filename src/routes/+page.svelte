<script lang="ts">
	import type { AccessToken } from '@spotify/web-api-ts-sdk'
	import { onMount } from 'svelte'

	import { goto } from '$app/navigation'

	import { LibraryManager } from '$lib/manager.svelte'
	import Player from '$lib/player.svelte'
	import { Queue } from '$lib/queue'
	import { spotify } from '$lib/spotify/auth'

	let accessToken: AccessToken | null = $state(null)
	let pageTitle: string | null = $state(null)

	let manager = new LibraryManager()
	let queue = new Queue(manager)

	onMount(async () => {
		accessToken = await spotify.getAccessToken()
		if (!accessToken) {
			goto('/login')
			return
		}
		manager.sync()
	})

	async function logout() {
		await Promise.all([queue.stop(), manager.stop()])
		accessToken = null
		spotify.logOut()
		goto('/login')
	}
</script>

<svelte:head>
	<title>{pageTitle ?? 'Shuflow • Shuffle Your Favorite Music'}</title>
</svelte:head>

{#if accessToken}
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
			<Player {accessToken} {queue} bind:pageTitle />
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="rounded border p-4 shadow">
				<ul>
					<li class="mb-2">Albums: {manager.counts.albums}</li>
					<li class="mb-2">Artists: {manager.counts.artists}</li>
					<li class="mb-2">Playlists: {manager.counts.playlists}</li>
					<li class="mb-2">Tracks: {manager.counts.tracks}</li>
				</ul>
			</div>
		</div>
	</main>
{/if}
