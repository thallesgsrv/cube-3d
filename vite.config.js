import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/interactive-3d-Rubiks-Cube/' : '/',
}));
