import type { Page, SpotifyApi } from '@spotify/web-api-ts-sdk'
import { type Table } from 'dexie'

import type { Config, DBAlbum, DBArtist, DBPlaylist, DBTrack } from '$lib/db'
import { db } from '$lib/db'

type DBEntity = DBAlbum | DBArtist | DBPlaylist | DBTrack

const PAGINATION_LIMIT = 50

export class LibraryManager {
	private reader: LibraryReader
	private writer: LibraryWriter

	constructor(private spotify: SpotifyApi) {
		this.reader = new LibraryReader()
		this.writer = new LibraryWriter(spotify)
	}

	async reset(): Promise<void> {
		const config = await db.configGetOrCreate()
		await this.writer.clear()
		await this.writer.sync(config)
	}

	async sync(force = false): Promise<void> {
		const config = await db.configGetOrCreate()
		if (!force && !this.isSyncNeeded(config)) return
		await this.writer.sync(config)
	}

	private isSyncNeeded(config: Config): boolean {
		const diff = new Date().getTime() - config.librarySyncedAt.getTime()
		return diff > 1000 * 60 * 60 * 24
	}
}

class LibraryWriter {
	constructor(private spotify: SpotifyApi) {}

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
			config.isUsingAlbums && this.load(db.albums, this.loadAlbums.bind(this)),
			config.isUsingArtists && this.load(db.artists, this.loadArtists.bind(this)),
			config.isUsingPlaylist && this.load(db.playlists, this.loadPlaylists.bind(this)),
			config.isUsingTracks && this.load(db.tracks, this.loadTracks.bind(this))
		]).catch(this.clear)
		await db.configUpdate({ librarySyncedAt: new Date() })
	}

	private async load<T extends DBEntity>(
		table: Table,
		loader: () => AsyncGenerator<T[]>
	): Promise<void> {
		for await (const batch of loader()) {
			if (batch.length === 0) return

			const exists = await table
				.where('spotifyId')
				.anyOf(batch.map((i) => i.spotifyId))
				.first()

			await table.bulkPut(batch)

			if (exists) return
		}
	}

	private async *loadArtists(): AsyncGenerator<DBArtist[]> {
		let after: string | undefined

		do {
			const response = await this.spotify.currentUser.followedArtists(after, PAGINATION_LIMIT)
			yield response.artists.items.map(
				(artist) =>
					({
						spotifyId: artist.id,
						spotifyUri: artist.uri
					}) as DBArtist
			)
			after = this.getAfterParam(response.artists)
		} while (after)
	}

	private async *loadAlbums(): AsyncGenerator<DBAlbum[]> {
		let offset: number | undefined

		do {
			const response = await this.spotify.currentUser.albums.savedAlbums(PAGINATION_LIMIT, offset)
			yield response.items.map(
				({ album }) =>
					({
						spotifyId: album.id,
						spotifyUri: album.uri
					}) as DBAlbum
			)
			offset = this.getOffsetParam(response)
		} while (offset)
	}

	private async *loadTracks(): AsyncGenerator<DBTrack[]> {
		let offset: number | undefined

		do {
			const response = await this.spotify.currentUser.tracks.savedTracks(PAGINATION_LIMIT, offset)
			yield response.items.map(
				({ track }) =>
					({
						spotifyId: track.id,
						spotifyUri: track.uri
					}) as DBTrack
			)
			offset = this.getOffsetParam(response)
		} while (offset)
	}

	private async *loadPlaylists(): AsyncGenerator<DBPlaylist[]> {
		let offset: number | undefined

		do {
			const response = await this.spotify.currentUser.playlists.playlists(PAGINATION_LIMIT, offset)
			yield response.items.map(
				(playlist) =>
					({
						spotifyId: playlist.id,
						spotifyUri: playlist.uri
					}) as DBPlaylist
			)
			offset = this.getOffsetParam(response)
		} while (offset)
	}

	private getAfterParam(page: Page<unknown>): string | undefined {
		if (!page.next) return undefined
		const match = page.next.match(/after=([^&]*)/)
		return match ? decodeURIComponent(match[1]) : undefined
	}

	private getOffsetParam(page: Page<unknown>): number | undefined {
		if (!page.next) return undefined
		const match = page.next.match(/offset=([^&]*)/)
		return match ? Number(decodeURIComponent(match[1])) : undefined
	}
}

class LibraryReader {
	static async getRandomTrack(): Promise<Track | null> {
		const strategy = [
			this.selectFromArtists,
			this.selectFromAlbums,
			this.selectFromPlaylists,
			this.selectDirectly
		][Math.floor(Math.random() * 4)]

		return strategy().catch(() => this.selectDirectly())
	}

	private static async selectFromArtists(): Promise<Track | null> {
		const artist = await db.artists
			.orderBy(':id')
			.offset(Math.random() * (await db.artists.count()))
			.first()
		if (!artist) return null

		const albums = await db.albums.where('artistIds').equals(artist.id).toArray()
		if (!albums.length) return null

		const album = albums[Math.floor(Math.random() * albums.length)]
		return this.selectFromAlbum(album.id)
	}

	private static async selectFromAlbums(): Promise<Track | null> {
		const album = await db.albums
			.orderBy(':id')
			.offset(Math.random() * (await db.albums.count()))
			.first()
		return album ? this.selectFromAlbum(album.id) : null
	}

	private static async selectFromAlbum(albumId: string): Promise<Track | null> {
		return db.tracks
			.where('albumId')
			.equals(albumId)
			.offset(Math.random() * (await db.tracks.where('albumId').equals(albumId).count()))
			.first()
	}

	private static async selectFromPlaylists(): Promise<Track | null> {
		const playlist = await db.playlists
			.orderBy(':id')
			.offset(Math.random() * (await db.playlists.count()))
			.first()
		if (!playlist?.trackIds?.length) return null

		const trackId = playlist.trackIds[Math.floor(Math.random() * playlist.trackIds.length)]
		return db.tracks.get(trackId) ?? null
	}

	private static async selectDirectly(): Promise<Track | null> {
		return db.tracks
			.orderBy(':id')
			.offset(Math.random() * (await db.tracks.count()))
			.first()
	}
}
