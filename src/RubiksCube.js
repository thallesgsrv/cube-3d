// Convenção de cores das faces (padrão ocidental, oposto U/D, F/B, R/L)
const COLORS = {
  U: 'white',
  D: 'yellow',
  F: 'green',
  B: 'blue',
  R: 'red',
  L: 'orange',
};

const AXES = ['x', 'y', 'z'];

// Representa o estado lógico do cubo (posições e stickers dos cubinhos),
// independente de qualquer renderização. A cena 3D só lê esse estado.
export class RubiksCube {
  constructor(size = 3) {
    if (!Number.isInteger(size) || size < 2) {
      throw new Error('Cube size must be an integer >= 2');
    }

    this.size = size;
    this.moveHistory = [];
    this.redoStack = [];

    this._createSolvedState();
  }

  // Monta os cubinhos em uma grade centrada na origem, com coordenadas
  // inteiras ou meio-inteiras (ex.: -1, 0, 1 num cubo 3x3). Cada cubinho
  // só recebe um sticker na face que fica voltada para fora; as faces
  // internas ficam sem sticker e usam a cor grafite na renderização.
  _createSolvedState() {
    this.cubies = [];

    const offset = (this.size - 1) / 2;
    let id = 0;

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        for (let z = 0; z < this.size; z++) {
          const position = {
            x: x - offset,
            y: y - offset,
            z: z - offset,
          };

          const stickers = {};

          if (x === this.size - 1) {
            stickers.right = COLORS.R;
          }

          if (x === 0) {
            stickers.left = COLORS.L;
          }

          if (y === this.size - 1) {
            stickers.up = COLORS.U;
          }

          if (y === 0) {
            stickers.down = COLORS.D;
          }

          if (z === this.size - 1) {
            stickers.front = COLORS.F;
          }

          if (z === 0) {
            stickers.back = COLORS.B;
          }

          this.cubies.push({
            id: id++,
            position,
            stickers,
          });
        }
      }
    }
  }

  reset() {
    this._createSolvedState();

    this.moveHistory = [];
    this.redoStack = [];
  }

  setSize(size) {
    if (!Number.isInteger(size) || size < 2) {
      throw new Error('Cube size must be an integer >= 2');
    }

    this.size = size;
    this.reset();
  }

  // Retorna uma cópia defensiva dos cubinhos, para que quem consome
  // (o renderizador, por exemplo) não consiga alterar o estado interno
  // diretamente.
  getCubies() {
    return this.cubies.map((cubie) => ({
      id: cubie.id,

      position: {
        ...cubie.position,
      },

      stickers: {
        ...cubie.stickers,
      },
    }));
  }

  isSolved() {
    return this._stickersAreSolved();
  }

  // O cubo está resolvido quando cada sticker de face externa corresponde
  // à cor daquela face (não basta checar se os stickers "casam" entre si,
  // porque um cubo pode estar girado como um todo e ainda ter as faces
  // consistentes entre si sem estar na orientação resolvida).
  _stickersAreSolved() {
    const max = this._maxCoordinate();
    const min = this._minCoordinate();

    for (const cubie of this.cubies) {
      const { x, y, z } = cubie.position;
      const { stickers } = cubie;

      if (
        x === max &&
        stickers.right !== COLORS.R
      ) {
        return false;
      }

      if (
        x === min &&
        stickers.left !== COLORS.L
      ) {
        return false;
      }

      if (
        y === max &&
        stickers.up !== COLORS.U
      ) {
        return false;
      }

      if (
        y === min &&
        stickers.down !== COLORS.D
      ) {
        return false;
      }

      if (
        z === max &&
        stickers.front !== COLORS.F
      ) {
        return false;
      }

      if (
        z === min &&
        stickers.back !== COLORS.B
      ) {
        return false;
      }
    }

    return true;
  }

  _maxCoordinate() {
    return (this.size - 1) / 2;
  }

  _minCoordinate() {
    return -(this.size - 1) / 2;
  }

  // Aplica um movimento ao estado do cubo. `record` controla se o
  // movimento entra no histórico (usado para desfazer) — o embaralhamento
  // usa record = false justamente para não poder ser desfeito peça por
  // peça e não contar no contador de movimentos da sessão.
  applyMove(move, record = true) {
    this._validateMove(move);

    const normalizedMove = {
      axis: move.axis,
      layerValue: move.layerValue,
      dir: move.dir >= 0 ? 1 : -1,
      turns: move.turns ?? 1,
    };

    for (
      let i = 0;
      i < normalizedMove.turns;
      i++
    ) {
      this.rotateLayer90(
        normalizedMove.axis,
        normalizedMove.layerValue,
        normalizedMove.dir
      );
    }

    if (record) {
      this.moveHistory.push({
        ...normalizedMove,
      });

      this.redoStack = [];
    }
  }

  // Gira 90° apenas os cubinhos cuja coordenada, no eixo escolhido, bate
  // com a camada informada. O arredondamento evita falhas de ponto
  // flutuante depois de várias rotações acumuladas.
  rotateLayer90(axis, layerValue, dir = 1) {
    const coordinate =
      this._coordinateForLayer(
        axis,
        layerValue
      );

    for (const cubie of this.cubies) {
      if (
        Math.round(cubie.position[axis]) !==
        Math.round(coordinate)
      ) {
        continue;
      }

      this._rotatePosition(
        cubie,
        axis,
        dir
      );

      this._rotateStickers(
        cubie,
        axis,
        dir
      );
    }
  }

  // Valida o eixo e devolve a coordenada da camada. Existe como método
  // separado para manter rotateLayer90 legível e para servir de ponto
  // único de validação caso o cálculo da camada fique mais elaborado no
  // futuro (ex.: suporte a notação de camadas por nome).
  _coordinateForLayer(axis, layerValue) {
    if (!AXES.includes(axis)) {
      throw new Error(
        `Invalid axis: ${axis}`
      );
    }

    return layerValue;
  }

  // Rotaciona a posição do cubinho em torno do eixo dado, 90° na direção
  // `dir` (1 = sentido anti-horário olhando do lado positivo do eixo,
  // -1 = sentido contrário). É a mesma matriz de rotação de 90° aplicada
  // manualmente para os três eixos, trocando e invertendo os dois
  // componentes que não são o eixo de giro.
  _rotatePosition(cubie, axis, dir) {
    const { x, y, z } = cubie.position;

    if (axis === 'x') {
      cubie.position.y = -dir * z;
      cubie.position.z = dir * y;
      return;
    }

    if (axis === 'y') {
      cubie.position.x = dir * z;
      cubie.position.z = -dir * x;
      return;
    }

    if (axis === 'z') {
      cubie.position.x = -dir * y;
      cubie.position.y = dir * x;
    }
  }

  // Remapeia os stickers do cubinho de acordo com o giro, seguindo o
  // ciclo das quatro faces perpendiculares ao eixo (as duas faces
  // paralelas ao eixo de giro não mudam). Cada bloco `if` só copia o
  // sticker se ele existir, porque cubinhos internos/de borda não têm
  // sticker em todas as seis faces.
  _rotateStickers(cubie, axis, dir) {
    const old = {
      ...cubie.stickers,
    };

    const next = {};

    if (axis === 'x') {
      if (old.right) {
        next.right = old.right;
      }

      if (old.left) {
        next.left = old.left;
      }

      if (dir === 1) {
        if (old.up) {
          next.front = old.up;
        }

        if (old.front) {
          next.down = old.front;
        }

        if (old.down) {
          next.back = old.down;
        }

        if (old.back) {
          next.up = old.back;
        }
      } else {
        if (old.up) {
          next.back = old.up;
        }

        if (old.back) {
          next.down = old.back;
        }

        if (old.down) {
          next.front = old.down;
        }

        if (old.front) {
          next.up = old.front;
        }
      }

      cubie.stickers = next;

      return;
    }

    if (axis === 'y') {
      if (old.up) {
        next.up = old.up;
      }

      if (old.down) {
        next.down = old.down;
      }

      if (dir === 1) {
        if (old.front) {
          next.right = old.front;
        }

        if (old.right) {
          next.back = old.right;
        }

        if (old.back) {
          next.left = old.back;
        }

        if (old.left) {
          next.front = old.left;
        }
      } else {
        if (old.front) {
          next.left = old.front;
        }

        if (old.left) {
          next.back = old.left;
        }

        if (old.back) {
          next.right = old.back;
        }

        if (old.right) {
          next.front = old.right;
        }
      }

      cubie.stickers = next;

      return;
    }

    if (axis === 'z') {
      if (old.front) {
        next.front = old.front;
      }

      if (old.back) {
        next.back = old.back;
      }

      if (dir === 1) {
        if (old.up) {
          next.left = old.up;
        }

        if (old.left) {
          next.down = old.left;
        }

        if (old.down) {
          next.right = old.down;
        }

        if (old.right) {
          next.up = old.right;
        }
      } else {
        if (old.up) {
          next.right = old.up;
        }

        if (old.right) {
          next.down = old.right;
        }

        if (old.down) {
          next.left = old.down;
        }

        if (old.left) {
          next.up = old.left;
        }
      }

      cubie.stickers = next;
    }
  }

  // Desfaz o último movimento registrado, aplicando-o de novo na direção
  // oposta, e move esse movimento para a pilha de refazer.
  undo() {
    if (this.moveHistory.length === 0) {
      return null;
    }

    const move = this.moveHistory.pop();

    const inverse = {
      ...move,
      dir: -move.dir,
    };

    for (
      let i = 0;
      i < move.turns;
      i++
    ) {
      this.rotateLayer90(
        inverse.axis,
        inverse.layerValue,
        inverse.dir
      );
    }

    this.redoStack.push(move);

    return move;
  }

  // Refaz o último movimento desfeito. Qualquer novo movimento aplicado
  // via applyMove esvazia essa pilha (ver applyMove), então redo só
  // funciona logo depois de um undo.
  redo() {
    if (this.redoStack.length === 0) {
      return null;
    }

    const move = this.redoStack.pop();

    for (
      let i = 0;
      i < move.turns;
      i++
    ) {
      this.rotateLayer90(
        move.axis,
        move.layerValue,
        move.dir
      );
    }

    this.moveHistory.push(move);

    return move;
  }

  // Garante que um movimento tem forma válida antes de mexer no estado.
  // Falhar cedo aqui evita cubinhos "perdidos" por um eixo ou camada
  // inválidos passarem despercebidos pelo filtro de rotateLayer90.
  _validateMove(move) {
    if (!move || typeof move !== 'object') {
      throw new Error('Invalid move');
    }

    if (!AXES.includes(move.axis)) {
      throw new Error(
        `Invalid axis: ${move.axis}`
      );
    }

    const min = this._minCoordinate();
    const max = this._maxCoordinate();

    if (
      move.layerValue < min ||
      move.layerValue > max
    ) {
      throw new Error(
        `Layer ${move.layerValue} is outside the cube`
      );
    }

    if (
      move.turns !== undefined &&
      ![1, 2, 3].includes(move.turns)
    ) {
      throw new Error(
        'Turns must be 1, 2 or 3'
      );
    }
  }
}