
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy'


export default defineConfig({
    base: '/paella-iframe/',
    // https://vitejs.dev/guide/dep-pre-bundling.html#monorepos-and-linked-dependencies
    optimizeDeps: {
        include: ['paella-iframe-plugin'],
    },
    build: {
        rollupOptions: {
            input: {
                index: 'index.html',
                paella: 'player/index.html'
            }
        },
        commonjsOptions: {
            include: [/paella-iframe-plugin/, /node_modules/],
        },
    },
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: '../../node_modules/paella-embedapi/dist/paella-embedapi-youtube.iife.js',
                    dest: 'js'
                },
                {
                    src: '../../node_modules/paella-skins/skins/opencast',
                    dest: 'player/skins'
                }
            ]
        })
    ]


})
