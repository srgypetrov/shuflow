import Dexie, { Entity, type EntityTable, type InsertType, type UpdateSpec } from 'dexie'

const VERSION = 1

class DBAlbum extends Entity<DB> {
	id!: number
	isActive!: boolean
	name!: string
	spotifyId!: string
	spotifyUri!: string
}

class DBArtist extends Entity<DB> {
	id!: number
	isActive!: boolean
	name!: string
	spotifyId!: string
	spotifyUri!: string
}

class DBPlaylist extends Entity<DB> {
	id!: number
	isActive!: boolean
	name!: string
	spotifyId!: string
	spotifyUri!: string
}

class DBTrack extends Entity<DB> {
	id!: number
	isActive!: boolean
	name!: string
	spotifyId!: string
	spotifyUri!: string
}

class Config extends Entity<DB> {
	id!: number
	isUsingAlbums!: boolean
	isUsingArtists!: boolean
	isUsingPlaylist!: boolean
	isUsingTracks!: boolean
	libraryCreatedAt!: Date
	librarySyncedAt!: Date
}

class DB extends Dexie {
	albums!: EntityTable<DBAlbum, 'id'>
	artists!: EntityTable<DBArtist, 'id'>
	playlists!: EntityTable<DBPlaylist, 'id'>
	tracks!: EntityTable<DBTrack, 'id'>

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
		this.albums.mapToClass(DBAlbum)
		this.artists.mapToClass(DBArtist)
		this.config.mapToClass(Config)
		this.playlists.mapToClass(DBPlaylist)
		this.tracks.mapToClass(DBTrack)
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
					libraryCreatedAt: new Date(),
					librarySyncedAt: new Date()
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
export type { Config, DBAlbum, DBArtist, DBPlaylist, DBTrack }
