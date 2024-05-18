import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default [
    {
        input: 'src/main_paella.ts',
        output: [
            {
                file: 'dist/paella-embedapi.esm.js',
                format: 'esm',
                sourcemap: true
                // plugins: [terser()]
            },
            {
                file: 'dist/paella-embedapi.iife.js',
                format: 'iife',
                sourcemap: true,
                name: 'PaellaEmbedApi'
                // plugins: [terser()]
            },
        ],
        plugins: [typescript()]
    },
    {
        input: 'src/main_youtube.ts',
        output: [
            {
                file: 'dist/paella-embedapi-youtube.iife.js',
                format: 'iife',
                sourcemap: true,
                name: 'YT',
                // plugins: [terser()]
            }
        ],
        plugins: [typescript()]
    }
];
