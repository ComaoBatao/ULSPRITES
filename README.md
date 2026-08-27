# ARG Point & Click Engine v0.1

Esta é a nova base do projeto: um criador de jogos narrativos/ARG por imagens, sem personagem a andar em tempo real.

## Menu

Jogador normal:
- NOME DO JOGO
- JOGAR
- ENTRAR COM SAVE

Administrador:
- NOME DO JOGO
- JOGAR
- ENTRAR COM SAVE
- EDITAR JOGO

Para entrar como admin abre:

`admin.html`

Password de teste:

`admin`

Podes mudá-la em `js/config.js`.

> IMPORTANTE: como esta build é 100% estática/GitHub Pages, a autenticação de admin é apenas para protótipo e NÃO é segura contra alguém que inspecione o código. Para proteção real do editor público, a próxima etapa é Firebase Authentication / backend.

## O editor já inclui

### Ambientes e vistas
- Criar ambientes/salas.
- Criar várias vistas dentro da mesma sala.
- Cada vista usa uma URL de imagem.
- Mudar entre vistas sem mudar de ambiente.
- Mudar para outro ambiente.

### Hotspots
- Criar hotspots clicáveis.
- Arrastar.
- Redimensionar.
- Mostrar como:
  - zona na imagem
  - botão abaixo da imagem
  - ambos
- Condição de visibilidade.
- Item obrigatório.
- Ações em sequência.
- Ações diferentes ao usar um item específico.

### Ações
- Mostrar texto.
- Mudar vista.
- Mudar ambiente.
- Abrir diálogo.
- Dar item.
- Remover item.
- Alterar variável.
- Abrir imagem.
- Tocar áudio.

### Inventário
- Itens com nome, descrição e imagem por URL.
- Selecionar item.
- Usar item num hotspot.
- Consumir item.
- Combinar item com item.
- Resultado de combinação.

### Diálogos
- Diálogos reutilizáveis.
- Várias falas.
- Personagem/falante.
- Encadeamento de falas.
- Escolhas.
- Escolhas podem alterar variáveis.

### Variáveis
- Criar variáveis do jogo.
- Definir valor inicial.
- Alterar por ações.
- Usar como condição para mostrar hotspots.

### Save
- SAVE gera um código portátil.
- ENTRAR COM SAVE aceita o código.
- Guarda:
  - ambiente atual
  - vista atual
  - inventário
  - variáveis

### Editor
- Undo `Ctrl+Z`.
- Redo `Ctrl+Y`.
- Exportar projeto em JSON.
- Importar projeto em JSON.
- Testar jogo em nova aba.

## Publicar no GitHub Pages

Envia todos os ficheiros deste ZIP para a raiz do repositório e ativa GitHub Pages.

A página inicial é `index.html`.

## Imagens

A engine é URL-first.

Exemplo:

`https://teusite.github.io/arg/assets/sala-centro.png`

Também podes guardar as imagens no próprio repositório e usar:

`assets/sala-centro.png`

## Próximos sistemas que encaixam bem

- eventos por data/hora
- sons de ambiente por vista
- música
- transições/fades
- vídeos
- códigos/passwords
- documentos colecionáveis
- estados diferentes da mesma sala
- estatísticas
- Firebase
- ARG Live Control
