import type { EntityTable, InsertType, Table, UpdateSpec } from 'dexie'
import Dexie, { Entity } from 'dexie'

const VERSION = 1

class AlbumTable extends Entity<DB> {
	id!: number
	isActive!: boolean
	name!: string
	spotifyId!: string
	spotifyUri!: string
}

class ArtistTable extends Entity<DB> {
	id!: number
	isActive!: boolean
	name!: string
	spotifyId!: string
	spotifyUri!: string
}

class PlaylistTable extends Entity<DB> {
	id!: number
	isActive!: boolean
	name!: string
	spotifyId!: string
	spotifyUri!: string
}

class TrackTable extends Entity<DB> {
	id!: number
	isActive!: boolean
	name!: string
	spotifyId!: string
	spotifyUri!: string
}

class ConfigTable extends Entity<DB> {
	id!: number
	isUsingAlbums!: boolean
	isUsingArtists!: boolean
	isUsingPlaylist!: boolean
	isUsingTracks!: boolean
	libraryCreatedAt!: Date
	librarySyncedAt!: Date
}

class DB extends Dexie {
	albums!: EntityTable<AlbumTable, 'id'>
	artists!: EntityTable<ArtistTable, 'id'>
	playlists!: EntityTable<PlaylistTable, 'id'>
	tracks!: EntityTable<TrackTable, 'id'>

	protected config!: EntityTable<Config, 'id'>

	constructor() {
		super('ShuflowLibrary')
		this.version(VERSION).stores({
			albums: '++id, isActive, &spotifyId',
			artists: '++id, isActive, &spotifyId',
			config: 'id',
			playlists: '++id, isActive, &spotifyId',
			tracks: '++id, isActive, &spotifyId'
		})
		this.albums.mapToClass(AlbumTable)
		this.artists.mapToClass(ArtistTable)
		this.config.mapToClass(ConfigTable)
		this.playlists.mapToClass(PlaylistTable)
		this.tracks.mapToClass(TrackTable)
	}

	async configGetOrCreate(): Promise<Config> {
		return db.transaction('rw', this.config, async () => {
			let config = await this.config.get(VERSION)
			if (!config) {
				config = {
					id: VERSION,
					isUsingAlbums: true,
					isUsingArtists: true,
					isUsingPlaylist: true,
					isUsingTracks: true,
					libraryCreatedAt: new Date()
				} as Config
				await this.config.add(config)
			}
			return config
		})
	}

	async configUpdate(config: UpdateSpec<InsertType<Config, 'id'>>) {
		await this.config.update(VERSION, config)
	}
}

export const db = new DB()
export type Config = InsertType<ConfigTable, 'id'>
export type DBAlbum = InsertType<AlbumTable, 'id'>
export type DBArtist = InsertType<ArtistTable, 'id'>
export type DBPlaylist = InsertType<PlaylistTable, 'id'>
export type DBTrack = InsertType<TrackTable, 'id'>
export type DBEntity = DBAlbum | DBArtist | DBPlaylist | DBTrack
export type EntityName = keyof {
	[K in keyof DB as DB[K] extends Table<unknown> ? K : never]: never
}
