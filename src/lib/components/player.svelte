<script lang="ts">
	import type { Track } from '@spotify/web-api-ts-sdk'
	import { average } from 'color.js'
	import { onDestroy, onMount } from 'svelte'
	import { fade } from 'svelte/transition'
	import tinycolor from 'tinycolor2'

	import Progress from '$lib/components/progress.svelte'
	import { throttle } from '$lib/helpers.svelte'
	import type { PlayerItem } from '$lib/manager.svelte'
	import type { Queue } from '$lib/queue'
	import { spotify } from '$lib/spotify'

	type Props = {
		colors: string[]
		queue: Queue<PlayerItem>
		pageTitle: string | null
	}
	let { colors = $bindable(), queue, pageTitle = $bindable() }: Props = $props()

	let deviceId: string | null = $state(null)
	let player: Spotify.Player
	let item: PlayerItem | null = $state(null)

	let paused = $state(true)
	let position = $state(0)
	let track: Spotify.Track | Track | null = $state(null)
	let nextTrackTimeout: NodeJS.Timeout | null = null

	let artistName = $derived.by(() => {
		if (!track) return null
		return track.artists.map((a) => a.name).join(', ')
	})
	let source = $derived.by(() => {
		if (!item) return { type: 'track' }
		if (item.artist) return { type: 'artist', name: item.artist.name }
		if (item.album) return { type: 'album', name: item.album.name }
		if (item.playlist) return { type: 'playlist', name: item.playlist.name }
		return { type: 'track' }
	})

	onMount(async () => {
		setFirstTrack()
		const script = document.createElement('script')
		script.src = 'https://sdk.scdn.co/spotify-player.js'
		script.async = true
		document.body.appendChild(script)
		window.onSpotifyWebPlaybackSDKReady = init
		window.addEventListener('keydown', onKeydown)
		document.addEventListener('visibilitychange', onVisibilityChange)
	})

	onDestroy(() => {
		if (player) player.disconnect()
		window.removeEventListener('keydown', onKeydown)
		document.removeEventListener('visibilitychange', onVisibilityChange)
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

	async function onVisibilityChange() {
		if (document.hidden || !player || !item) return
		const playback = await player.getCurrentState()
		if (playback && playback.track_window.current_track.uri === item.track.uri) {
			position = Math.min(playback.position, item.track.duration_ms)
		}
	}

	function init() {
		player = new window.Spotify.Player({
			enableMediaSession: true,
			name: 'Shuflow',
			getOAuthToken: (cb) => {
				spotify.authenticate().then((response) => {
					if (!response.authenticated) return
					cb(response.accessToken.access_token)
				})
			},
			volume: 1
		})
		player.addListener('ready', ({ device_id }) => (deviceId = device_id))
		player.addListener('not_ready', () => (deviceId = null))
		player.addListener('player_state_changed', (playback: Spotify.PlaybackState) => {
			if (!playback) return
			paused = playback.paused
			if (track !== playback.track_window.current_track) {
				track = playback.track_window.current_track
				setColors()
			}
		})
		player.connect()
	}

	$effect(() => {
		const interval = setInterval(async () => {
			const playback = await player.getCurrentState()
			if (!playback || !item || paused) return

			// Update position for progress bar.
			// Sometimes playback.position contains random values, especially when changing tracks.
			// To avoid position jumping, a delta check is performed.
			// The position refresh rate is chosen approximately, but it should be less than a second
			// to avoid missing some seconds in the position in the UI. The delta is also approximate
			// and should be greater than a second.
			const delta = playback.position - position
			if (Math.abs(delta) < 3000) {
				position = Math.min(playback.position, item.track.duration_ms)
			} else {
				position += 500
			}

			const remaining = item ? item.track.duration_ms - position : null
			if (remaining !== null && remaining < 2000 && !nextTrackTimeout) {
				// Subtract 500ms to avoid track pausing at the end
				nextTrackTimeout = setTimeout(async () => nextTrack(), Math.max(remaining - 500, 0))
			}
		}, 500)
		return () => {
			clearInterval(interval)
		}
	})

	$effect(() => {
		if (track && !paused) {
			pageTitle = `${track.name} • ${artistName}`
		} else {
			pageTitle = null
		}
	})

	async function setColors() {
		if (!track?.album?.images[0].url) return
		const from = await average(track.album.images[0].url, { format: 'hex' })
		const color = tinycolor(from as string)
		const to = color.isDark() ? color.lighten(40) : color.darken(40)
		colors = [from as string, to.toString()]
	}

	async function setFirstTrack() {
		let attempts = 0
		while (attempts < 10) {
			item = await queue.next()
			if (!item) continue
			track = item.track
			setColors()
			if (item !== null) return
			await new Promise((r) => setTimeout(r, 3000))
			attempts++
		}
		return null
	}

	async function play() {
		if (!deviceId || !item) return
		position = 0
		await spotify.player.startResumePlayback(deviceId, undefined, [item.track.uri])
	}

	async function togglePlay() {
		if (!deviceId) return
		if (track === item?.track) return await play()
		await player.togglePlay()
	}

	async function nextTrack() {
		if (nextTrackTimeout) {
			clearTimeout(nextTrackTimeout)
			nextTrackTimeout = null
		}
		if (!deviceId) return
		item = await queue.next()
		await play()
	}

	async function previousTrack() {
		if (nextTrackTimeout) {
			clearTimeout(nextTrackTimeout)
			nextTrackTimeout = null
		}
		if (!deviceId) return
		item = await queue.previous()
		await play()
	}

	async function seek(positionNew: number) {
		if (nextTrackTimeout) {
			clearTimeout(nextTrackTimeout)
			nextTrackTimeout = null
		}
		position = positionNew
		await player.seek(positionNew)
	}
</script>

<div class="flex flex-1 flex-col justify-center">
	{#if !deviceId || !track}
		<div class="py-4 text-center">Connecting...</div>
	{:else}
		<!-- Artwork -->
		<button
			type="button"
			class="group relative mx-auto mb-6 aspect-square w-full max-w-sm cursor-default overflow-hidden rounded-xl border-2 border-white/10 bg-transparent p-0 shadow-2xl md:max-w-md lg:max-w-lg"
		>
			<img src={track.album.images[0]?.url} alt={track.name} class="h-full w-full object-cover" />
			<div
				class="pointer-events-none absolute left-1/2 top-2 max-w-full -translate-x-1/2 transform truncate rounded bg-black bg-opacity-60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-focus:opacity-100 sm:group-hover:opacity-100"
			>
				You liked this {source.type}{#if source.name}:
					<span class="font-bold">{source.name}</span>
				{/if}
			</div>
		</button>

		<!-- Track Info -->
		<div class="text-shadow mb-6 space-y-1 text-center">
			{#key track.uri}
				<div in:fade>
					<h2 class="text-2xl font-medium">{track.name}</h2>
					<p class="text-sm opacity-85">{artistName}</p>
				</div>
			{/key}
		</div>

		<Progress duration={track?.duration_ms || 0} {position} onPositionUpdate={seek}></Progress>

		<!-- Controls -->
		<div class="mb-6 flex items-center justify-center gap-4">
			<button
				class="rounded-full p-3 opacity-90 hover:bg-white/10 hover:opacity-100"
				onpointerdown={throttle(previousTrack)}
				aria-label="Previous track"
			>
				<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
					<path d="M18.41 16.59 13.82 12l4.59-4.59L17 6l-6 6 6 6 1.41-1.41zM6 6h2v12H6V6z" />
				</svg>
			</button>
			<button
				class="rounded-full bg-white/10 p-5 hover:bg-white/20"
				onpointerdown={togglePlay}
				aria-label={paused ? 'Play' : 'Pause'}
			>
				{#if paused}
					<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
						<path d="M8 5v14l11-7z" />
					</svg>
				{:else}
					<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
					</svg>
				{/if}
			</button>
			<button
				class="rounded-full p-3 opacity-90 hover:bg-white/10 hover:opacity-100"
				onpointerdown={throttle(nextTrack)}
				aria-label="Next track"
			>
				<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
					<path d="M5.59 7.41 10.18 12l-4.59 4.59L7 18l6-6-6-6-1.41 1.41zM16 6h2v12h-2V6z" />
				</svg>
			</button>
		</div>
	{/if}
</div>
