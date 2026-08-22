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

          if (x === this.size - 1) stickers.x = COLORS.R;
          if (x === 0) stickers.x = COLORS.L;

          if (y === this.size - 1) stickers.y = COLORS.U;
          if (y === 0) stickers.y = COLORS.D;

          if (z === this.size - 1) stickers.z = COLORS.F;
          if (z === 0) stickers.z = COLORS.B;

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

  getCubies() {
    return this.cubies.map((cubie) => ({
      id: cubie.id,
      position: { ...cubie.position },
      stickers: { ...cubie.stickers },
    }));
  }

  isSolved() {
    const offset = (this.size - 1) / 2;

    for (const cubie of this.cubies) {
      const { x, y, z } = cubie.position;

      if (
        Math.round(x) !== x ||
        Math.round(y) !== y ||
        Math.round(z) !== z
      ) {
        return false;
      }

      if (Math.abs(x) > offset || Math.abs(y) > offset || Math.abs(z) > offset) {
        return false;
      }
    }

    return this._stickersAreSolved();
  }

  _stickersAreSolved() {
    for (const cubie of this.cubies) {
      const { x, y, z } = cubie.position;
      const stickers = cubie.stickers;

      if (x === this._maxCoordinate() && stickers.x !== COLORS.R) {
        return false;
      }

      if (x === this._minCoordinate() && stickers.x !== COLORS.L) {
        return false;
      }

      if (y === this._maxCoordinate() && stickers.y !== COLORS.U) {
        return false;
      }

      if (y === this._minCoordinate() && stickers.y !== COLORS.D) {
        return false;
      }

      if (z === this._maxCoordinate() && stickers.z !== COLORS.F) {
        return false;
      }

      if (z === this._minCoordinate() && stickers.z !== COLORS.B) {
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

    for (let i = 0; i < normalizedMove.turns; i++) {
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
    const coordinate = this._coordinateForLayer(axis, layerValue);

    for (const cubie of this.cubies) {
      if (Math.round(cubie.position[axis]) !== Math.round(coordinate)) {
        continue;
      }

      this._rotatePosition(cubie, axis, dir);
      this._rotateStickers(cubie, axis, dir);
    }
  }

  _coordinateForLayer(axis, layerValue) {
    if (!AXES.includes(axis)) {
      throw new Error(`Invalid axis: ${axis}`);
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
    const old = { ...cubie.stickers };
    const next = {};

    if (axis === 'x') {
      if (old.x) next.x = old.x;

      if (dir === 1) {
        if (old.y) next.z = old.y;
        if (old.z) next.y = old.z;
      } else {
        if (old.y) next.z = old.z;
        if (old.z) next.y = old.y;
      }
    }

    if (axis === 'y') {
      if (old.y) next.y = old.y;

      if (dir === 1) {
        if (old.x) next.z = old.x;
        if (old.z) next.x = old.z;
      } else {
        if (old.x) next.z = old.z;
        if (old.z) next.x = old.x;
      }
    }

    if (axis === 'z') {
      if (old.z) next.z = old.z;

      if (dir === 1) {
        if (old.x) next.y = old.x;
        if (old.y) next.x = old.y;
      } else {
        if (old.x) next.y = old.y;
        if (old.y) next.x = old.x;
      }
    }

    cubie.stickers = next;
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

    for (let i = 0; i < move.turns; i++) {
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

    for (let i = 0; i < move.turns; i++) {
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
      throw new Error(`Invalid axis: ${move.axis}`);
    }

    const min = this._minCoordinate();
    const max = this._maxCoordinate();

    if (move.layerValue < min || move.layerValue > max) {
      throw new Error(
        `Layer ${move.layerValue} is outside the cube`
      );
    }

    if (move.turns !== undefined && ![1, 2, 3].includes(move.turns)) {
      throw new Error('Turns must be 1, 2 or 3');
    }
  }
}