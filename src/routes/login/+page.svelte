<script lang="ts">
	import { goto } from '$app/navigation'

	function login() {
		goto('/callback')
	}
</script>

<svelte:head>
	<title>Shuflow • Shuffle Your Favorite Music</title>
</svelte:head>

<div
	class="h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-200 font-sans antialiased"
>
	<div class="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-12">
		<div class="login-card p-6 sm:p-8 md:p-10 rounded-xl w-full max-w-md space-y-6">
			<div class="text-center space-y-5">
				<img class="mx-auto" src="/logo.svg" alt="Logo" />
				<h1 class="text-3xl font-light text-gray-100">SHUFLOW</h1>
				<p class="text-gray-300/90 text-sm leading-relaxed">
					Continuous music flow from your Spotify favorites
				</p>
			</div>

			<div class="space-y-4">
				<button
					on:click={login}
					class="focusable relative flex items-center justify-center w-full py-4 px-6 rounded-lg bg-green-500/90 hover:bg-green-400 focus:bg-green-400 active:scale-[0.98] transform transition-all duration-200 font-semibold text-gray-800"
				>
					<img class="w-5 h-5 mr-3" src="/spotify.svg" alt="Spotify" />
					Continue with Spotify
				</button>

				<div
					class="flex items-center justify-center text-center text-xs text-gray-400 p-3 rounded-lg bg-black/20 border border-gray-700/50 space-x-2"
				>
					Spotify Premium subscription required
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.login-card {
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		border: 1px solid rgba(255, 255, 255, 0.15);
		box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
	}
	@supports not ((-webkit-backdrop-filter: none) or (backdrop-filter: none)) {
		.login-card {
			background: rgba(31, 41, 55, 0.85);
			border: 1px solid rgba(75, 85, 99, 0.5);
		}
	}
</style>
