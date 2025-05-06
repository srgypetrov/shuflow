<script lang="ts">
	import { onMount } from 'svelte'

	import { goto } from '$app/navigation'

	import { LibraryManager } from '$lib/manager.svelte'
	import { spotify } from '$lib/spotify'

	let manager = new LibraryManager()

	onMount(async () => {
		const response = await spotify.authenticate()

		if (response.authenticated) {
			await manager.create()
			goto('/')
		} else {
			goto('/login')
		}
	})
</script>
