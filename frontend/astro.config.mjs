import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
    server: { port: 4321 },
    publicDir: './src/public',
    integrations: [react()],
    vite: {
        server: {
            proxy: {
                '/api': 'http://localhost:3001',
            },
        },
    },
});
