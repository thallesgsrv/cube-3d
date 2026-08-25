// Traduz teclas de face (R L U D F B) e seus modificadores (Shift,
// Ctrl/Cmd) em movimentos e os envia direto para o renderizador, que
// cuida de enfileirar e animar.
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

    // Cada face corresponde à camada mais externa num eixo: R/L no eixo
    // x, U/D no eixo y, F/B no eixo z. O par R/U/F usa a camada e a
    // direção positivas; o par L/D/B usa a camada e a direção negativas
    // — é essa simetria que faz o cubo girar "para dentro" de forma
    // consistente com a notação padrão de cubo mágico.
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

    this.renderer.requestMove(move);
  }
}