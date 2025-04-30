<script lang="ts">
	import { pwaAssetsHead } from 'virtual:pwa-assets/head'
	import { pwaInfo } from 'virtual:pwa-info'

	import '../app.css'

	let { children } = $props()

	let webManifestLink = $state('')

	$effect(() => {
		webManifestLink = pwaInfo?.webManifest.linkTag ?? ''
	})
</script>

<svelte:head>
	{#if pwaAssetsHead.themeColor}
		<meta name="theme-color" content={pwaAssetsHead.themeColor.content} />
	{/if}
	{#each pwaAssetsHead.links as link}
		<link {...link} />
	{/each}
	{@html webManifestLink}
</svelte:head>

{@render children()}
