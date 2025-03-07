import type { MaxInt, Page } from '@spotify/web-api-ts-sdk'

type PaginationParams = { limit: MaxInt<50>; offset?: number; after?: string }

export class Paginator<T> implements AsyncIterable<T | T[]> {
	private nextPage: string | null = null
	private nextType: 'offset' | 'after' | null = null

	constructor(
		private readonly fetcher: (params: PaginationParams) => Promise<Page<T>>,
		private readonly limit: MaxInt<50> = 50
	) {}

	async *[Symbol.asyncIterator](): AsyncGenerator<T> {
		for await (const batch of this.batches()) yield* batch
	}

	async *batches(): AsyncIterableIterator<T[]> {
		while (true) {
			const response = await this.fetcher(this.getPaginationParams())

			yield response.items

			if (response.next && !this.nextType) {
				this.nextType = response.next.includes('after=') ? 'after' : 'offset'
			}

			if (!response.next || response.items.length !== this.limit) break

			this.nextPage = response.next
		}
	}

	private getPaginationParams = () => {
		const params: PaginationParams = { limit: this.limit }
		if (!this.nextPage) return params

		if (this.nextType === 'offset') {
			params.offset = Number(this.getNextParam(this.nextPage, 'offset'))
		} else if (this.nextType === 'after') {
			params.after = this.getNextParam(this.nextPage, 'after')
		}
		return params
	}

	private getNextParam = (url: string, param: string) => {
		const match = url.match(new RegExp(`${param}=([^&]*)`))
		return match ? decodeURIComponent(match[1]) : undefined
	}
}
