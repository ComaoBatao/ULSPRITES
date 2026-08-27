# ARG Game Engine v0.2 — Core Editor

Protótipo muito mais completo do editor 2D.

## Já incluído

- Dashboard com vários projetos.
- Nome do protagonista.
- Vários mapas.
- Entity System.
- Parede.
- Objeto.
- NPC.
- Porta.
- Trigger.
- Luz.
- Asset Library.
- Upload de PNG / JPG / WEBP / GIF.
- Sprite do protagonista.
- Sprites por entidade/NPC.
- Seleção no mapa e hierarchy.
- Arrastar entidades.
- Redimensionar pelo canto inferior direito.
- Delete.
- Duplicar com Ctrl+D.
- Layers.
- Subir/descer layer.
- Ctrl+Z.
- Ctrl+Y.
- Inspector.
- Colisão configurável.
- Visibilidade configurável.
- Cor fallback.
- Spawn configurável.
- Porta entre mapas.
- Interação com E.
- NPC com nome e texto.
- Movimento WASD/setas.
- Colisão real durante o teste.
- Luzes básicas.
- Guardado automático no localStorage.

## Notas do protótipo

Os assets são guardados como Data URLs no localStorage. Isso é suficiente para testes pequenos, mas o navegador tem limite de armazenamento. Quando o engine passar para Firebase, os assets devem ir para Firebase Storage e os dados do projeto para Firestore.

Spritesheets/animações, diálogos ramificados, variáveis, event graph, inventário, save slots, cutscenes, efeitos CRT/VHS e ARG Live Control ainda não estão implementados nesta build.

## Testar

Abre `index.html`.

Também podes usar:

```bash
python -m http.server 8000
```

e abrir `http://localhost:8000`.

## GitHub Pages

É um site estático e pode ser publicado diretamente no GitHub Pages.
