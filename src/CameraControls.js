import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CameraControls {
  constructor(camera, renderer) {
    this.controls = new OrbitControls(
      camera,
      renderer.domElement
    );

    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    this.controls.minDistance = 4;
    this.controls.maxDistance = 12;

    this.controls.enablePan = false;
  }

  update() {
    this.controls.update();
  }
}