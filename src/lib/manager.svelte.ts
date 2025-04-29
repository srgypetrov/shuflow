import type {
	Artist,
	PlaylistedTrack,
	SavedAlbum,
	SavedTrack,
	SimplifiedAlbum,
	SimplifiedPlaylist,
	SimplifiedTrack,
	Track
} from '@spotify/web-api-ts-sdk'
import type { Table } from 'dexie'

import type { Config, DBAlbum, DBArtist, DBEntity, DBPlaylist, DBTrack } from '$lib/db'
import { Binary, db } from '$lib/db'
import { stateQuery } from '$lib/helpers.svelte'
import { Paginator } from '$lib/paginator'
import { spotify } from '$lib/spotify'

export type PlayerItem = {
	track: Track
	album?: DBAlbum
	artist?: DBArtist
	playlist?: DBPlaylist
}

export class LibraryManager {
	private readonly reader: LibraryReader
	private readonly writer: LibraryWriter

	counts = stateQuery({
		albums: () => db.albums.where('isActive').notEqual(Binary.OFF).count(),
		artists: () => db.artists.where('isActive').notEqual(Binary.OFF).count(),
		playlists: () => db.playlists.where('isActive').notEqual(Binary.OFF).count(),
		tracks: () => db.tracks.where('isActive').notEqual(Binary.OFF).count()
	})

	constructor() {
		this.reader = new LibraryReader()
		this.writer = new LibraryWriter()
	}

	async delete(): Promise<void> {
		return db.delete()
	}

	async next(): Promise<PlayerItem | null> {
		const config = await db.configGetOrCreate()
		return this.reader.getRandomItem(config, this.counts)
	}

	async reset(): Promise<void> {
		await this.writer.clear()
		return this.sync(true)
	}

	async stop(): Promise<[void, void]> {
		return Promise.all([this.reader.stop(), this.writer.stop()])
	}

	async sync(force = false): Promise<void> {
		const config = await db.configGetOrCreate()
		if (!force && !this.isSyncNeeded(config)) return
		return this.writer.sync(config)
	}

	private isSyncNeeded(config: Config): boolean {
		if (!config.librarySyncedAt) return true
		const diff = new Date().getTime() - config.librarySyncedAt.getTime()
		return diff > 1000 * 60 * 60 * 24
	}
}

class LibraryWriter {
	private promise: Promise<unknown> | null = null
	private stopped = false
	constructor() {}

	async clear(): Promise<void> {
		await Promise.all([
			db.albums.clear(),
			db.artists.clear(),
			db.playlists.clear(),
			db.tracks.clear()
		])
	}

	async stop(): Promise<void> {
		this.stopped = true
		if (this.promise) await this.promise
	}

	async sync(config: Config): Promise<void> {
		this.promise = Promise.all([
			config.isUsingAlbums && this.update(db.albums, this.loadAlbums.bind(this)),
			config.isUsingArtists && this.update(db.artists, this.loadArtists.bind(this)),
			config.isUsingPlaylists && this.update(db.playlists, this.loadPlaylists.bind(this)),
			config.isUsingTracks && this.update(db.tracks, this.loadTracks.bind(this))
		])
			.then(async () => {
				await db.configUpdate({ librarySyncedAt: new Date() })
			})
			.catch(this.clear)
			.finally(() => {
				this.promise = null
			})
	}

	private async update<T extends DBEntity>(
		table: Table,
		loader: () => AsyncGenerator<T[]>
	): Promise<void> {
		for await (const batch of loader()) {
			if (batch.length === 0 || this.stopped) return

			const existing: DBEntity[] = await table
				.where('spotifyId')
				.anyOf(batch.map((i) => i.spotifyId))
				.toArray()

			await table.bulkPut(batch.filter((i) => !existing.some((j) => i.spotifyId === j.spotifyId)))

			if (existing.length > 0) return
		}
	}

	private async *loadAlbums(): AsyncGenerator<DBAlbum[]> {
		const albums = new Paginator<SavedAlbum>(({ limit, offset }) =>
			spotify.currentUser.albums.savedAlbums(limit, offset)
		)
		for await (const batch of albums.batches()) {
			yield batch.map(({ album }) => ({
				name: album.name,
				isActive: Binary.ON,
				spotifyId: album.id
			}))
		}
	}

	private async *loadArtists(): AsyncGenerator<DBArtist[]> {
		const artists = new Paginator<Artist>(async ({ limit, after }) => {
			return (await spotify.currentUser.followedArtists(after, limit)).artists
		})
		for await (const batch of artists.batches()) {
			yield batch.map((artist) => ({
				name: artist.name,
				isActive: Binary.ON,
				spotifyId: artist.id
			}))
		}
	}

	private async *loadPlaylists(): AsyncGenerator<DBPlaylist[]> {
		const playlists = new Paginator<SimplifiedPlaylist>(({ limit, offset }) =>
			spotify.currentUser.playlists.playlists(limit, offset)
		)
		for await (const batch of playlists.batches()) {
			yield batch
				.filter((playlist) => (playlist.tracks?.total ?? 0) > 0)
				.map((playlist) => ({
					name: playlist.name,
					isActive: Binary.ON,
					spotifyId: playlist.id
				}))
		}
	}

	private async *loadTracks(): AsyncGenerator<DBTrack[]> {
		const tracks = new Paginator<SavedTrack>(({ limit, offset }) =>
			spotify.currentUser.tracks.savedTracks(limit, offset)
		)
		for await (const batch of tracks.batches()) {
			yield batch.map(({ track }) => ({
				name: track.name,
				isActive: Binary.ON,
				spotifyId: track.id
			}))
		}
	}
}

class LibraryReader {
	private promise: Promise<PlayerItem | null> | null = null
	private stopped = false
	constructor(private readonly maxRetries = 20) {}

	async getRandomItem(
		config: Config,
		counts: { [key: string]: number | undefined },
		retries = 0
	): Promise<PlayerItem | null> {
		const sources = [
			{
				item: this.fromAlbums.bind(this),
				weight: Math.pow((counts.albums ?? 0) + 1, 0.5) * 1.0,
				isActive: config.isUsingAlbums
			},
			{
				item: this.fromArtists.bind(this),
				weight: Math.pow((counts.artists ?? 0) + 1, 0.5) * 1.2,
				isActive: config.isUsingArtists
			},
			{
				item: this.fromPlaylists.bind(this),
				weight: Math.pow((counts.playlists ?? 0) + 1, 0.5) * 1.5,
				isActive: config.isUsingPlaylists
			},
			{
				item: this.fromTracks.bind(this),
				weight: Math.pow((counts.tracks ?? 0) + 1, 0.5) * 0.8,
				isActive: config.isUsingTracks
			}
		].filter((source) => source.isActive)
		if (sources.length === 0 || retries > this.maxRetries || this.stopped) return null

		this.promise = Picker.randomWeighted(sources)()
		const item = await this.promise.finally(() => {
			this.promise = null
		})
		return item || this.stopped ? item : this.getRandomItem(config, counts, retries + 1)
	}

	async stop(): Promise<void> {
		this.stopped = true
		if (this.promise) await this.promise
	}

	private async getRandomRecord<T extends DBEntity>(table: Table): Promise<T | null> {
		const count = await table.where('isActive').equals(Binary.ON).count()
		return table
			.where('isActive')
			.equals(Binary.ON)
			.offset(Picker.randomNumber(count))
			.limit(1)
			.first()
	}

	private async fromAlbums(artist?: DBArtist): Promise<PlayerItem | null> {
		let album: SimplifiedAlbum | null = null
		let tracks: SimplifiedTrack[] = []
		let dbAlbum: DBAlbum | undefined

		if (artist) {
			const albums = await Array.fromAsync(
				new Paginator<SimplifiedAlbum>(({ limit, offset }) =>
					spotify.artists.albums(artist.spotifyId, 'album,single', undefined, limit, offset)
				)
			)
			if (albums.length <= 0) return null
			album = Picker.random(albums)
			tracks = (await spotify.albums.tracks(album.id)).items
		} else {
			const record = await this.getRandomRecord(db.albums)
			if (!record) return null
			const { tracks: tracksPage, ...fullAlbum } = await spotify.albums.get(record.spotifyId)
			album = { ...fullAlbum, album_group: '' }
			tracks = tracksPage.items
			dbAlbum = record
		}

		if (tracks.length <= 0) return null
		const track = {
			...Picker.random(tracks),
			album,
			external_ids: { upc: '', isrc: '', ean: '' },
			popularity: 0
		}
		return { track, album: dbAlbum, artist }
	}

	private async fromArtists(): Promise<PlayerItem | null> {
		const artist = await this.getRandomRecord(db.artists)
		if (!artist) return null
		return this.fromAlbums(artist)
	}

	private async fromPlaylists(): Promise<PlayerItem | null> {
		const playlist = await this.getRandomRecord(db.playlists)
		if (!playlist) return null

		const items = await Array.fromAsync(
			new Paginator<PlaylistedTrack>(({ limit, offset }) =>
				spotify.playlists.getPlaylistItems(playlist.spotifyId, undefined, undefined, limit, offset)
			)
		)
		const tracks = items
			.map((item) => item.track)
			.filter((track): track is Track => track.type === 'track')
		return tracks.length > 0 ? { track: Picker.random(tracks), playlist } : null
	}

	private async fromTracks(): Promise<PlayerItem | null> {
		const track = await this.getRandomRecord(db.tracks)
		if (!track) return null
		return { track: await spotify.tracks.get(track.spotifyId) }
	}
}

class Picker {
	static random<T>(items: T[]): T {
		return items[this.randomNumber(items.length)]
	}

	static randomNumber(max: number) {
		return Math.floor(Math.random() * max)
	}

	static randomWeighted<T>(items: { item: T; weight: number }[]): T {
		const random = Math.random() * items.reduce((sum, { weight }) => sum + weight, 0)

		let cumulative = 0
		for (const { item, weight } of items) {
			cumulative += weight
			if (random <= cumulative) return item
		}
		throw new Error('Picker error: failed to correctly determine a weighted item')
	}
}
