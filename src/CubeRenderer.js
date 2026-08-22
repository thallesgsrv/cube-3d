import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CameraControls } from './CameraControls.js';

const COLORS = {
  U: 0xffffff,
  D: 0xffff00,
  F: 0x00aa00,
  B: 0x0000ff,
  R: 0xff0000,
  L: 0xff8800,
  INNER: 0x667080,
};

const COLORS_BY_STICKER = {
  white: COLORS.U,
  yellow: COLORS.D,
  green: COLORS.F,
  blue: COLORS.B,
  red: COLORS.R,
  orange: COLORS.L,
};

export class CubeRenderer {
  constructor(container, cube) {
    this.container = container;
    this.cube = cube;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080b12);

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );

    const initialCameraDistance = this._cameraDistance();
    this.camera.position.set(
      initialCameraDistance,
      initialCameraDistance,
      initialCameraDistance
    );
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2)
    );

    this.renderer.setSize(
      container.clientWidth,
      container.clientHeight
    );

    container.appendChild(this.renderer.domElement);

    this.cameraControls = new CameraControls(
      this.camera,
      this.renderer
    );

    this.cubeGroup = new THREE.Group();
    this.scene.add(this.cubeGroup);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.dragStart = null;
    this.draggedCubie = null;
    this.draggedFace = null;
    this.isDraggingCube = false;
    this.idleMotion = true;
    this.autoRotationEnabled = true;
    this.motionTime = 0;
    this.moveEffect = 0;
    this.isAnimatingMove = false;

    this._setupLights();
    this._createCube();
    this._setupPointerEvents();

    window.addEventListener('resize', () => {
      this._onResize();
    });

    this._animate();
  }

  _setupLights() {
    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      1.8
    );

    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      4
    );

    directionalLight.position.set(5, 8, 7);

    this.scene.add(directionalLight);
  }

  _createCube() {
    const cubies = this.cube.getCubies();

    for (const cubie of cubies) {
      const mesh = this._createCubie(cubie);

      mesh.position.set(
        cubie.position.x,
        cubie.position.y,
        cubie.position.z
      );

      mesh.userData.cubieId = cubie.id;

      this.cubeGroup.add(mesh);
    }
  }

  _createCubie(cubie) {
    const geometry = new RoundedBoxGeometry(
      0.91,
      0.91,
      0.91,
      4,
      0.075
    );

    const materials = [
      // +X
      this._materialForSticker(
        cubie.stickers.right,
        COLORS.R
      ),

      // -X
      this._materialForSticker(
        cubie.stickers.left,
        COLORS.L
      ),

      // +Y
      this._materialForSticker(
        cubie.stickers.up,
        COLORS.U
      ),

      // -Y
      this._materialForSticker(
        cubie.stickers.down,
        COLORS.D
      ),

      // +Z
      this._materialForSticker(
        cubie.stickers.front,
        COLORS.F
      ),

      // -Z
      this._materialForSticker(
        cubie.stickers.back,
        COLORS.B
      ),
    ];

    return new THREE.Mesh(
      geometry,
      materials
    );
  }

  _materialForSticker(sticker, fallbackColor) {
    return new THREE.MeshStandardMaterial({
      color: sticker ? this._colorFromSticker(sticker, fallbackColor) : COLORS.INNER,
      roughness: 0.22,
      metalness: 0.02,
      envMapIntensity: 0.8,
    });
  }

  _colorFromSticker(sticker, fallbackColor = COLORS.INNER) {
    return COLORS_BY_STICKER[sticker] ?? fallbackColor;
  }

  _setupPointerEvents() {
    const canvas = this.renderer.domElement;

    canvas.style.touchAction = 'none';

    canvas.addEventListener(
      'pointerdown',
      (event) => {
        this._onPointerDown(event);
      }
    );

    canvas.addEventListener(
      'pointermove',
      (event) => {
        this._onPointerMove(event);
      }
    );

    canvas.addEventListener(
      'pointerup',
      (event) => {
        this._onPointerUp(event);
      }
    );

    canvas.addEventListener(
      'pointercancel',
      () => {
        this._cancelDrag();
      }
    );

    canvas.addEventListener(
      'contextmenu',
      (event) => {
        event.preventDefault();
      }
    );
  }

  _onPointerDown(event) {
    if (this.isAnimatingMove) {
      return;
    }

    this.idleMotion = false;

    const rect =
      this.renderer.domElement.getBoundingClientRect();

    this.pointer.x =
      ((event.clientX - rect.left) / rect.width) * 2 - 1;

    this.pointer.y =
      -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(
      this.pointer,
      this.camera
    );

    const intersections =
      this.raycaster.intersectObjects(
        this.cubeGroup.children
      );

    this.dragStart = {
      x: event.clientX,
      y: event.clientY,
    };

    if (intersections.length === 0) {
      this.isDraggingCube = false;
      this.cameraControls.enable();
      return;
    }

    this.isDraggingCube = true;

    this.draggedCubie =
      intersections[0].object;

    this.draggedFace =
      intersections[0].face;

    this.cameraControls.disable();

    this.renderer.domElement.setPointerCapture(
      event.pointerId
    );
  }

  _onPointerMove(event) {
    if (!this.isDraggingCube || !this.dragStart) {
      return;
    }

    const dx =
      event.clientX - this.dragStart.x;

    const dy =
      event.clientY - this.dragStart.y;

    const distance = Math.hypot(dx, dy);

    if (distance < 25) {
      return;
    }

    this._performCubeMove(dx, dy);

    this._cancelDrag();
  }

  _onPointerUp(event) {
    if (
      this.renderer.domElement.hasPointerCapture(
        event.pointerId
      )
    ) {
      this.renderer.domElement.releasePointerCapture(
        event.pointerId
      );
    }

    this._cancelDrag();
    this.idleMotion = this.autoRotationEnabled;
  }

  _performCubeMove(dx, dy) {
    if (!this.draggedCubie) {
      return;
    }

    const cubieId =
      this.draggedCubie.userData.cubieId;

    const cubie =
      this.cube
        .getCubies()
        .find((item) => item.id === cubieId);

    if (!cubie) {
      return;
    }

    const dir =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? 1
          : -1
        : dy > 0
          ? 1
          : -1;

    const faceNormal = this.draggedFace?.normal;
    const abs = faceNormal
      ? [Math.abs(faceNormal.x), Math.abs(faceNormal.y), Math.abs(faceNormal.z)]
      : [1, 0, 0];
    const axis = abs[0] >= abs[1] && abs[0] >= abs[2]
      ? 'x'
      : abs[1] >= abs[2]
        ? 'y'
        : 'z';

    const move = {
      axis,
      layerValue: cubie.position[axis],
      dir,
    };

    this.cube.applyMove(move);

    this.animateMove(move);
  }

  _cancelDrag() {
    this.dragStart = null;
    this.isDraggingCube = false;
    this.draggedCubie = null;
    this.draggedFace = null;

    this.cameraControls.enable();
  }

  _onResize() {
    const width =
      this.container.clientWidth;

    const height =
      this.container.clientHeight;

    this.camera.aspect =
      width / height;

    this.camera.updateProjectionMatrix();

    const cameraDistance = this._cameraDistance(width);
    this.camera.position.set(cameraDistance, cameraDistance, cameraDistance);

    this.renderer.setSize(
      width,
      height
    );
  }

  _animate() {
    requestAnimationFrame(() => {
      this._animate();
    });

    this.cameraControls.update();

    if (this.idleMotion) {
      this.motionTime += 0.012;
      this.cubeGroup.rotation.y += 0.0018;
      this.cubeGroup.rotation.x = Math.sin(this.motionTime) * 0.018;
      this.cubeGroup.position.y = Math.sin(this.motionTime * 1.4) * 0.035;
    }

    if (this.moveEffect > 0) {
      this.moveEffect *= 0.86;
      this.cubeGroup.scale.setScalar(1 + this.moveEffect * 0.035);
      this.cubeGroup.rotation.z = Math.sin(this.moveEffect * 14) * this.moveEffect * 0.012;
    } else {
      this.cubeGroup.scale.setScalar(1);
      this.cubeGroup.rotation.z = 0;
    }

    this.renderer.render(
      this.scene,
      this.camera
    );
  }

  _updateCube() {
    const cubies =
      this.cube.getCubies();

    for (const cubie of cubies) {
      const mesh =
        this.cubeGroup.children.find(
          (child) =>
            child.userData.cubieId === cubie.id
        );

      if (!mesh) {
        continue;
      }

      mesh.position.set(
        cubie.position.x,
        cubie.position.y,
        cubie.position.z
      );

      this._updateCubieMaterials(
        mesh,
        cubie
      );
    }
  }

  _updateCubieMaterials(mesh, cubie) {
    const stickers = [
      cubie.stickers.right,
      cubie.stickers.left,
      cubie.stickers.up,
      cubie.stickers.down,
      cubie.stickers.front,
      cubie.stickers.back,
    ];

    const fallbackColors = [
      cubie.position.x === this.cube._maxCoordinate() ? COLORS.R : COLORS.INNER,
      cubie.position.x === this.cube._minCoordinate() ? COLORS.L : COLORS.INNER,
      cubie.position.y === this.cube._maxCoordinate() ? COLORS.U : COLORS.INNER,
      cubie.position.y === this.cube._minCoordinate() ? COLORS.D : COLORS.INNER,
      cubie.position.z === this.cube._maxCoordinate() ? COLORS.F : COLORS.INNER,
      cubie.position.z === this.cube._minCoordinate() ? COLORS.B : COLORS.INNER,
    ];

    for (let i = 0; i < mesh.material.length; i += 1) {
      const sticker = stickers[i];
      mesh.material[i].color.set(
        sticker
          ? this._colorFromSticker(sticker, COLORS.INNER)
          : fallbackColors[i]
      );
    }
  }

  animateMove(move) {
    if (this.isAnimatingMove) {
      return;
    }

    const pivot = new THREE.Group();
    const axisVector = new THREE.Vector3(
      move.axis === 'x' ? 1 : 0,
      move.axis === 'y' ? 1 : 0,
      move.axis === 'z' ? 1 : 0
    );
    const movingMeshes = this.cubeGroup.children.filter((mesh) => {
      const cubie = this.cube.getCubies().find(
        (item) => item.id === mesh.userData.cubieId
      );
      return cubie && Math.round(cubie.position[move.axis]) === Math.round(move.layerValue);
    });

    this.isAnimatingMove = true;
    this.idleMotion = false;
    this.cubeGroup.add(pivot);

    for (const mesh of movingMeshes) {
      pivot.attach(mesh);
    }

    const start = performance.now();
    const duration = 280;
    const targetAngle = (move.dir >= 0 ? 1 : -1) * Math.PI / 2 * (move.turns ?? 1);

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      pivot.setRotationFromAxisAngle(axisVector, targetAngle * eased);

      if (progress < 1) {
        requestAnimationFrame(step);
        return;
      }

      pivot.setRotationFromAxisAngle(axisVector, targetAngle);
      for (const mesh of movingMeshes) {
        this.cubeGroup.attach(mesh);
        mesh.quaternion.identity();
      }
      this.cubeGroup.remove(pivot);
      this._updateCube();
      this._triggerMoveEffect();
      this.isAnimatingMove = false;
      this.idleMotion = true;
      this.onMove?.();
      this.onInteraction?.();
      if (this.cube.isSolved()) this.onSolved?.();
    };

    requestAnimationFrame(step);
  }

  _triggerMoveEffect() {
    this.moveEffect = 1;
  }

  _cameraDistance(width = this.container.clientWidth) {
    const sizeFactor = this.cube.size === 3 ? 1 : this.cube.size === 4 ? 1.28 : 1.52;
    const mobileFactor = width <= 560 ? 1.5 : 1;
    return 6 * sizeFactor * mobileFactor;
  }

  rebuildCube() {
    for (const mesh of this.cubeGroup.children) {
      mesh.geometry.dispose();
      for (const material of mesh.material) {
        material.dispose();
      }
    }

    this.cubeGroup.clear();
    this.cubeGroup.rotation.set(0, 0, 0);
    this.cubeGroup.position.set(0, 0, 0);
    this._createCube();
    const distance = this._cameraDistance();
    this.camera.position.set(distance, distance, distance);
    this.camera.lookAt(0, 0, 0);
  }
}