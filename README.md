# Cubo Mágico 3D

Aplicação web interativa de um cubo mágico 3D construída com JavaScript, Three.js e Vite.

## Executar localmente

Requisitos:

- Node.js 18 ou superior
- npm
- Navegador com suporte a WebGL

Instale as dependências e inicie o servidor de desenvolvimento:

```bash
npm install
npm run dev
```

Depois, abra a URL exibida pelo Vite, normalmente `http://localhost:5173/`.

Para validar a compilação de produção:

```bash
npx vite build
```

## Publicar no GitHub Pages

O repositório já inclui um workflow em `.github/workflows/deploy.yml`. Para ativar a publicação:

1. Envie o projeto para a branch `main` no GitHub.
2. No repositório, abra **Settings > Pages**.
3. Em **Build and deployment**, escolha **GitHub Actions** como fonte.
4. Aguarde a execução da action `Deploy to GitHub Pages`.

O site será publicado em:

```text
https://thallesgsrv.github.io/cube-3d/
```

Cada novo push na `main` fará uma nova publicação automaticamente.

## Como usar

### Movimentar o cubo

- Arraste uma peça com o mouse para girar a camada correspondente.
- No touch, arraste uma peça diretamente na tela.
- Use as teclas `R`, `L`, `U`, `D`, `F` e `B` para girar as faces.
- Use `Shift` junto da tecla para inverter o sentido.
- Use `Ctrl` ou `Cmd` junto da tecla para executar um giro de 180 graus.
- Arraste uma área vazia para orbitar a câmera.

### Sessão

O cronômetro só começa quando o botão **começar** é acionado. Depois disso, o botão alterna entre pausar e continuar.

As ações disponíveis são:

- **Embaralhar:** aplica uma sequência de movimentos ao cubo.
- **Desfazer:** reverte o último movimento.
- **Limpar:** retorna o cubo ao estado resolvido e reinicia a sessão.

A mensagem de cubo resolvido só é exibida quando a sessão foi iniciada pelo usuário e o cubo volta ao estado resolvido.

### Tamanho

O seletor permite alternar entre:

- `3 × 3`
- `4 × 4`
- `5 × 5`

Ao trocar o tamanho, o cubo é reiniciado e a câmera se ajusta automaticamente.

O botão **auto-rotação** controla o movimento ambiente do cubo. Essa preferência é preservada depois de interações com mouse e touch.

## Cores

As faces resolvidas seguem a convenção:

- Branco: topo
- Amarelo: base
- Verde: frente
- Azul: trás
- Vermelho: direita
- Laranja: esquerda

Faces internas sem sticker usam um tom grafite. Durante os giros, os stickers permanecem presos aos cubinhos e a atualização do estado visual acontece ao final da animação.

## Estrutura

```text
.
├── index.html
├── style.css
├── package.json
└── src/
	├── CameraControls.js
	├── CubeController.js
	├── CubeRenderer.js
	├── RubiksCube.js
	├── Timer.js
	├── UI.js
	└── main.js
```

### Módulos principais

- `RubiksCube.js`: estado do cubo, stickers, rotações, histórico, desfazer e troca de tamanho.
- `CubeRenderer.js`: cena Three.js, iluminação, materiais, cubinhos arredondados, animações e raycasting.
- `CubeController.js`: comandos de teclado e movimentos por atalho.
- `CameraControls.js`: órbita, amortecimento e zoom da câmera.
- `UI.js`: HUD, sessão, cronômetro, botões e seletor de tamanho.
- `Timer.js`: cronômetro baseado em `requestAnimationFrame`.
- `main.js`: ponto de entrada e composição das dependências.

## Tecnologias

- JavaScript ES modules
- [Three.js](https://threejs.org/)
- [Vite](https://vite.dev/)
- CSS responsivo

## Observações

- O projeto usa WebGL para renderizar o cubo.
- A interface é responsiva para desktop e dispositivos móveis.
- O Vite pode informar um aviso sobre o tamanho do bundle do Three.js durante o build; isso não impede a compilação.