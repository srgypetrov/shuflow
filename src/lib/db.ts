import type { Collection, EntityTable, InsertType } from 'dexie'
import Dexie, { Entity } from 'dexie'

const VERSION = 1

export const enum Binary {
	OFF = 0,
	ON = 1
}

class AlbumTable extends Entity<DB> {
	id!: number
	isActive!: Binary
	name!: string
	spotifyId!: string
}

class ArtistTable extends Entity<DB> {
	id!: number
	isActive!: Binary
	name!: string
	spotifyId!: string
}

class PlaylistTable extends Entity<DB> {
	id!: number
	isActive!: Binary
	name!: string
	spotifyId!: string
}

class TrackTable extends Entity<DB> {
	id!: number
	isActive!: Binary
	name!: string
	spotifyId!: string
}

class ConfigTable extends Entity<DB> {
	id!: number
	isUsingAlbums!: boolean
	isUsingArtists!: boolean
	isUsingPlaylists!: boolean
	isUsingTracks!: boolean
	libraryCreatedAt!: Date
	librarySyncedAt!: Date
}

export type Config = InsertType<ConfigTable, 'id'>
export type DBAlbum = InsertType<AlbumTable, 'id'>
export type DBArtist = InsertType<ArtistTable, 'id'>
export type DBPlaylist = InsertType<PlaylistTable, 'id'>
export type DBTrack = InsertType<TrackTable, 'id'>
export type DBEntity = DBAlbum | DBArtist | DBPlaylist | DBTrack

class DB extends Dexie {
	albums!: EntityTable<AlbumTable, 'id'>
	artists!: EntityTable<ArtistTable, 'id'>
	playlists!: EntityTable<PlaylistTable, 'id'>
	tracks!: EntityTable<TrackTable, 'id'>

	protected _config!: EntityTable<ConfigTable, 'id'>

	constructor() {
		super('ShuflowLibrary')
		this.version(VERSION).stores({
			_config: 'id',
			albums: '++id, isActive, &spotifyId',
			artists: '++id, isActive, &spotifyId',
			playlists: '++id, isActive, &spotifyId',
			tracks: '++id, isActive, &spotifyId'
		})
		this._config.mapToClass(ConfigTable)
		this.albums.mapToClass(AlbumTable)
		this.artists.mapToClass(ArtistTable)
		this.playlists.mapToClass(PlaylistTable)
		this.tracks.mapToClass(TrackTable)
	}

	async init() {
		const config = {
			id: VERSION,
			isUsingAlbums: true,
			isUsingArtists: true,
			isUsingPlaylists: true,
			isUsingTracks: true,
			libraryCreatedAt: new Date()
		} as Config
		await this._config.add(config, VERSION)
	}

	get config(): Collection {
		return this._config.where('id').equals(VERSION)
	}
}

export const db = new DB()
