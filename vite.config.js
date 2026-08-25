import { defineConfig } from 'vite';

// Em produção o site é servido a partir de um subdiretório do GitHub
// Pages (https://<usuario>.github.io/interactive-3d-Rubiks-Cube/), por
// isso o base muda conforme o modo. Em desenvolvimento fica na raiz para
// bater com o servidor local do Vite.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/interactive-3d-Rubiks-Cube/' : '/',
}));