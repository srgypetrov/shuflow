<script lang="ts">
	import type { AccessToken } from '@spotify/web-api-ts-sdk'
	import { onMount, tick } from 'svelte'
	import { fade } from 'svelte/transition'

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

	let showLogoutConfirmation = $state(false)

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
		await manager.delete()
		accessToken = null
		spotify.logOut()
		goto('/login')
	}

	function requestLogout() {
		showLogoutConfirmation = true
	}

	function cancelLogout() {
		showLogoutConfirmation = false
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
		<div class="relative z-0 max-w-2xl mx-auto p-4 min-h-screen flex flex-col space-y-6">
			<header class="flex justify-between items-center">
				<div class="flex items-center gap-2">
					<h1 class="text-xl font-light tracking-wider opacity-100">SHUFLOW</h1>
				</div>
				<button
					class="font-light tracking-wider text-lg opacity-100 hover:opacity-100 flex items-center gap-1.5 p-1.5 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
					onpointerdown={requestLogout}
					aria-label="Logout"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
				</button>
			</header>

			<Player {accessToken} {queue} bind:pageTitle bind:colors={colorsCurrent} />

			<div class="text-center text-xs opacity-75 py-1 select-none !mt-0">
				{manager.counts.tracks}
				{manager.counts.tracks === 1 ? 'track' : 'tracks'} • {manager.counts.albums}
				{manager.counts.albums === 1 ? 'album' : 'albums'} • {manager.counts.playlists}
				{manager.counts.playlists === 1 ? 'playlist' : 'playlists'} • {manager.counts.artists}
				{manager.counts.artists === 1 ? 'artist' : 'artists'}
			</div>
		</div>
	</div>

	{#if showLogoutConfirmation}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
			transition:fade={{ duration: 150 }}
		>
			<div
				class="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
			>
				<h2 class="text-xl font-semibold mb-4 text-white">Logout</h2>
				<p class="text-gray-300 mb-6">
					Are you sure you want to log out? This will clear all downloaded metadata and reset your
					settings.
				</p>
				<div class="flex justify-end space-x-3">
					<button
						onclick={cancelLogout}
						class="px-4 py-2 rounded-lg text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
					>
						Cancel
					</button>
					<button
						onclick={() => {
							logout()
							cancelLogout()
						}}
						class="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
					>
						Confirm
					</button>
				</div>
			</div>
		</div>
	{/if}
{/if}
