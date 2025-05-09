<script lang="ts">
	import { onMount } from 'svelte'

	import { goto } from '$app/navigation'

	import Background from '$lib/components/background.svelte'
	import Menu from '$lib/components/menu.svelte'
	import Player from '$lib/components/player.svelte'
	import { LibraryManager } from '$lib/manager.svelte'
	import { Queue } from '$lib/queue'
	import { spotify } from '$lib/spotify'

	let authenticated = $state(false)
	let colors = $state(['#22304E', '#3E526E', '#000000'])
	let pageTitle: string | null = $state(null)

	let manager = new LibraryManager()
	let queue = new Queue(manager)

	onMount(async () => {
		if (!(await manager.exists())) {
			goto('/login')
			return
		}
		authenticated = (await spotify.authenticate()).authenticated
		manager.sync()
	})

	async function logout() {
		await Promise.all([queue.stop(), manager.stop()])
		await manager.delete()
		spotify.logOut()
		goto('/login')
	}
</script>

<svelte:head>
	<title>{pageTitle ?? 'Shuflow • Your Favorites on Shuffle'}</title>
</svelte:head>

{#if authenticated}
	<div class="relative h-full min-h-screen font-sans text-gray-100 antialiased">
		<Background {colors} />
		<div class="relative z-0 mx-auto flex min-h-screen max-w-2xl flex-col space-y-6 p-4">
			<header class="flex items-center justify-between">
				<div class="flex items-center gap-1">
					<svg class="size-8 opacity-90" viewBox="26 13 68 94">
						<rect width="16" height="60" x="28" y="30" fill="#E5E7EB" rx="3" />
						<rect width="16" height="90" x="52" y="15" fill="#D1D5DB" rx="3" />
						<rect width="16" height="30" x="76" y="45" fill="#E5E7EB" rx="3" />
					</svg>
					<h1 class="text-xl font-light tracking-wider opacity-100">SHUFLOW</h1>
				</div>
				<Menu {logout} {colors} />
			</header>

			<Player {queue} bind:pageTitle bind:colors />

			<div class="!mt-0 py-1 text-center text-xs opacity-85">
				{manager.counts.tracks}
				{manager.counts.tracks === 1 ? 'track' : 'tracks'} • {manager.counts.albums}
				{manager.counts.albums === 1 ? 'album' : 'albums'} • {manager.counts.playlists}
				{manager.counts.playlists === 1 ? 'playlist' : 'playlists'} • {manager.counts.artists}
				{manager.counts.artists === 1 ? 'artist' : 'artists'}
			</div>
		</div>
	</div>
{/if}
