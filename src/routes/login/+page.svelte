<script lang="ts">
	import { goto } from '$app/navigation'
	import AboutModal from '$lib/components/about.svelte'

	let showAbout = $state(false)

	function login() {
		goto('/callback')
	}
</script>

<svelte:head>
	<title>Shuflow • Your Favorites on Shuffle</title>
</svelte:head>

<div
	class="h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black font-sans text-gray-200 antialiased"
>
	<div class="absolute right-4 top-4">
		<button
			onclick={() => (showAbout = true)}
			class="text-gray-400 hover:text-white"
			aria-label="About Shuflow"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
		</button>
	</div>

	<div class="flex min-h-screen items-center justify-center p-4 sm:p-6 md:p-12">
		<div class="w-full max-w-md space-y-6 rounded-xl p-6 sm:p-8 md:p-10">
			<div class="space-y-5 text-center">
				<svg class="mx-auto size-24" viewBox="26 13 68 94">
					<rect width="16" height="60" x="28" y="30" fill="#22C55E" rx="3" />
					<rect width="16" height="90" x="52" y="15" fill="#8B5CF6" rx="3" />
					<rect width="16" height="30" x="76" y="45" fill="#22C55E" rx="3" />
				</svg>
				<h1 class="text-3xl font-light text-gray-100">SHUFLOW</h1>
				<p class="text-sm leading-relaxed text-gray-300/90">
					Continuous music flow from your Spotify favorites
				</p>
			</div>

			<div class="space-y-4">
				<button
					onclick={login}
					class="focusable relative flex w-full transform items-center justify-center rounded-lg bg-green-500/90 px-6 py-4 font-semibold text-gray-800 transition-all duration-200 hover:bg-green-400 focus:bg-green-400 active:scale-[0.98]"
				>
					<svg class="mr-3 size-5" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.76-1.68-6.24-2.04-10.38-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.4-.6 11.4 1.32.42.24.48.66.24 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.18-1.92-8.04-2.46-11.82-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14 4.2-1.26 9.48-.66 13.02 1.56.42.24.54.84.3 1.26zm.12-3.36C15.24 8.4 8.28 8.16 4.2 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.68-1.44 12.24-1.14 16.8 1.74.54.3.72 1.02.42 1.56-.3.48-1.02.66-1.56.42z"
						/>
					</svg>
					Continue with Spotify
				</button>

				<div
					class="flex items-center justify-center space-x-2 rounded-lg border border-gray-700/50 bg-black/20 p-3 text-center text-xs text-gray-400"
				>
					Spotify Premium subscription required
				</div>
			</div>
		</div>
	</div>
</div>

<AboutModal bind:isOpen={showAbout} />
