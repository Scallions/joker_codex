import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { DEFAULT_DEPLOYMENT_BASE, validateDeploymentBase } from './src/deploymentBase';

const deploymentBase = validateDeploymentBase(
  process.env.VITE_BASE_PATH ?? DEFAULT_DEPLOYMENT_BASE,
);

export default defineConfig({
  base: deploymentBase,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4173,
  },
});
