<script lang="ts">
	import type { AccessToken } from '@spotify/web-api-ts-sdk'
	import { onMount } from 'svelte'

	import Progress from '$lib/progress.svelte'
	import { spotify } from '$lib/spotify/auth'

	interface Props {
		accessToken: AccessToken
		trackUri: string | null
	}

	let { accessToken, trackUri }: Props = $props()

	let deviceId: string | null = $state(null)
	let duration = $state(0)
	let paused = $state(false)
	let position = $state(0)
	let track: Spotify.Track | null = $state(null)

	let player: Spotify.Player

	$effect(() => {
		if (trackUri && deviceId) {
			play(trackUri)
		}
	})

	$effect(() => {
		let interval = setInterval(async () => {
			let playback = await player.getCurrentState()
			if (playback) position = playback.position
		}, 1000)
		return () => {
			clearInterval(interval)
		}
	})

	onMount(() => {
		const script = document.createElement('script')
		script.src = 'https://sdk.scdn.co/spotify-player.js'
		script.async = true
		document.body.appendChild(script)
		window.onSpotifyWebPlaybackSDKReady = init
		return () => {
			if (player) player.disconnect()
		}
	})

	function init() {
		player = new window.Spotify.Player({
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
			duration = playback.duration
			paused = playback.paused
			position = playback.position
			track = playback.track_window.current_track
		})
		player.connect()
	}

	async function play(uri?: string) {
		if (!deviceId) return
		await spotify.player.startResumePlayback(deviceId, undefined, uri ? [uri] : undefined)
	}

	async function pause() {
		if (!deviceId) return
		await spotify.player.pausePlayback(deviceId)
	}

	async function onTogglePlay() {
		paused ? await play() : await pause()
	}

	async function onPositionUpdate(position: number) {
		await spotify.player.seekToPosition(position)
	}
</script>

<div class="mx-auto max-w-md rounded-lg bg-gray-800 p-6 text-white">
	{#if !deviceId}
		<div class="py-4 text-center">Connecting...</div>
	{:else}
		<div class="space-y-4">
			<div class="relative aspect-square overflow-hidden rounded-lg">
				{#if track}
					<img
						src={track.album.images[0]?.url}
						alt={track.name}
						class="h-full w-full object-cover"
					/>
				{:else}
					<div class="flex h-full w-full items-center justify-center bg-gray-700">
						<span class="text-gray-400">No track playing</span>
					</div>
				{/if}
			</div>

			<div class="text-center">
				{#if track}
					<h3 class="truncate text-lg font-bold">
						{track.name}
					</h3>
					<p class="text-sm text-gray-400">
						{track.artists.map((a) => a.name).join(', ')}
					</p>
				{/if}
			</div>

			<div class="flex items-center justify-center space-x-6">
				<button class="p-2 transition-colors hover:text-green-500" aria-label="Previous track">
					<svg class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
					</svg>
				</button>

				<button
					onpointerdown={onTogglePlay}
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

				<button class="p-2 transition-colors hover:text-green-500" aria-label="Next track">
					<svg class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
					</svg>
				</button>
			</div>

			<Progress {duration} {position} {onPositionUpdate}></Progress>
		</div>
	{/if}
</div>
