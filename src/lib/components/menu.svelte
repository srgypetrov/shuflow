<script lang="ts">
	import AboutModal from '$lib/components/about.svelte'
	import Modal from '$lib/components/modal.svelte'
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
	let showAbout = $state(false)
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

	function onAboutButtonClick() {
		show = false
		showAbout = true
	}

	function onLogoutButtonClick() {
		show = false
		showLogoutConfirmation = true
	}
</script>

<div class="relative" bind:this={containerRef}>
	<button
		class="flex items-center gap-1.5 rounded-md p-1.5 text-lg font-light tracking-wider opacity-100 transition-all hover:bg-white/10 focus:outline-none"
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
			class="absolute right-0 z-20 mt-2 w-auto min-w-40 overflow-hidden rounded-md border-2 border-[rgba(69,69,69,0.37)] shadow-lg"
			style="background-color: {color};"
			transition:fly={{ y: -5, duration: 150, easing: quintOut }}
		>
			<button
				class="block w-full bg-black/30 px-4 py-2 text-left hover:bg-black/10 focus:outline-none"
				onclick={onAboutButtonClick}
			>
				About
			</button>
			<button
				class="block w-full bg-black/30 px-4 py-2 text-left hover:bg-black/10 focus:outline-none"
				onclick={onLogoutButtonClick}
			>
				Logout
			</button>
		</div>
	{/if}
</div>

<AboutModal bind:isOpen={showAbout} />

<Modal bind:isOpen={showLogoutConfirmation} title="Logout">
	{#snippet children()}
		<p>
			Are you sure you want to log out? This will clear all downloaded metadata and reset your
			settings.
		</p>
	{/snippet}
	{#snippet actions()}
		<button
			onclick={() => (showLogoutConfirmation = false)}
			class="rounded-lg bg-gray-700 px-4 py-2 text-gray-300 transition-colors hover:bg-gray-600 focus:outline-none"
		>
			Cancel
		</button>
		<button
			onclick={logout}
			class="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 focus:outline-none"
		>
			Confirm
		</button>
	{/snippet}
</Modal>
