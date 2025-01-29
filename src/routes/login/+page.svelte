<script lang="ts">
	import { goto } from '$app/navigation'

	function login() {
		goto('/callback')
	}
</script>

<div class="flex min-h-screen items-center justify-center">
	<button
		class="rounded-full bg-green-500 px-6 py-3 text-white transition-colors hover:bg-green-600"
		on:click={login}
	>
		Войти через Spotify
	</button>
</div>
