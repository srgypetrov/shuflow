<script lang="ts">
	import type { AccessToken, Track } from '@spotify/web-api-ts-sdk'
	import { onDestroy, onMount } from 'svelte'

	import Progress from '$lib/progress.svelte'
	import { type Queue } from '$lib/queue'
	import { spotify } from '$lib/spotify/auth'

	interface Props {
		queue: Queue<Track>
	}
	let { queue }: Props = $props()

	let accessToken: AccessToken | null
	let deviceId: string | null = $state(null)
	let player: Spotify.Player

	let paused = $state(true)

	let position = $state(0)

	let track: Track | null = null
	let displayTrack: Spotify.Track | Track | null = $state(null)

	onMount(async () => {
		setFirstTrack()
		accessToken = await spotify.getAccessToken()
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
				if (accessToken) cb(accessToken.access_token)
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
		let interval = setInterval(async () => {
			let playback = await player.getCurrentState()
			if (!playback) return
			if (!paused) position = playback.position
			if (track && track.duration_ms - position < 500) await nextTrack()
		}, 500)
		return () => {
			clearInterval(interval)
		}
	})

	async function setFirstTrack() {
		let attempts = 0
		while (attempts < 10) {
			track = displayTrack = await queue.next()
			if (track !== null) return
			await new Promise((r) => setTimeout(r, 3000))
			attempts++
		}
		return null
	}

	async function play() {
		if (!deviceId || !track) return
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

	async function seek(position: number) {
		await player.seek(position)
	}
</script>

<div class="mx-auto max-w-md rounded-lg bg-gray-800 p-6 text-white">
	{#if !deviceId}
		<div class="py-4 text-center">Connecting...</div>
	{:else}
		<div class="space-y-4">
			<div class="relative aspect-square overflow-hidden rounded-lg">
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
						{displayTrack.artists.map((a) => a.name).join(', ')}
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
