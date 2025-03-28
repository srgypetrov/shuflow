import { liveQuery } from 'dexie'

export function stateQuery<T>(querier: () => T | Promise<T>, dependencies?: () => unknown[]) {
	const query = $state<{ value?: T }>({ value: undefined })
	$effect(() => {
		dependencies?.()
		return liveQuery(querier).subscribe((value) => {
			if (value !== undefined) query.value = value
		}).unsubscribe
	})
	return query
}

// type Getters<T extends unknown[]> = { [K in keyof T]: () => T[K] }
// type PreviousValues<T extends unknown[]> = { [K in keyof T]: T[K] | undefined }

// export function watch<T extends unknown[]>(
// 	getters: Getters<T>,
// 	callback: (...previous: PreviousValues<T>) => void | (() => void)
// ) {
// 	let previous = getters.map(() => undefined) as PreviousValues<T>

// 	$effect(() => {
// 		const current = getters.map((getter) => getter()) as T
// 		const cleanup = callback(...previous)
// 		previous = current
// 		return cleanup
// 	})
// }
