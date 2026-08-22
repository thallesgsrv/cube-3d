import { RubiksCube } from './RubiksCube.js';
import { CubeRenderer } from './CubeRenderer.js';
import { CubeController } from './CubeController.js';
import { UI } from './UI.js';

const container = document.getElementById('app');

const cube = new RubiksCube(3);

const renderer = new CubeRenderer(
  container,
  cube
);

new CubeController(
  cube,
  renderer
);

new UI(container, cube, renderer);