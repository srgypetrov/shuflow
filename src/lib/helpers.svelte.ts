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

export function debounce(callback: (...args: unknown[]) => unknown, wait = 500) {
	let timeout: ReturnType<typeof setTimeout>

	return (...args: unknown[]) => {
		clearTimeout(timeout)
		timeout = setTimeout(() => callback(...args), wait)
	}
}
