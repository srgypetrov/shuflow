<script lang="ts">
	import type { AccessToken } from '@spotify/web-api-ts-sdk'
	import { onMount, tick } from 'svelte'

	import { goto } from '$app/navigation'

	import { LibraryManager } from '$lib/manager.svelte'
	import Player from '$lib/player.svelte'
	import { Queue } from '$lib/queue'
	import { spotify } from '$lib/spotify/auth'

	let accessToken: AccessToken | null = $state(null)
	let pageTitle: string | null = $state(null)

	let colorsCurrent = $state(['#111827', '#1f2937', '#000000'])
	let colorsPrevious = $state(['#111827', '#1f2937', '#000000'])
	let isColorsChanged = $state(false)

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

	$effect(() => {
		if (colorsCurrent[0] !== colorsPrevious[0] || colorsCurrent[1] !== colorsPrevious[1]) {
			isColorsChanged = true

			const timer = setTimeout(async () => {
				colorsPrevious = [...colorsCurrent]
				isColorsChanged = false
				await tick()
			}, 1500)

			return () => {
				clearTimeout(timer)
			}
		}
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
	<div class="relative h-full min-h-screen text-gray-200 font-sans antialiased">
		<!-- Background Layer (Old Colors) -->
		<div
			class="absolute inset-0 -z-10"
			style="background-image: linear-gradient(to bottom right, {colorsPrevious.join(', ')});"
		></div>
		<!-- Background Layer (New Colors - Fades In) -->
		<div
			class="absolute inset-0 -z-10 transition-opacity duration-[1500ms] ease-in-out"
			class:opacity-100={isColorsChanged}
			class:opacity-0={!isColorsChanged}
			style="background-image: linear-gradient(to bottom right, {colorsCurrent.join(', ')});"
		></div>
		<!-- Overlay to keep text and controls readable -->
		<div class="absolute inset-0 -z-10 bg-black/50 pointer-events-none"></div>

		<!-- Foreground Content -->
		<div class="relative z-0 max-w-2xl mx-auto p-4 min-h-screen flex flex-col space-y-8">
			<header class="flex justify-between items-center">
				<div class="flex items-center gap-2">
					<img class="w-8 h-8" src="/logo.svg" alt="Logo" />
					<h1 class="text-lg font-light tracking-wider opacity-90">SHUFLOW</h1>
				</div>
				<button
					class="font-light tracking-wider text-lg opacity-90 hover:opacity-100 flex items-center gap-1.5 p-1.5 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
					onpointerdown={logout}
					aria-label="Logout"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1"
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
				</button>
			</header>

			<Player {accessToken} {queue} bind:pageTitle bind:colors={colorsCurrent} />

			<div class="text-center">
				<div class="grid grid-cols-4 gap-2 mt-2 text-xs">
					<div class="p-1.5 bg-white/5 rounded">{manager.counts.tracks} TRK</div>
					<div class="p-1.5 bg-white/5 rounded">{manager.counts.albums} ALB</div>
					<div class="p-1.5 bg-white/5 rounded">{manager.counts.playlists} LST</div>
					<div class="p-1.5 bg-white/5 rounded">{manager.counts.artists} ART</div>
				</div>
			</div>
		</div>
	</div>
{/if}
