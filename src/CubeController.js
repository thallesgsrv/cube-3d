export class CubeController {
  constructor(cube, renderer) {
    this.cube = cube;
    this.renderer = renderer;

    this._setupKeyboard();
  }

  _setupKeyboard() {
    window.addEventListener('keydown', (event) => {
      this._handleKey(event);
    });
  }

  _handleKey(event) {
    const key = event.key.toUpperCase();
    const maxLayer = (this.cube.size - 1) / 2;
    const minLayer = -maxLayer;

    const moves = {
      R: {
        axis: 'x',
        layerValue: maxLayer,
        dir: 1,
      },

      L: {
        axis: 'x',
        layerValue: minLayer,
        dir: -1,
      },

      U: {
        axis: 'y',
        layerValue: maxLayer,
        dir: 1,
      },

      D: {
        axis: 'y',
        layerValue: minLayer,
        dir: -1,
      },

      F: {
        axis: 'z',
        layerValue: maxLayer,
        dir: 1,
      },

      B: {
        axis: 'z',
        layerValue: minLayer,
        dir: -1,
      },
    };

    if (!moves[key]) {
      return;
    }

    const move = {
      ...moves[key],
    };

    // Shift = movimento inverso
    if (event.shiftKey) {
      move.dir *= -1;
    }

    // Ctrl/Cmd + tecla = 180°
    if (event.ctrlKey || event.metaKey) {
      move.turns = 2;
    }

    this.cube.applyMove(move);

    this.renderer.animateMove(move);

    console.log(
      `${key}${event.shiftKey ? "'" : ""}${
        move.turns === 2 ? '2' : ''
      }`
    );
  }
}