<script lang="ts">
	import type { Snippet } from 'svelte'
	import { fade } from 'svelte/transition'

	type Props = {
		isOpen: boolean
		title: string
		children?: Snippet
		actions?: Snippet
	}
	let { isOpen = $bindable(), title, children, actions }: Props = $props()

	function handleClose() {
		isOpen = false
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose()
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<div
			class="mx-4 w-full max-w-md rounded-lg bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6 shadow-xl shadow-white/10"
			role="document"
		>
			<h2 id="modal-title" class="mb-4 text-xl font-semibold text-white">{title}</h2>
			{#if children}
				<div class="mb-6 text-gray-300">
					{@render children()}
				</div>
			{/if}
			{#if actions}
				<div class="flex justify-end space-x-3">
					{@render actions()}
				</div>
			{/if}
		</div>
	</div>
{/if}
