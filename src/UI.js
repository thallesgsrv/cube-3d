import { Timer } from './Timer.js';

export class UI {
	constructor(container, cube, renderer) {
		this.cube = cube;
		this.renderer = renderer;
		this.sessionStarted = false;
		this.timer = new Timer((ms, value) => {
			this.time.textContent = value;
			this.time.classList.toggle('is-running', this.timer.isRunning());
		});
		this._render(container);
		this._bind();
	}

	_render(container) {
		container.insertAdjacentHTML('beforeend', `
			<section class="cube-ui" aria-label="Controles do cubo mágico">
				<header class="cube-ui__top">
					<div class="cube-ui__top-left"><div class="cube-ui__brand"><span class="cube-ui__brand-mark">03</span><div><div class="cube-ui__brand-title">CUBO / 03</div><div class="cube-ui__brand-sub">estúdio de movimentos espaciais</div></div></div></div>
					<aside class="glass-panel cube-size-dock" aria-label="Tamanho do cubo"><span class="cube-size-dock__label">tamanho</span><div class="size-picker"><button class="size-btn is-active" type="button" data-size="3">3 × 3</button><button class="size-btn" type="button" data-size="4">4 × 4</button><button class="size-btn" type="button" data-size="5">5 × 5</button></div></aside>
					<div class="glass-panel cube-hud" aria-label="Resumo da sessão"><div class="cube-hud__stat"><span class="cube-hud__label">tempo da sessão</span><strong class="cube-hud__value cube-hud__value--time">00:00.00</strong></div><div class="cube-hud__stat"><span class="cube-hud__label">movimentos</span><strong class="cube-hud__value js-moves">00</strong></div><span class="cube-hud__status"><i></i> pronto</span></div>
				</header>
				<div class="cube-ui__center"><div class="cube-ui__eyebrow">INTERFACE DE PRECISÃO</div><h1>Gire. Explore.<br><em>Resolva.</em></h1><p>Um cubo físico digital, construído para suas mãos.</p></div>
				<div class="glass-panel cube-controls"><div class="cube-controls__toolbar"><div class="session-heading"><span class="cube-controls__row-label">sessão</span><span class="session-subtitle">mesa de treino</span></div><div class="session-actions"><button class="start-btn js-start" type="button"><i></i><span class="js-start-label">começar</span></button><button class="motion-toggle is-active js-motion" type="button" aria-label="Ativar ou pausar a auto-rotação"><i></i> auto-rotação</button></div></div><div class="action-row"><button class="action-btn action-btn--primary js-scramble" type="button" title="Embaralhar o cubo"><span>↗</span> embaralhar</button><button class="action-btn js-undo" type="button" title="Desfazer último movimento" disabled><span>↶</span> desfazer</button><button class="action-btn action-btn--danger js-reset" type="button" title="Voltar ao cubo resolvido"><span>↻</span> limpar</button></div></div><section class="glass-panel command-panel" aria-label="Comandos do cubo"><div class="command-panel__header"><span>comandos</span><span class="command-panel__note">controles rápidos</span></div><div class="command-grid"><div class="command-group"><h2>faces</h2><div class="command-keys"><kbd>R</kbd><kbd>L</kbd><kbd>U</kbd><kbd>D</kbd><kbd>F</kbd><kbd>B</kbd></div><p>teclas movem as camadas externas</p></div><div class="command-group"><h2>modificadores</h2><div class="command-list"><div><kbd>Shift</kbd><span>inverte o sentido</span></div><div><kbd>Ctrl</kbd><span>giro de 180°</span></div><div><kbd>Cmd</kbd><span>giro de 180° no Mac</span></div></div></div><div class="command-group"><h2>gestos</h2><div class="command-list"><div><kbd>Mouse</kbd><span>arraste para orbitar</span></div><div><kbd>Shift</kbd><span>+ arraste uma peça</span></div></div></div></div></section>
			</section><div class="solved-toast glass-panel"><div class="solved-toast__title">Cubo resolvido</div><div class="solved-toast__time"></div></div>
		`);
		this.time = container.querySelector('.cube-hud__value--time');
		this.moves = container.querySelector('.js-moves');
		this.status = container.querySelector('.cube-hud__status');
		this.toast = container.querySelector('.solved-toast');
		this.motionToggle = container.querySelector('.js-motion');
		this.startButton = container.querySelector('.js-start');
		this.startLabel = container.querySelector('.js-start-label');
		this.undoButton = container.querySelector('.js-undo');
		this.sizeButtons = [...container.querySelectorAll('.size-btn')];
	}

	_bind() {
		this.renderer.onMove = () => this.refresh();
		this.renderer.onSolved = () => { if (!this.sessionStarted) return; this.toast.querySelector('.solved-toast__time').textContent = this.time.textContent; this.toast.classList.add('is-visible'); };
		document.querySelector('.js-scramble').addEventListener('click', () => { if (this.renderer.isAnimatingMove || this.renderer.moveQueue.length > 0) return; this.toast.classList.remove('is-visible'); const axes = ['x', 'y', 'z']; const layers = [-(this.cube.size - 1) / 2, (this.cube.size - 1) / 2]; for (let i = 0; i < 20; i += 1) this.renderer.requestMove({ axis: axes[i % 3], layerValue: layers[i % 2], dir: i % 2 ? -1 : 1 }, false); });
		document.querySelector('.js-undo').addEventListener('click', () => { const move = this.cube.undo(); if (move) { this.renderer.animateMove({ ...move, dir: -move.dir }); this.refresh(); } });
		document.querySelector('.js-reset').addEventListener('click', () => { this.cube.reset(); this.renderer._updateCube(); this.renderer._triggerMoveEffect(); this.timer.reset(); this.sessionStarted = false; this.startLabel.textContent = 'começar'; this.startButton.classList.remove('is-started'); this.toast.classList.remove('is-visible'); this.refresh(); });
		this.motionToggle.addEventListener('click', () => { this.renderer.autoRotationEnabled = !this.renderer.autoRotationEnabled; this.renderer.idleMotion = this.renderer.autoRotationEnabled; this.motionToggle.classList.toggle('is-active', this.renderer.autoRotationEnabled); });
		this.startButton.addEventListener('click', () => { if (this.timer.isRunning()) { this.timer.stop(); this.startLabel.textContent = 'continuar'; this.startButton.classList.remove('is-started'); } else { this.sessionStarted = true; this.timer.start(); this.startLabel.textContent = 'pausar'; this.toast.classList.remove('is-visible'); this.startButton.classList.add('is-started'); } });
		this.sizeButtons.forEach((button) => button.addEventListener('click', () => { const size = Number(button.dataset.size); if (size === this.cube.size || this.renderer.isAnimatingMove || this.renderer.moveQueue.length > 0) return; this.cube.setSize(size); this.renderer.rebuildCube(); this.timer.reset(); this.sessionStarted = false; this.startLabel.textContent = 'começar'; this.startButton.classList.remove('is-started'); this.toast.classList.remove('is-visible'); this.sizeButtons.forEach((item) => item.classList.toggle('is-active', item === button)); this.refresh(); }));
	}

	refresh() { this.moves.textContent = String(this.cube.moveHistory.length).padStart(2, '0'); this.status.innerHTML = `<i></i> ${this.cube.isSolved() ? 'pronto' : 'em curso'}`; this.undoButton.disabled = this.cube.moveHistory.length === 0; }
}
