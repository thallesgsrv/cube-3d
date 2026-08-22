const COLORS = {
  U: 'white',
  D: 'yellow',
  F: 'green',
  B: 'blue',
  R: 'red',
  L: 'orange',
};

const AXES = ['x', 'y', 'z'];

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

  _coordinateForLayer(axis, layerValue) {
    if (!AXES.includes(axis)) {
      throw new Error(
        `Invalid axis: ${axis}`
      );
    }

    return layerValue;
  }

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