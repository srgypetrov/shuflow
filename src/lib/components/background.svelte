<script lang="ts">
	import { tick } from 'svelte'

	type Props = {
		colors: string[]
	}
	let { colors }: Props = $props()

	let colorsPrevious = $state([...colors])
	let isColorsChanged = $state(false)

	$effect(() => {
		if (colors[0] !== colorsPrevious[0] || colors[1] !== colorsPrevious[1]) {
			isColorsChanged = true

			const timer = setTimeout(async () => {
				colorsPrevious = [...colors]
				isColorsChanged = false
				await tick()
			}, 500)

			return () => {
				clearTimeout(timer)
			}
		}
	})
</script>

<!-- Background Layer (Old Colors) -->
<div
	class="absolute inset-0 -z-10"
	style="background-image: linear-gradient(to bottom right, {colorsPrevious.join(', ')});"
></div>
<!-- Background Layer (New Colors - Fades In) -->
<div
	class="absolute inset-0 -z-10 transition-opacity duration-[500ms] ease-in-out"
	class:opacity-100={isColorsChanged}
	class:opacity-0={!isColorsChanged}
	style="background-image: linear-gradient(to bottom right, {colors.join(', ')});"
></div>
<!-- Overlay to keep text and controls readable -->
<div class="pointer-events-none absolute inset-0 -z-10 bg-black/50"></div>
