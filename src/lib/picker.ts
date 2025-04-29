export class Picker {
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
