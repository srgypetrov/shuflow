<script lang="ts">
	import LogoutConfirmationModal from '$lib/components/confirmation.svelte'
	import { onMount } from 'svelte'
	import { quintOut } from 'svelte/easing'
	import { fly } from 'svelte/transition'
	import tinycolor from 'tinycolor2'

	type Props = {
		colors: string[]
		logout: () => void
	}
	let { colors, logout }: Props = $props()

	let color = $derived(tinycolor.mix(colors[0], colors[1], 50).toHexString())
	let show = $state(false)
	let showLogoutConfirmation = $state(false)

	let containerRef: HTMLDivElement | null = null

	onMount(() => {
		document.addEventListener('keydown', onKeydown)
		document.addEventListener('click', onClickOutside, true) // Use capture phase

		return () => {
			document.removeEventListener('keydown', onKeydown)
			document.removeEventListener('click', onClickOutside, true)
		}
	})

	function toggle() {
		show = !show
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && show) {
			show = false
		}
	}

	function onClickOutside(event: MouseEvent) {
		if (show && containerRef && !containerRef.contains(event.target as Node)) {
			show = false
		}
	}

	function onLogoutButtonClick() {
		show = false
		showLogoutConfirmation = true
	}
</script>

<div class="relative" bind:this={containerRef}>
	<button
		class="flex items-center gap-1.5 rounded-md p-1.5 text-lg font-light tracking-wider opacity-100 transition-all hover:bg-white/10"
		onclick={toggle}
	>
		<svg class="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			{#if show}
				<path stroke-linecap="round" stroke-width="1.3" d="M6 6l12 12M6 18L18 6" />
			{:else}
				<path stroke-linecap="round" stroke-width="1.3" d="M4 6h16M4 12h16M4 18h16" />
			{/if}
		</svg>
	</button>

	{#if show}
		<div
			class="absolute right-0 z-20 mt-2 w-auto min-w-40 rounded-md shadow-lg ring-1 ring-black/10"
			style="background-color: {color};"
			transition:fly={{ y: -5, duration: 150, easing: quintOut }}
		>
			<button
				class="block w-full rounded-md border-2 border-white/10 bg-black/30 px-4 py-2 text-left hover:bg-black/10"
				onclick={onLogoutButtonClick}
			>
				Logout
			</button>
		</div>
	{/if}
</div>

<LogoutConfirmationModal bind:isOpen={showLogoutConfirmation} action={logout} />
