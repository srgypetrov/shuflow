import { liveQuery as dexieLiveQuery } from 'dexie'

export function liveQueries<T>(queries: Record<string, () => T | Promise<T>>) {
	const queriesState = $state<{ [key: string]: T }>({})

	$effect(() => {
		const subscriptions = Object.entries(queries).map(([key, querier]) =>
			dexieLiveQuery(querier).subscribe((value) => {
				if (value !== undefined) queriesState[key] = value
			})
		)
		return () => subscriptions.forEach((sub) => sub.unsubscribe())
	})

	return queriesState
}

export function throttle(callback: (...args: unknown[]) => unknown, delay = 500) {
	let throttled = false
	return (...args: unknown[]) => {
		if (throttled) return
		throttled = true
		callback(...args)
		setTimeout(() => (throttled = false), delay)
	}
}
