<script lang="ts">
	import type { AccessToken, Track } from '@spotify/web-api-ts-sdk'
	import { prominent } from 'color.js'
	import { onDestroy, onMount } from 'svelte'

	import Progress from '$lib/progress.svelte'
	import { type Queue } from '$lib/queue'
	import { spotify } from '$lib/spotify/auth'

	type Props = {
		accessToken: AccessToken
		queue: Queue<Track>
		pageTitle: string | null
	}
	let { accessToken, queue, pageTitle = $bindable() }: Props = $props()

	let deviceId: string | null = $state(null)
	let player: Spotify.Player
	let track: Track | null = null

	let colors: [string, string] = $state(['#2A2A2A', '#4A4A4A'])
	let paused = $state(true)
	let position = $state(0)
	let displayTrack: Spotify.Track | Track | null = $state(null)

	let artistName = $derived.by(() => {
		if (!displayTrack) return null
		return displayTrack.artists.map((a) => a.name).join(', ')
	})

	onMount(async () => {
		setFirstTrack()
		const script = document.createElement('script')
		script.src = 'https://sdk.scdn.co/spotify-player.js'
		script.async = true
		document.body.appendChild(script)
		window.onSpotifyWebPlaybackSDKReady = init
	})

	onDestroy(() => {
		if (player) player.disconnect()
	})

	function init() {
		player = new window.Spotify.Player({
			enableMediaSession: true,
			name: 'Shuflow',
			getOAuthToken: (cb) => {
				cb(accessToken.access_token)
			},
			volume: 1
		})
		player.addListener('ready', ({ device_id }) => (deviceId = device_id))
		player.addListener('not_ready', () => (deviceId = null))
		player.addListener('player_state_changed', (playback: Spotify.PlaybackState) => {
			if (!playback) return
			paused = playback.paused
			displayTrack = playback.track_window.current_track
		})
		player.connect()
	}

	$effect(() => {
		const interval = setInterval(async () => {
			const playback = await player.getCurrentState()
			if (!playback) return

			const delta = playback.position - position
			if (!paused && track && delta > 0 && Math.abs(delta) < 1000) {
				position = Math.min(playback.position, track.duration_ms)
			}

			if (track && track.duration_ms - playback.position < 500) {
				await nextTrack()
			}
		}, 500)
		return () => {
			clearInterval(interval)
		}
	})

	$effect(() => {
		if (displayTrack && !paused) {
			pageTitle = `${displayTrack.name} • ${artistName}`
		} else {
			pageTitle = null
		}
	})

	async function setColors() {
		if (!track?.album.images[0].url) return
		const output = await prominent(track?.album.images[0].url, { amount: 2, format: 'hex' })
		colors = output as [string, string]
	}

	async function setFirstTrack() {
		let attempts = 0
		while (attempts < 10) {
			track = displayTrack = await queue.next()
			setColors()
			if (track !== null) return
			await new Promise((r) => setTimeout(r, 3000))
			attempts++
		}
		return null
	}

	async function play() {
		if (!deviceId || !track) return
		setColors()
		position = 0
		await spotify.player.startResumePlayback(deviceId, undefined, [track.uri])
	}

	async function togglePlay() {
		if (!deviceId) return
		if (displayTrack === track) return await play()
		await player.togglePlay()
	}

	async function nextTrack() {
		if (!deviceId) return
		track = await queue.next()
		await play()
	}

	async function previousTrack() {
		if (!deviceId) return
		track = await queue.previous()
		await play()
	}

	async function seek(positionNew: number) {
		position = positionNew
		await player.seek(positionNew)
	}
</script>

<div class="mx-auto max-w-md rounded-lg bg-gray-800 p-6 text-white">
	{#if !deviceId}
		<div class="py-4 text-center">Connecting...</div>
	{:else}
		<div class="space-y-4">
			<div class="relative aspect-square overflow-hidden rounded-lg">
				{colors}
				{#if displayTrack}
					<img
						src={displayTrack.album.images[0]?.url}
						alt={displayTrack.name}
						class="h-full w-full object-cover"
					/>
				{:else}
					<div class="flex h-full w-full items-center justify-center bg-gray-700">
						<span class="text-gray-400">No track playing</span>
					</div>
				{/if}
			</div>

			<div class="text-center">
				{#if displayTrack}
					<h3 class="truncate text-lg font-bold">
						{displayTrack.name}
					</h3>
					<p class="text-sm text-gray-400">
						{artistName}
					</p>
				{/if}
			</div>

			<div class="flex items-center justify-center space-x-6">
				<button
					onpointerdown={previousTrack}
					class="p-2 transition-colors hover:text-green-500"
					aria-label="Previous track"
				>
					<svg class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
					</svg>
				</button>

				<button
					onpointerdown={togglePlay}
					class="rounded-full bg-green-500 p-3 transition-colors hover:bg-green-400"
					aria-label={paused ? 'Play' : 'Pause'}
				>
					{#if paused}
						<svg class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
							<path d="M8 5v14l11-7z" />
						</svg>
					{:else}
						<svg class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
							<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
						</svg>
					{/if}
				</button>

				<button
					onpointerdown={nextTrack}
					class="p-2 transition-colors hover:text-green-500"
					aria-label="Next track"
				>
					<svg class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
					</svg>
				</button>
			</div>

			<Progress duration={displayTrack?.duration_ms || 0} {position} onPositionUpdate={seek}
			></Progress>
		</div>
	{/if}
</div>
