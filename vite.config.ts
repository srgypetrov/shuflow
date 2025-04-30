import { sveltekit } from '@sveltejs/kit/vite'
import { SvelteKitPWA } from '@vite-pwa/sveltekit'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			manifest: {
				theme_color: '#22304E',
				background_color: '#22304E',
				icons: [
					{
						src: '/logo.svg',
						sizes: 'any',
						type: 'image/svg+xml'
					}
				],
				name: 'Shuflow',
				short_name: 'Shuflow'
			}
		})
	],
	server: { host: '127.0.0.1' }
})
