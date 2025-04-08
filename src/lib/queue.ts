export class Queue<T> {
	private index = 0
	private items: T[] = []
	private promise: Promise<void> | null = null
	private reverse = false

	constructor(
		private manager: { next(): Promise<T | null> },
		private size = 20
	) {}

	private schedule(): void {
		if (this.promise) return
		this.promise = this.manager.next().then((item) => {
			this.promise = null
			if (item === null) return
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
}
