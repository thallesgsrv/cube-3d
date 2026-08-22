import * as THREE from 'three';
import { CameraControls } from './CameraControls.js';

const COLORS = {
  U: 0xffffff,
  D: 0xffff00,
  F: 0x00aa00,
  B: 0x0000ff,
  R: 0xff0000,
  L: 0xff8800,
  INNER: 0x111111,
};

export class CubeRenderer {
  constructor(container, cube) {
    this.container = container;
    this.cube = cube;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );

    this.camera.position.set(6, 6, 6);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });

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

    this._setupLights();
    this._createCube();

    window.addEventListener('resize', () => {
      this._onResize();
    });

    this._animate();
  }

  _setupLights() {
    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      2
    );

    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      3
    );

    directionalLight.position.set(5, 10, 7);
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
    const geometry = new THREE.BoxGeometry(
      0.96,
      0.96,
      0.96
    );

    const materials = [
      this._materialForSticker(cubie.stickers.x, COLORS.R),
      this._materialForSticker(cubie.stickers.x, COLORS.L),
      this._materialForSticker(cubie.stickers.y, COLORS.U),
      this._materialForSticker(cubie.stickers.y, COLORS.D),
      this._materialForSticker(cubie.stickers.z, COLORS.F),
      this._materialForSticker(cubie.stickers.z, COLORS.B),
    ];

    return new THREE.Mesh(
      geometry,
      materials
    );
  }

  _materialForSticker(sticker, fallbackColor) {
    if (!sticker) {
      return new THREE.MeshStandardMaterial({
        color: COLORS.INNER,
      });
    }

    const color = this._colorFromSticker(sticker);

    return new THREE.MeshStandardMaterial({
      color,
    });
  }

  _colorFromSticker(sticker) {
    return COLORS_BY_STICKER[sticker];
  }

  _onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

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

    this.renderer.render(
      this.scene,
      this.camera
    );
  }
}

const COLORS_BY_STICKER = {
  white: COLORS.U,
  yellow: COLORS.D,
  green: COLORS.F,
  blue: COLORS.B,
  red: COLORS.R,
  orange: COLORS.L,
};