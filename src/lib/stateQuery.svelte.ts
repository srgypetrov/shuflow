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
