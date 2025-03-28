import { liveQuery } from 'dexie'

export function stateQuery<T>(
	queries: Record<string, () => T | Promise<T>>,
	dependencies?: () => unknown[]
) {
	const queryState = $state<{ [key: string]: T | undefined }>({})

	$effect(() => {
		dependencies?.()
		const subscriptions = Object.entries(queries).map(([key, querier]) =>
			liveQuery(querier).subscribe((value) => {
				if (value !== undefined) queryState[key] = value
			})
		)
		return () => subscriptions.forEach((sub) => sub.unsubscribe())
	})

	return queryState
}
