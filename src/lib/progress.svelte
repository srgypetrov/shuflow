<script lang="ts">
	type Props = {
		duration: number
		position: number
		onPositionUpdate: (position: number) => void
	}

	let { duration, position, onPositionUpdate = (_: number) => {} }: Props = $props()
	let positionCurrent = $state(position)
	let isSeeking = $state(false)
	let isWaitingForNewPosition = $state(false)

	let divElement: HTMLDivElement

	$effect(() => {
		if (isWaitingForNewPosition) {
			if (Math.abs(positionCurrent - position) > 1000) return
			isWaitingForNewPosition = false
		}
		if (!isSeeking) positionCurrent = position
	})

	const calculatePosition = (event: PointerEvent) => {
		const rect = divElement.getBoundingClientRect()
		const x = event.clientX - rect.left
		const position = Math.floor((x / rect.width) * duration)
		return Math.min(position, duration)
	}

	const formatTime = (ms: number) => {
		const minutes = Math.floor(ms / 60000)
		const seconds = Math.floor((ms % 60000) / 1000)
		return `${minutes}:${seconds.toString().padStart(2, '0')}`
	}

	const onSeeking = (event: PointerEvent) => {
		if (isSeeking) positionCurrent = calculatePosition(event)
	}

	const onSeekStart = (event: PointerEvent) => {
		isSeeking = true
		positionCurrent = calculatePosition(event)
	}

	const onSeekStop = () => {
		if (!isSeeking) return
		isSeeking = false
		isWaitingForNewPosition = true
		onPositionUpdate(positionCurrent)
	}
</script>

<!-- Progress -->
<div class="mb-2 space-y-2 relative">
	<div
		bind:this={divElement}
		onpointerdown={onSeekStart}
		onpointerup={onSeekStop}
		onpointerleave={onSeekStop}
		onpointermove={onSeeking}
		role="slider"
		aria-valuemin={0}
		aria-valuemax={duration}
		aria-valuenow={positionCurrent}
		class="relative cursor-pointer py-2 group"
	>
		<div
			class="absolute inset-x-0 top-1/2 h-1 bg-white/10 rounded-full transform -translate-y-1/2"
		></div>
		<div
			class="absolute left-0 top-1/2 h-1 bg-white transition-all duration-100 rounded-full transform -translate-y-1/2 group-hover:bg-white/70"
			style:width={`${(positionCurrent / duration) * 100 || 0}%`}
		></div>
	</div>

	<div class="mt-1 flex justify-between text-xs opacity-75">
		<span>{formatTime(positionCurrent)}</span>
		<span>{formatTime(duration)}</span>
	</div>
</div>
