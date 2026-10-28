import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Loopback only: this prototype has no authentication, so it must not be
// reachable from other machines. Use an SSH tunnel if someone else needs it.
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  test: { include: ['src/**/*.test.{ts,tsx}'], environment: 'node' },
});
