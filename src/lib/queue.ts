/**
 * A thin queue wrapper that maintains its own playback history.
 *
 * We can't rely on Spotify's queue directly because it doesn't expose or retain
 * playback history - once a track has been played there is no built-in way to step
 * back to it through the queue. To support going "back" to previous items, this
 * queue stores items internally as they are fetched.
 *
 * Additionally, we cannot rely on Spotify's queue for upcoming tracks: when combined with
 * Player API endpoints, the execution order may be non-deterministic, which leads to
 * unstable behavior. This local queue ensures deterministic next/previous behavior and
 * consistent history.
 *
 */
export class Queue<T> {
	private index = 0
	private items: T[] = []
	private promise: Promise<void> | null = null
	private reverse = false
	private stopped = false

	constructor(
		private manager: { next(): Promise<T | null> },
		private size = 5
	) {}

	private schedule(): void {
		if (this.promise || this.stopped) return
		this.promise = this.manager.next().then((item) => {
			this.promise = null
			if (this.stopped || item === null) return
			this.items.push(item)
			if (this.items.length - this.index < this.size) this.schedule()
		})
	}

	async next(): Promise<T | null> {
		if (this.index >= this.items.length) {
			this.schedule()
			await this.promise
		}

		if (this.index < this.items.length) {
			if (this.reverse) {
				this.reverse = false
				this.index++
			}
			const item = this.items[this.index++]
			this.schedule()
			return item
		}

		return null
	}

	previous(): T | null {
		if (this.index <= 0) return null
		this.reverse = true
		return this.items[--this.index]
	}

	async stop(): Promise<void> {
		this.stopped = true
		if (this.promise) await this.promise
	}
}
