import { RubiksCube } from './RubiksCube.js';
import { CubeRenderer } from './CubeRenderer.js';

const container = document.getElementById('app');

const cube = new RubiksCube(3);

new CubeRenderer(container, cube);