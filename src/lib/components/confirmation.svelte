<script lang="ts">
	import { fade } from 'svelte/transition'

	type Props = {
		action: () => void
		isOpen: boolean
	}
	let { isOpen = $bindable(), action }: Props = $props()

	function handleConfirm() {
		action()
		isOpen = false
	}

	function handleCancel() {
		isOpen = false
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleCancel()
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
			<h2 id="modal-title" class="mb-4 text-xl font-semibold text-white">Logout</h2>
			<p class="mb-6 text-gray-300">
				Are you sure you want to log out? This will clear all downloaded metadata and reset your
				settings.
			</p>
			<div class="flex justify-end space-x-3">
				<button
					onclick={handleCancel}
					class="rounded-lg bg-gray-700 px-4 py-2 text-gray-300 transition-colors hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
				>
					Cancel
				</button>
				<button
					onclick={handleConfirm}
					class="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
				>
					Confirm
				</button>
			</div>
		</div>
	</div>
{/if}
