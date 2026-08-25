import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CameraControls } from './CameraControls.js';

// Mesma paleta do RubiksCube.js, só que em hexadecimal para o Three.js.
// INNER é a cor usada nas faces sem sticker (miolo do cubo).
const COLORS = {
  U: 0xffffff,
  D: 0xffff00,
  F: 0x00aa00,
  B: 0x0000ff,
  R: 0xff0000,
  L: 0xff8800,
  INNER: 0x667080,
};

// Ponte entre o nome do sticker (string, vindo do RubiksCube) e a cor
// hexadecimal correspondente na cena.
const COLORS_BY_STICKER = {
  white: COLORS.U,
  yellow: COLORS.D,
  green: COLORS.F,
  blue: COLORS.B,
  red: COLORS.R,
  orange: COLORS.L,
};

// Cuida de tudo que é Three.js: cena, câmera, malhas dos cubinhos,
// gestos de arrastar (mouse/toque) e as animações de giro. Não guarda
// estado de jogo — isso é responsabilidade do RubiksCube, que é sempre
// a fonte da verdade; esta classe só espelha esse estado visualmente.
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
    this.draggedPoint = null;
    this.isDraggingCube = false;
    this.idleMotion = true; // rotação suave quando ninguém interage
    this.autoRotationEnabled = true; // preferência do usuário (botão auto-rotação)
    this.motionTime = 0;
    this.moveEffect = 0; // força do "solavanco" visual após um giro
    this.isAnimatingMove = false;
    this.moveQueue = []; // fila de movimentos pendentes (teclado/gestos/embaralhar)

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

  // Cria uma malha para cada cubinho do estado lógico e monta o grupo
  // que representa o cubo inteiro na cena.
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

  // Constrói a malha de um cubinho individual. O box tem cantos
  // arredondados (RoundedBoxGeometry) para imitar o acabamento de um
  // cubo mágico físico, e usa 0.91 de lado — um pouco menor que 1 — para
  // deixar uma folga visível entre os cubinhos vizinhos.
  //
  // A ordem dos materiais no array segue a convenção do BoxGeometry do
  // Three.js: +X, -X, +Y, -Y, +Z, -Z.
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

  // Faces sem sticker (miolo do cubo) caem no fallbackColor, que
  // normalmente é COLORS.INNER — exceto quando quem chama já sabe que
  // aquela face deveria ter uma cor de face (ver _updateCubieMaterials).
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

  // Registra os handlers de ponteiro (mouse e toque no mesmo listener,
  // já que a Pointer Events API unifica os dois).
  //
  // O primeiro listener roda em fase de captura e decide, antes de
  // qualquer outra coisa, se o gesto deve orbitar a câmera ou tentar
  // girar uma camada: no toque, arrastar uma peça sempre gira o cubo; no
  // mouse é preciso segurar Shift, porque o botão esquerdo sozinho já é
  // usado para orbitar a câmera livremente.
  _setupPointerEvents() {
    const canvas = this.renderer.domElement;

    canvas.style.touchAction = 'none';

    canvas.addEventListener(
      'pointerdown',
      (event) => {
        if (this.isAnimatingMove) {
          return;
        }

        const usesFaceGesture = this._usesFaceGesture(event);

        if (usesFaceGesture && this._intersectionAt(event)) {
          this.cameraControls.disable();
        } else {
          this.cameraControls.enable();
        }
      },
      { capture: true }
    );

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

  // Início do gesto de arraste. Se não for um gesto de face (mouse sem
  // Shift, ou toque fora de qualquer cubinho), deixa a órbita da câmera
  // assumir o controle e sai cedo.
  _onPointerDown(event) {
    if (this.isAnimatingMove) {
      return;
    }

    this.idleMotion = false;

    if (!this._usesFaceGesture(event)) {
      this.dragStart = null;
      this.isDraggingCube = false;
      this.cameraControls.enable();
      return;
    }

    const intersection = this._intersectionAt(event);

    this.dragStart = {
      x: event.clientX,
      y: event.clientY,
    };

    if (!intersection) {
      this.isDraggingCube = false;
      this.cameraControls.enable();
      return;
    }

    this.isDraggingCube = true;

    this.draggedCubie = intersection.object;

    this.draggedFace = intersection.face;
    this.draggedPoint = intersection.point.clone();

    this.cameraControls.disable();

    try {
      this.renderer.domElement.setPointerCapture(event.pointerId);
    } catch {}
  }

  // Converte a posição do ponteiro na tela em coordenadas normalizadas
  // (-1 a 1) e faz o raycasting contra os cubinhos, devolvendo a
  // primeira interseção (a mais próxima da câmera) ou null.
  _intersectionAt(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();

    this.pointer.x =
      ((event.clientX - rect.left) / rect.width) * 2 - 1;

    this.pointer.y =
      -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    return this.raycaster.intersectObjects(this.cubeGroup.children)[0] ?? null;
  }

  // Só dispara o movimento quando o arraste passa de um limiar mínimo
  // (25px), para não confundir um toque/clique acidental com um gesto de
  // giro. Assim que o movimento é disparado, o arraste é encerrado — não
  // dá pra "corrigir" o giro no meio do gesto, só soltar e arrastar de
  // novo.
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

  // Traduz um arraste 2D na tela em um movimento de camada 3D: descobre
  // qual eixo o cubinho arrastado pertence a partir da face clicada,
  // escolhe entre os outros dois eixos qual mais se alinha com a
  // direção do arraste, e por fim decide o sentido do giro.
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

    const faceNormal = this.draggedFace?.normal;
    const faceAxis = faceNormal
      ? this._axisFromVector(faceNormal)
      : null;
    const axis = this._axisForSwipe(faceAxis, dx, dy);

    const dir = this._rotationDirectionFromSwipe(axis, dx, dy);

    const move = {
      axis,
      layerValue: cubie.position[axis],
      dir,
    };

    this.requestMove(move);
  }

  // Identifica a qual eixo do mundo a normal da face clicada é mais
  // próxima (a normal de uma face plana do cubinho é sempre quase
  // paralela a um dos três eixos).
  _axisFromVector(vector) {
    const abs = [Math.abs(vector.x), Math.abs(vector.y), Math.abs(vector.z)];

    return abs[0] >= abs[1] && abs[0] >= abs[2]
      ? 'x'
      : abs[1] >= abs[2]
        ? 'y'
        : 'z';
  }

  // Dos dois eixos que não são a normal da face clicada, escolhe o que
  // tem a tangente na tela mais alinhada com a direção do arraste — ou
  // seja, o eixo que o gesto "quis" girar.
  _axisForSwipe(faceAxis, dx, dy) {
    const candidates = ['x', 'y', 'z'].filter((axis) => axis !== faceAxis);

    return candidates.reduce((bestAxis, axis) => {
      const bestAlignment = Math.abs(this._screenTangent(axis).x * dx + this._screenTangent(axis).y * dy);
      const currentAlignment = Math.abs(this._screenTangent(bestAxis).x * dx + this._screenTangent(bestAxis).y * dy);
      return bestAlignment > currentAlignment ? axis : bestAxis;
    }, candidates[0] ?? faceAxis ?? 'z');
  }

  // Compara a direção do arraste na tela com a tangente projetada do
  // eixo de giro no ponto tocado, para decidir se o giro é no sentido
  // positivo ou negativo daquele eixo.
  _rotationDirectionFromSwipe(axis, dx, dy) {
    const axisVector = new THREE.Vector3(
      axis === 'x' ? 1 : 0,
      axis === 'y' ? 1 : 0,
      axis === 'z' ? 1 : 0
    );
    const point = this.draggedPoint.clone();
    const center = this.cubeGroup.localToWorld(new THREE.Vector3());
    const worldAxis = this.cubeGroup.localToWorld(axisVector).sub(center).normalize();
    const tangent = new THREE.Vector3().crossVectors(worldAxis, point.sub(center));

    if (tangent.lengthSq() === 0) {
      return Math.abs(dx) > Math.abs(dy)
        ? dx > 0 ? 1 : -1
        : dy > 0 ? 1 : -1;
    }

    const screenTangent = this._screenTangent(axis);
    const dot = dx * screenTangent.x + dy * screenTangent.y;

    return dot >= 0 ? 1 : -1;
  }

  // Projeta na tela um pequeno deslocamento ao longo do eixo tangente
  // (perpendicular ao eixo de giro e ao raio câmera-ponto), para saber
  // em que direção 2D esse eixo "aparece" do ponto de vista atual da
  // câmera. É essa tangente que _axisForSwipe e _rotationDirectionFromSwipe
  // comparam com o vetor do arraste do usuário.
  _screenTangent(axis) {
    const axisVector = new THREE.Vector3(
      axis === 'x' ? 1 : 0,
      axis === 'y' ? 1 : 0,
      axis === 'z' ? 1 : 0
    );
    const point = this.draggedPoint.clone();
    const center = this.cubeGroup.localToWorld(new THREE.Vector3());
    const worldAxis = this.cubeGroup.localToWorld(axisVector).sub(center).normalize();
    const tangent = new THREE.Vector3().crossVectors(worldAxis, point.sub(center));

    if (tangent.lengthSq() === 0) {
      return { x: 0, y: 0 };
    }

    const projectedPoint = this.draggedPoint.clone().project(this.camera);
    const projectedTangent = this.draggedPoint.clone().add(tangent.normalize().multiplyScalar(0.25)).project(this.camera);

    return {
      x: projectedTangent.x - projectedPoint.x,
      y: -(projectedTangent.y - projectedPoint.y),
    };
  }

  // Limpa o estado de arraste e devolve o controle da câmera para a
  // órbita normal.
  _cancelDrag() {
    this.dragStart = null;
    this.isDraggingCube = false;
    this.draggedCubie = null;
    this.draggedFace = null;
    this.draggedPoint = null;

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

  // Loop de renderização. Além de desenhar a cena a cada frame, cuida de
  // dois efeitos puramente visuais que não fazem parte do estado do
  // cubo: o balanço ambiente (idleMotion) e o "solavanco" de escala que
  // dá um feedback tátil logo depois de um giro (moveEffect, que decai
  // exponencialmente a cada frame até sumir).
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

  // Sincroniza as malhas existentes com o estado atual do RubiksCube
  // (posição e cores), sem recriar geometria. Usado depois de undo,
  // limpar e no fim de cada giro animado.
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

  // Decide se um gesto de ponteiro deve tentar girar uma camada (em vez
  // de orbitar a câmera): sempre no toque, e no mouse só com Shift
  // pressionado — veja o painel de comandos na UI, que documenta essa
  // mesma regra para o usuário.
  _usesFaceGesture(event) {
    return event.pointerType === 'touch' || event.shiftKey;
  }

  // Atualiza a cor de cada face do cubinho a partir do sticker atual.
  // fallbackColors recalcula, pela posição, se aquela face deveria ser
  // uma cor de face (caso o cubinho tenha girado para a borda) ou
  // permanecer grafite — isso evita ter que reconstruir a geometria a
  // cada movimento.
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

  // Anima um giro de camada de verdade: agrupa temporariamente os
  // cubinhos daquela camada num pivô, gira o pivô com easing até o
  // ângulo final e, ao terminar, devolve cada cubinho ao grupo principal
  // do cubo. A rotação acumulada no pivô é descartada (quaternion
  // resetado) porque _updateCube(), logo em seguida, já reposiciona cada
  // malha a partir do novo estado lógico do RubiksCube — a peça
  // "aterrissa" na posição correta em vez de manter a rotação visual do
  // giro.
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
      this.onMove?.();
      this.onInteraction?.();
      if (this.cube.isSolved()) this.onSolved?.();
      this._processMoveQueue();
    };

    requestAnimationFrame(step);
  }

  // Ponto de entrada usado por teclado, gestos e pelo botão de
  // embaralhar: só enfileira o movimento, nunca aplica na hora, porque
  // só um giro pode ser animado por vez.
  requestMove(move, record = true) {
    this.moveQueue.push({ move: { ...move }, record });
    this._processMoveQueue();
  }

  // Consome a fila de movimentos um de cada vez. Aplica o movimento no
  // estado lógico primeiro e só então dispara a animação correspondente
  // — quando a animação termina, ela mesma chama _processMoveQueue de
  // novo para seguir para o próximo movimento da fila.
  _processMoveQueue() {
    if (this.isAnimatingMove || this.moveQueue.length === 0) {
      if (!this.isAnimatingMove && this.moveQueue.length === 0) {
        this.idleMotion = this.autoRotationEnabled;
      }
      return;
    }

    const queuedMove = this.moveQueue.shift();
    const move = queuedMove.move;
    this.cube.applyMove(move, queuedMove.record);
    this.animateMove(move);
  }

  _triggerMoveEffect() {
    this.moveEffect = 1;
  }

  // Distância da câmera até a origem, ajustada pelo tamanho do cubo
  // (cubos maiores precisam de mais distância para caber no enquadramento)
  // e pela largura da viewport (em telas estreitas afasta ainda mais a
  // câmera para compensar o espaço menor).
  _cameraDistance(width = this.container.clientWidth) {
    const sizeFactor = this.cube.size === 3 ? 1 : this.cube.size === 4 ? 1.28 : 1.52;
    const mobileFactor = width <= 560
      ? this.cube.size === 3
        ? 1.9
        : this.cube.size === 4
          ? 2.3
          : 2.75
      : 1;
    return 6 * sizeFactor * mobileFactor;
  }

  // Descarta as malhas atuais (liberando geometria e materiais da GPU) e
  // recria o cubo do zero a partir do tamanho novo do RubiksCube. Usado
  // quando o usuário troca o seletor de tamanho.
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