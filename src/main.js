import { RubiksCube } from './RubiksCube.js';

const cube = new RubiksCube(3);

console.log('Estado inicial:', cube);
console.log('Resolvido:', cube.isSolved());

cube.applyMove({
  axis: 'x',
  layerValue: 1,
  dir: 1,
});

console.log('Depois de R:', cube);
console.log('Resolvido:', cube.isSolved());

cube.undo();

console.log('Depois do undo:', cube);
console.log('Resolvido:', cube.isSolved());

cube.redo();

console.log('Depois do redo:', cube);
console.log('Resolvido:', cube.isSolved());

cube.reset();

console.log('Depois do reset:', cube);
console.log('Resolvido:', cube.isSolved());