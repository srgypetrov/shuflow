<script lang="ts">
	import { onMount, tick } from 'svelte'

	import { goto } from '$app/navigation'

	import LogoutConfirmationModal from '$lib/components/confirmation.svelte'
	import Player from '$lib/components/player.svelte'
	import { LibraryManager } from '$lib/manager.svelte'
	import { Queue } from '$lib/queue'
	import { spotify } from '$lib/spotify'

	const INITIAL_COLORS = ['#22304E', '#3E526E', '#000000']

	let pageTitle: string | null = $state(null)

	let colorsCurrent = $state(INITIAL_COLORS)
	let colorsPrevious = $state(INITIAL_COLORS)
	let isColorsChanged = $state(false)

	let authenticated = $state(false)
	let showLogoutConfirmation = $state(false)

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

	$effect(() => {
		if (colorsCurrent[0] !== colorsPrevious[0] || colorsCurrent[1] !== colorsPrevious[1]) {
			isColorsChanged = true

			const timer = setTimeout(async () => {
				colorsPrevious = [...colorsCurrent]
				isColorsChanged = false
				await tick()
			}, 500)

			return () => {
				clearTimeout(timer)
			}
		}
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
		<!-- Background Layer (Old Colors) -->
		<div
			class="absolute inset-0 -z-10"
			style="background-image: linear-gradient(to bottom right, {colorsPrevious.join(', ')});"
		></div>
		<!-- Background Layer (New Colors - Fades In) -->
		<div
			class="absolute inset-0 -z-10 transition-opacity duration-[500ms] ease-in-out"
			class:opacity-100={isColorsChanged}
			class:opacity-0={!isColorsChanged}
			style="background-image: linear-gradient(to bottom right, {colorsCurrent.join(', ')});"
		></div>
		<!-- Overlay to keep text and controls readable -->
		<div class="pointer-events-none absolute inset-0 -z-10 bg-black/50"></div>

		<!-- Foreground Content -->
		<div class="relative z-0 mx-auto flex min-h-screen max-w-2xl flex-col space-y-6 p-4">
			<header class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<img class="h-8 w-8 opacity-90" src="/logo-gray.svg" alt="Logo" />
					<h1 class="text-xl font-light tracking-wider opacity-100">SHUFLOW</h1>
				</div>
				<button
					class="flex items-center gap-1.5 rounded-md p-1.5 text-lg font-light tracking-wider opacity-100 transition-all hover:bg-white/10 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/20"
					onpointerdown={() => (showLogoutConfirmation = true)}
					aria-label="Logout"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="m17 16 4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1"
						/>
					</svg>
				</button>
			</header>

			<Player {queue} bind:pageTitle bind:colors={colorsCurrent} />

			<div class="!mt-0 py-1 text-center text-xs opacity-85">
				{manager.counts.tracks}
				{manager.counts.tracks === 1 ? 'track' : 'tracks'} • {manager.counts.albums}
				{manager.counts.albums === 1 ? 'album' : 'albums'} • {manager.counts.playlists}
				{manager.counts.playlists === 1 ? 'playlist' : 'playlists'} • {manager.counts.artists}
				{manager.counts.artists === 1 ? 'artist' : 'artists'}
			</div>
		</div>
	</div>

	<LogoutConfirmationModal bind:isOpen={showLogoutConfirmation} action={logout} />
{/if}
