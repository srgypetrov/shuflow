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

	// — Lifecycle —

	onMount(async () => {
		setFirstTrack()
		const script = document.createElement('script')
		script.src = 'https://sdk.scdn.co/spotify-player.js'
		script.async = true
		document.body.appendChild(script)
		window.onSpotifyWebPlaybackSDKReady = init
		window.addEventListener('keydown', onKeydown)
		document.addEventListener('visibilitychange', onVisibilityChange)
		setupMediaSession()
	})

	onDestroy(() => {
		if (player) player.disconnect()
		window.removeEventListener('keydown', onKeydown)
		document.removeEventListener('visibilitychange', onVisibilityChange)
		destroyMediaSession()
	})

	function setupMediaSession() {
		if (!('mediaSession' in navigator)) return

		navigator.mediaSession.setActionHandler('play', togglePlay)
		navigator.mediaSession.setActionHandler('pause', togglePlay)
		navigator.mediaSession.setActionHandler('previoustrack', previousTrack)
		navigator.mediaSession.setActionHandler('nexttrack', nextTrack)
		navigator.mediaSession.setActionHandler('seekbackward', (details) => {
			const skipTime = details.seekOffset || 10
			seek(Math.max(position - skipTime * 1000, 0))
		})
		navigator.mediaSession.setActionHandler('seekforward', (details) => {
			if (!track) return
			const skipTime = details.seekOffset || 10
			seek(Math.min(position + skipTime * 1000, track.duration_ms))
		})
		navigator.mediaSession.setActionHandler('seekto', (details) => {
			if (details.seekTime !== null && details.seekTime !== undefined) {
				seek(details.seekTime * 1000)
			}
		})
	}

	function destroyMediaSession() {
		if (!('mediaSession' in navigator)) return

		navigator.mediaSession.setActionHandler('play', null)
		navigator.mediaSession.setActionHandler('pause', null)
		navigator.mediaSession.setActionHandler('previoustrack', null)
		navigator.mediaSession.setActionHandler('nexttrack', null)
		navigator.mediaSession.setActionHandler('seekbackward', null)
		navigator.mediaSession.setActionHandler('seekforward', null)
		navigator.mediaSession.setActionHandler('seekto', null)
		navigator.mediaSession.metadata = null
	}

	function init() {
		player = new window.Spotify.Player({
			enableMediaSession: false,
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

	// — Handlers —

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

	// — Effects —

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
				position = Math.max(Math.min(playback.position, item.track.duration_ms), position)
			}

			const remaining = item ? item.track.duration_ms - position : null
			if (remaining !== null && remaining < 5000 && !nextTrackTimeout) {
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

	$effect(() => {
		if (!('mediaSession' in navigator)) return

		if (track) {
			navigator.mediaSession.metadata = new MediaMetadata({
				title: track.name,
				artist: artistName ?? undefined,
				album: track.album.name,
				artwork: track.album.images.map((image) => ({
					src: image.url,
					sizes: `${image.width}x${image.height}`,
					type: 'image/jpeg'
				}))
			})
		}

		navigator.mediaSession.playbackState = paused ? 'paused' : 'playing'
	})

	// — Helpers —

	async function prefetchNextCover(): Promise<void> {
		const item = await queue.peek()
		const url = item?.track.album.images[0]?.url
		if (!url) return
		const img = new Image()
		img.decoding = 'async'
		img.src = url
	}

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
			prefetchNextCover()
			if (item !== null) return
			await new Promise((r) => setTimeout(r, 3000))
			attempts++
		}
		return null
	}

	// — Controls —

	async function play() {
		if (!deviceId || !item) return
		position = 0
		await spotify.player.startResumePlayback(deviceId, undefined, [item.track.uri])
	}

	async function togglePlay() {
		if (!deviceId) return
		if (track === item?.track) {
			await play()
		} else if (paused) {
			await player.resume()
		} else {
			await player.pause()
		}
	}

	async function nextTrack() {
		if (nextTrackTimeout) {
			clearTimeout(nextTrackTimeout)
			nextTrackTimeout = null
		}
		if (!deviceId) return
		item = await queue.next()
		prefetchNextCover()
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
			class="group relative mx-auto mb-6 aspect-square w-full max-w-sm cursor-default overflow-hidden rounded-xl border-2 border-white/10 bg-transparent p-0 shadow-2xl focus:outline-none md:max-w-md lg:max-w-lg"
		>
			<img
				src={track.album.images[0]?.url}
				alt={track.name}
				class="h-full w-full object-cover"
				fetchpriority="high"
			/>
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
					<h2 class="text-2xl font-medium">
						<a
							href={item?.track?.external_urls?.spotify}
							target="_blank"
							rel="noopener noreferrer"
							class="hover:underline"
						>
							{track.name}
						</a>
					</h2>
					<p class="text-sm opacity-85">{artistName}</p>
				</div>
			{/key}
		</div>

		<Progress duration={track?.duration_ms || 0} {position} onPositionUpdate={seek}></Progress>

		<!-- Controls -->
		<div class="mb-6 flex items-center justify-center gap-5">
			<button
				class="rounded-full p-3 text-neutral-300 transition-colors transition-transform hover:scale-[1.04] hover:text-gray-100 focus:outline-none active:bg-gray-100/30"
				onpointerdown={throttle(previousTrack)}
				aria-label="Previous track"
			>
				<svg class="size-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path d="M6 6h2v12H6zm11.41 10.59L12.83 12l4.58-4.59L16 6l-6 6 6 6z" />
				</svg>
			</button>
			<button
				class="rounded-full bg-gray-100/20 p-3 transition-colors transition-transform hover:scale-[1.03] focus:outline-none active:bg-gray-100/30"
				onpointerdown={togglePlay}
				aria-label={paused ? 'Play' : 'Pause'}
			>
				<svg class="size-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					{#if paused}
						<path d="M8 5v14l11-7z" />
					{:else}
						<path d="M6 19h4V5H6zm8-14v14h4V5z" />
					{/if}
				</svg>
			</button>
			<button
				class="rounded-full p-3 text-neutral-300 transition-colors transition-transform hover:scale-[1.04] hover:text-gray-100 focus:outline-none active:bg-gray-100/30"
				onpointerdown={throttle(nextTrack)}
				aria-label="Next track"
			>
				<svg class="size-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path d="M7.59 7.41L12.17 12l-4.58 4.59L9 18l6-6-6-6zM16 6h2v12h-2z" />
				</svg>
			</button>
		</div>
	{/if}
</div>
