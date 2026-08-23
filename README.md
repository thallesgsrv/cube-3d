# Cubo Mágico 3D

> Uma experiência interativa para explorar, movimentar e resolver cubos mágicos em 3D.

Aplicação web construída com JavaScript, [Three.js](https://threejs.org/) e [Vite](https://vite.dev/), com suporte a mouse, teclado e toque. O projeto oferece cubos `3 × 3`, `4 × 4` e `5 × 5`, animações de movimentos e interface responsiva para desktop e dispositivos móveis.

## Demonstração

O projeto está configurado para publicação no GitHub Pages:

**https://thallesgsrv.github.io/interactive-3d-Rubiks-Cube/**

## Requisitos

- Node.js 18 ou superior
- npm
- Navegador com suporte a WebGL

## Desenvolvimento

Instale as dependências e inicie o servidor local:

```bash
npm install
npm run dev
```

O Vite exibirá a URL local, normalmente `http://localhost:5173/`.

Para gerar e conferir o build de produção:

```bash
npm run build
npm run preview
```

O comando `preview` serve o conteúdo compilado localmente para uma verificação final antes da publicação.

## Como usar

### Movimentos

- Arraste uma peça com o mouse ou toque para girar a camada correspondente.
- Em cubos maiores, arraste as peças centrais para movimentar as camadas internas.
- Arraste uma área vazia para orbitar a câmera.
- Use `R`, `L`, `U`, `D`, `F` e `B` para movimentar as faces pelo teclado.
- Use `Shift` para inverter o sentido do movimento.
- Use `Ctrl` ou `Cmd` para executar um giro de 180 graus.

Os movimentos são enfileirados e executados em sequência para preservar a animação e o estado do cubo mesmo quando várias ações são feitas rapidamente.

### Sessão

O cronômetro começa ao pressionar **começar** e pode ser pausado ou continuado pelo mesmo botão.

- **Embaralhar:** aplica uma sequência animada sem contabilizá-la no contador da sessão.
- **Desfazer:** reverte o último movimento registrado.
- **Limpar:** retorna ao estado resolvido e reinicia a sessão.
- **Auto-rotação:** alterna o movimento ambiente do cubo.

O aviso de cubo resolvido é exibido quando o cubo retorna ao estado resolvido durante uma sessão iniciada pelo usuário.

### Tamanho do cubo

O seletor permite alternar entre `3 × 3`, `4 × 4` e `5 × 5`. A troca reinicia o cubo e ajusta automaticamente a câmera para o novo tamanho.

## Convenção de cores

| Face | Cor |
| --- | --- |
| Topo | Branco |
| Base | Amarelo |
| Frente | Verde |
| Trás | Azul |
| Direita | Vermelho |
| Esquerda | Laranja |

As faces internas usam um tom grafite. Os stickers permanecem associados aos cubinhos durante os movimentos e o estado visual é atualizado ao final de cada animação.

## Publicação

O workflow em `.github/workflows/deploy.yml` publica automaticamente o projeto no GitHub Pages após cada push na branch `main`.

Para ativar a publicação em um repositório:

1. Envie o projeto para a branch `main`.
2. Em **Settings > Pages**, selecione **GitHub Actions** como fonte.
3. Aguarde a execução do workflow **Deploy to GitHub Pages**.

A pasta `dist/` é gerada pelo workflow durante o deploy e não precisa ser versionada.

## Arquitetura

```text
.
├── index.html
├── style.css
├── package.json
├── vite.config.js
└── src/
    ├── CameraControls.js
    ├── CubeController.js
    ├── CubeRenderer.js
    ├── RubiksCube.js
    ├── Timer.js
    ├── UI.js
    └── main.js
```

- `RubiksCube.js`: estado, stickers, rotações, histórico, desfazer e tamanhos.
- `CubeRenderer.js`: cena Three.js, raycasting, animações e fila de movimentos.
- `CubeController.js`: atalhos de teclado.
- `CameraControls.js`: órbita, zoom e amortecimento da câmera.
- `UI.js`: HUD, sessão, ações e seletor de tamanho.
- `Timer.js`: cronômetro da sessão.
- `main.js`: inicialização e composição da aplicação.

## Tecnologias

- JavaScript com ES modules
- Three.js `0.185`
- Vite `8`
- CSS responsivo
- WebGL

## Limitações conhecidas

- É necessário um navegador com WebGL habilitado.
- O build pode exibir um aviso sobre o tamanho do bundle do Three.js; isso não impede a compilação.
- O projeto ainda não possui uma suíte automatizada de testes; a validação principal é feita pelo build e pela interação no navegador.
