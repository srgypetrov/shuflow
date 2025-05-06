<script lang="ts">
	import type { Track } from '@spotify/web-api-ts-sdk'
	import { average } from 'color.js'
	import { onDestroy, onMount } from 'svelte'
	import { fade } from 'svelte/transition'
	import tinycolor from 'tinycolor2'

	import Progress from '$lib/components/progress.svelte'
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
			track = playback.track_window.current_track
		})
		player.connect()
	}

	$effect(() => {
		const interval = setInterval(async () => {
			const playback = await player.getCurrentState()
			if (!playback) return

			const delta = playback.position - position
			if (!paused && item && delta > 0 && Math.abs(delta) < 1000) {
				position = Math.min(playback.position, item.track.duration_ms)
			}

			if (item && item.track.duration_ms - playback.position < 500) {
				await nextTrack()
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
		if (!item?.track.album?.images[0].url) return
		const from = await average(item.track.album.images[0].url, { format: 'hex' })
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
		setColors()
		position = 0
		await spotify.player.startResumePlayback(deviceId, undefined, [item.track.uri])
	}

	async function togglePlay() {
		if (!deviceId) return
		if (track === item?.track) return await play()
		await player.togglePlay()
	}

	async function nextTrack() {
		if (!deviceId) return
		item = await queue.next()
		await play()
	}

	async function previousTrack() {
		if (!deviceId) return
		item = await queue.previous()
		await play()
	}

	async function seek(positionNew: number) {
		position = positionNew
		await player.seek(positionNew)
	}
</script>

<div class="flex-1 flex flex-col justify-center">
	{#if !deviceId || !track}
		<div class="py-4 text-center">Connecting...</div>
	{:else}
		<!-- Artwork -->
		<button
			type="button"
			class="relative group w-full max-w-sm md:max-w-md lg:max-w-lg aspect-square mx-auto mb-6 rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 p-0 bg-transparent cursor-default"
		>
			<img src={track.album.images[0]?.url} alt={track.name} class="w-full h-full object-cover" />
			<div
				class="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-xs text-white px-2 py-1 rounded opacity-0 transition-opacity sm:group-hover:opacity-100 group-focus:opacity-100 pointer-events-none max-w-full truncate"
			>
				You liked this {source.type}{#if source.name}:
					<span class="font-bold">{source.name}</span>
				{/if}
			</div>
		</button>

		<!-- Track Info -->
		<div class="text-center mb-6 space-y-1 text-shadow">
			{#key track.uri}
				<div in:fade>
					<h2 class="text-2xl font-medium">{track.name}</h2>
					<p class="text-sm opacity-85">{artistName}</p>
				</div>
			{/key}
		</div>

		<Progress duration={track?.duration_ms || 0} {position} onPositionUpdate={seek}></Progress>

		<!-- Controls -->
		<div class="flex justify-center items-center gap-4 mb-6">
			<button
				class="p-3 opacity-90 hover:opacity-100 hover:bg-white/10 rounded-full"
				onpointerdown={previousTrack}
				aria-label="Previous track"
			>
				<img class="h-6 w-6" src="/previous.svg" alt="Previous" />
			</button>
			<button
				class="p-5 bg-white/10 hover:bg-white/20 rounded-full"
				onpointerdown={togglePlay}
				aria-label={paused ? 'Play' : 'Pause'}
			>
				{#if paused}
					<img class="h-6 w-6" src="/play.svg" alt="Play" />
				{:else}
					<img class="h-6 w-6" src="/pause.svg" alt="Pause" />
				{/if}
			</button>
			<button
				class="p-3 opacity-90 hover:opacity-100 hover:bg-white/10 rounded-full"
				onpointerdown={nextTrack}
				aria-label="Next track"
			>
				<img class="h-6 w-6" src="/next.svg" alt="Next" />
			</button>
		</div>
	{/if}
</div>
