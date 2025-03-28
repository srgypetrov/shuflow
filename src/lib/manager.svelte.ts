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
import { db } from '$lib/db'
import { stateQuery } from '$lib/helpers.svelte'
import { spotify } from '$lib/spotify/auth'
import { Paginator } from '$lib/spotify/paginator'

export class LibraryManager {
	private readonly reader: LibraryReader
	private readonly writer: LibraryWriter

	albumsCount = stateQuery(() => db.albums.count())
	artistsCount = stateQuery(() => db.artists.count())
	playlistsCount = stateQuery(() => db.playlists.count())
	tracksCount = stateQuery(() => db.tracks.count())

	constructor() {
		this.reader = new LibraryReader()
		this.writer = new LibraryWriter()
	}

	async next(): Promise<Track | null> {
		const config = await db.configGetOrCreate()
		return this.reader.getRandomTrack(config)
	}

	async reset(): Promise<void> {
		const [config] = await Promise.all([db.configGetOrCreate(), this.writer.clear()])
		await this.writer.sync(config)
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
	constructor() {}

	async clear(): Promise<void> {
		await Promise.all([
			db.albums.clear(),
			db.artists.clear(),
			db.playlists.clear(),
			db.tracks.clear()
		])
	}

	async sync(config: Config): Promise<void> {
		await Promise.all([
			config.isUsingAlbums && this.update(db.albums, this.loadAlbums.bind(this)),
			config.isUsingArtists && this.update(db.artists, this.loadArtists.bind(this)),
			config.isUsingPlaylist && this.update(db.playlists, this.loadPlaylists.bind(this)),
			config.isUsingTracks && this.update(db.tracks, this.loadTracks.bind(this))
		]).catch(this.clear)
		await db.configUpdate({ librarySyncedAt: new Date() })
	}

	private async update<T extends DBEntity>(
		table: Table,
		loader: () => AsyncGenerator<T[]>
	): Promise<void> {
		for await (const batch of loader()) {
			if (batch.length === 0) return

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
				isActive: true,
				spotifyId: album.id,
				spotifyUri: album.uri
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
				isActive: true,
				spotifyId: artist.id,
				spotifyUri: artist.uri
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
					isActive: true,
					spotifyId: playlist.id,
					spotifyUri: playlist.uri
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
				isActive: true,
				spotifyId: track.id,
				spotifyUri: track.uri
			}))
		}
	}
}

class LibraryReader {
	constructor(private readonly maxRetries = 20) {}

	async getRandomTrack(config: Config, retries = 0): Promise<Track | null> {
		const strategies = [
			config.isUsingAlbums ? this.fromAlbums.bind(this) : null,
			config.isUsingArtists ? this.fromArtists.bind(this) : null,
			config.isUsingPlaylist ? this.fromPlaylists.bind(this) : null,
			config.isUsingTracks ? this.fromTracks.bind(this) : null
		].filter((strategy) => strategy !== null)
		if (strategies.length === 0 || retries > this.maxRetries) return null

		const track = await strategies[Math.floor(Math.random() * strategies.length)]()
		return track ? track : this.getRandomTrack(config, retries + 1)
	}

	private async getRandomRecord<T extends DBEntity>(table: Table): Promise<T | null> {
		const minId = await table.orderBy('id').first()
		const maxId = await table.orderBy('id').last()
		if (!minId || !maxId) return null

		const randomId = Math.floor(Math.random() * (maxId.id - minId.id + 1)) + minId.id
		return table.get(randomId)
	}

	private async fromAlbums(album?: SimplifiedAlbum): Promise<Track | null> {
		let tracks: SimplifiedTrack[] = []

		if (!album) {
			const record = await this.getRandomRecord(db.albums)
			if (!record) return null
			const { tracks: tracksPage, ...fullAlbum } = await spotify.albums.get(record.spotifyId)
			album = { ...fullAlbum, album_group: '' }
			tracks = tracksPage.items
		}

		if (tracks.length <= 0) tracks = (await spotify.albums.tracks(album.id)).items
		if (tracks.length <= 0) return null
		return {
			...tracks[Math.floor(Math.random() * tracks.length)],
			album,
			external_ids: { upc: '', isrc: '', ean: '' },
			popularity: 0
		}
	}

	private async fromArtists(): Promise<Track | null> {
		const artist = await this.getRandomRecord(db.artists)
		if (!artist) return null

		const albums = await Array.fromAsync(
			new Paginator<SimplifiedAlbum>(({ limit, offset }) =>
				spotify.artists.albums(artist.spotifyId, 'album,single', undefined, limit, offset)
			)
		)
		if (!albums.length) return null

		const album = albums[Math.floor(Math.random() * albums.length)]
		return this.fromAlbums(album)
	}

	private async fromPlaylists(): Promise<Track | null> {
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
		return tracks.length > 0 ? tracks[Math.floor(Math.random() * tracks.length)] : null
	}

	private async fromTracks(): Promise<Track | null> {
		const track = await this.getRandomRecord(db.tracks)
		if (!track) return null

		return await spotify.tracks.get(track.spotifyId)
	}
}
