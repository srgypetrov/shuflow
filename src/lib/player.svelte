<script lang="ts">
	import type { AccessToken, Track } from '@spotify/web-api-ts-sdk'
	import { average } from 'color.js'
	import { onDestroy, onMount } from 'svelte'
	import tinycolor from 'tinycolor2'

	import Progress from '$lib/progress.svelte'
	import { type Queue } from '$lib/queue'
	import { spotify } from '$lib/spotify/auth'

	type Props = {
		accessToken: AccessToken
		colors: string[]
		queue: Queue<Track>
		pageTitle: string | null
	}
	let { accessToken, colors = $bindable(), queue, pageTitle = $bindable() }: Props = $props()

	let deviceId: string | null = $state(null)
	let player: Spotify.Player
	let track: Track | null = null

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
		window.addEventListener('keydown', onKeydown)
	})

	onDestroy(() => {
		if (player) player.disconnect()
		window.removeEventListener('keydown', onKeydown)
	})

	function onKeydown(event: KeyboardEvent) {
		// Ignore if modifier keys are pressed or if input elements are focused
		if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
		const target = event.target as HTMLElement
		if (
			target &&
			(target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
		) {
			return
		}

		if (event.code === 'Space') {
			event.preventDefault() // Prevent page scroll
			togglePlay()
		}
	}

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
		const from = await average(track?.album.images[0].url, { format: 'hex' })
		const to = tinycolor(from as string)
		to.isDark() ? to.lighten(40) : to.darken(40)
		colors = [from as string, to.toString()]
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

<div class="flex-1 flex flex-col justify-center">
	{#if !deviceId || !displayTrack}
		<div class="py-4 text-center">Connecting...</div>
	{:else}
		<!-- Artwork -->
		<div
			class="relative w-full max-w-sm md:max-w-md lg:max-w-lg aspect-square mx-auto mb-8 rounded-xl overflow-hidden shadow-2xl border-4 border-white/10"
		>
			<img
				src={displayTrack.album.images[0]?.url}
				alt={displayTrack.name}
				class="w-full h-full object-cover"
			/>
		</div>

		<!-- Track Info -->
		<div class="text-center mb-8 space-y-1 text-shadow">
			<h2 class="text-2xl font-medium">{displayTrack.name}</h2>
			<p class="text-sm opacity-75">{artistName}</p>
		</div>

		<Progress duration={displayTrack?.duration_ms || 0} {position} onPositionUpdate={seek}
		></Progress>

		<!-- Controls -->
		<div class="flex justify-center items-center gap-4 mb-6">
			<button
				class="p-3 opacity-90 hover:opacity-100 hover:bg-white/10 rounded-full"
				onpointerdown={previousTrack}
				aria-label="Previous track"
			>
				<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
					<path d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6 1.41-1.41zM6 6h2v12H6V6z" />
				</svg>
			</button>
			<button
				class="p-5 bg-white/10 hover:bg-white/20 rounded-full"
				onpointerdown={togglePlay}
				aria-label={paused ? 'Play' : 'Pause'}
			>
				{#if paused}
					<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
						<path d="M8 5v14l11-7z" />
					</svg>
				{:else}
					<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
					</svg>
				{/if}
			</button>
			<button
				class="p-3 opacity-90 hover:opacity-100 hover:bg-white/10 rounded-full"
				onpointerdown={nextTrack}
				aria-label="Next track"
			>
				<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
					<path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6-1.41 1.41zM16 6h2v12h-2V6z" />
				</svg>
			</button>
		</div>

		<!-- Source Info -->
		<div class="text-center text-sm opacity-75">
			From <span class="font-medium">Hurry Up, We're Dreaming</span>
		</div>
	{/if}
</div>
