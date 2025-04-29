<script lang="ts">
	import { onMount } from 'svelte'

	import { goto } from '$app/navigation'

	import { spotify } from '$lib/spotify'

	onMount(async () => {
		const response = await spotify.authenticate()

		if (response.authenticated) {
			goto('/')
		} else {
			goto('/login')
		}
	})
</script>
