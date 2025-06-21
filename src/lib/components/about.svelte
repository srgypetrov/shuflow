<script lang="ts">
	import Modal from '$lib/components/modal.svelte'

	let { isOpen = $bindable() }: { isOpen: boolean } = $props()
</script>

<Modal bind:isOpen title="About Shuflow">
	{#snippet children()}
		<div class="space-y-4">
			<p>
				Shuflow seamlessly shuffles your liked songs, albums, artists, and playlists from Spotify to
				create a personalized radio just for you.
			</p>
			<p>
				This app is serverless and doesn't store any of your data. Everything runs directly on your
				device.
			</p>
			<p>Just press play and enjoy the music!</p>
		</div>
	{/snippet}
	{#snippet actions()}
		<a
			href="https://docs.google.com/forms/d/e/1FAIpQLScWk4cE7DfGsUSnk7y4s-vTWxdUsYy2YU7k1sV21IFRn0wpug/viewform?usp=dialog"
			target="_blank"
			rel="noopener noreferrer"
			class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
		>
			Feedback
		</a>
		<button
			onclick={() => (isOpen = false)}
			class="rounded-lg bg-gray-700 px-4 py-2 text-gray-300 transition-colors hover:bg-gray-600"
		>
			Close
		</button>
	{/snippet}
</Modal>
