# ARG Game Engine — v0.1

Primeiro protótipo do editor de jogos 2D/ARG.

## O que já funciona

- Criar vários projetos.
- Definir nome do projeto e mapa.
- Alterar tamanho e cor do mapa.
- Definir velocidade, tamanho e cor do jogador.
- Arrastar o jogador no editor para escolher o spawn.
- Testar o jogo imediatamente.
- Movimento com WASD ou setas.
- Guardado automático usando localStorage.
- Funciona como site estático no GitHub Pages.

## Como testar no PC

Podes abrir `index.html` diretamente no browser.

Se preferires um servidor local:

```bash
python -m http.server 8000
```

Depois abre:

```text
http://localhost:8000
```

## GitHub Pages

1. Cria um repositório no GitHub.
2. Envia todos os ficheiros desta pasta.
3. Vai a Settings > Pages.
4. Em "Build and deployment", escolhe "Deploy from a branch".
5. Escolhe `main` e `/root`.
6. Guarda.

## Próxima versão sugerida — v0.2

- Ferramenta para desenhar paredes.
- Colisões.
- Objetos.
- Seleção/movimento/redimensionamento de objetos.
- Layers.
- Undo/redo.
