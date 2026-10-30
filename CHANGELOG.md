# CHANGELOG — Estado atual do projeto

> Documento condensado em 11/10/2026: o histórico detalhado de implementações, correções e código substituído foi removido. Aqui vive apenas o **estado atual** — o que existe, o que funciona e o que falta.

## Visão geral

- **Expo SDK 57** · React Native 0.86.3 · React 19.2.3 · TypeScript ~6 · Expo Router ~57 · Reanimated 4.5.1.
- Estrutura: `src/app` (rotas), `src/components`, `src/constants`, `src/hooks`, `src/services`, `src/types`, `src/utils`; alias `@/* -> ./src/*`.
- Fundos dos cartões: degradê Material You (`@material/material-color-utilities` + `expo-linear-gradient`) com composição geométrica procedural; gesto de embaralhar a pilha com vibração (`expo-haptics`).
- Verificação padrão: `npx tsc --noEmit` · `npx expo lint` · `npx expo export --platform android`.
- Cartões persistem em cache local (`expo-sqlite`) e sincronizam com o Supabase (fila offline com retry — Etapa 2.6, cliente pronto; SQL pendente de aplicar no painel).

## Etapa 1 — Login e autenticação — **PENDENTE**

**Funcionando e verificado em dispositivo (iPhone e Android):**

- Cadastro com confirmação de e-mail, login e logout com e-mail/senha.
- Persistência da sessão (via `expo-sqlite` localStorage) e proteção de rotas (públicas: `login`, `signup`, `recover`; privada: `index`).
- Recuperação de senha por e-mail.
- Mensagens de erro em português sem expor credenciais.

**Bloqueado:**

- **Login com Google não funciona no Expo Go** — o servidor do Supabase completa o OAuth, mas o navegador não devolve o retorno (`exp://`) ao app. Código pronto em `src/services/google-auth.ts` (deep link + `openAuthSessionAsync`); revisão no **build nativo da Etapa 3** com scheme `axei://`.

**Arquivos-chave:** `src/services/supabase.ts`, `auth.ts`, `google-auth.ts`, `src/hooks/use-auth.ts`, `src/app/_layout.tsx` (proteção de rotas), `login.tsx`, `signup.tsx`, `recover.tsx`.

## Etapa 2 — Cartões e funcionamento — **EM ANDAMENTO**

| Sub | Status | O que existe hoje |
|---|---|---|
| 2.1 Tela principal e pilha | CONCLUÍDA | Especificação validada (11/10/2026). |
| 2.2 Modelo e regras | CONCLUÍDA | `Card` com `front: string` (HTML) e `back: BackItem[]`; ordenação alfabética case-insensitive; descarte de cartões vazios; nome provisório `Sem título`. |
| 2.3 Criação/abertura/rotação | CONCLUÍDA | FAB `+`, abertura em edição, pilha sobreposta rolável, favoritos (estrela no cartão + filtro no cabeçalho), rotação 3D (Reanimated). Arrastar de cima para baixo sobre a pilha embaralha os cartões com vibração e os reposiciona; seleção só por toque. |
| 2.4 Frente: editor | CONCLUÍDA | Mini editor rico WYSIWYG (`react-native-pell-rich-editor` + `react-native-webview`), rolagem interna do conteúdo (`useContainer={false}`); barra na base da frente, **dentro do cartão** (gira com a rotação 3D, na mesma posição da barra do verso), conforme `especificacao_mini_editor.md`: Aa (Título/Subtítulo), B, listas/checklist, cor (6), ↶ (desfazer) — sem itálico e sem refazer, para abrir espaço; tabela 2×2 pelo botão ▦ (+ linha, + coluna); ícone salvar no canto superior esquerdo. |
| 2.5 Verso: mídias | CONCLUÍDA | Notas, fotos (**câmera ou galeria**, uma ou mais por cartão) e áudios (gravação/reprodução com `expo-audio`); botões coloridos na barra; durante a gravação o botão vermelho ocupa toda a largura da barra; arquivos em `documentDirectory` (`card-files/` para fotos); remoção apaga o arquivo. |
| 2.6 Dados/sync/offline | PARCIAL | Cache local (`expo-sqlite` — `cards`/`outbox`/`meta`), salvamento automático (debounce 800ms), push/pull por `uid` com fila offline e retry de 45s, upload de fotos/áudios ao bucket `card-media` com cache local e download sob demanda, reconciliação de exclusões. **SQL aplicado no painel e sync validada em dispositivo (12/10/2026).** Pendências: testar offline, 2 aparelhos e upload de mídia nova. |
| 2.7 Busca/favoritos/vazios | PARCIAL | Busca por nome e conteúdo da frente, filtro de favoritos e estados vazios funcionando na tela principal. Banner do cartão de emergência implementado e **testado em dispositivo com sucesso (12/10/2026)** (decisões de 12/10/2026). |
| 2.8 Exclusão/integridade | PARCIAL | Exclusão com confirmação funcionando. Falta: arquivos órfãos de cartão excluído e isolamento por usuário (depende da 2.6). |
| 2.9 Testes integrados | NÃO INICIADA | Bateria final em dispositivo; testes em dispositivo das subetapas 2.2–2.5 ainda pendentes. |

**Cartão de emergência:** conteúdo validado pelo usuário (190, 192, 193, 199, 191, 180, 100). Regras decididas em 12/10/2026: banner sempre que não houver cartões (volta a perguntar se apagar todos); nome **vermelho** na pilha e no editor; **sempre por último** na pilha (inclusive em busca/favoritos); **somente ele** exibe o conteúdo da frente na pilha (área rolável); id fixo `emergency` (sem SQL novo). Testado em dispositivo com sucesso em 12/10/2026.

**Fundos dos cartões (Material You):** cada cartão tem seed própria que gera cor-fonte aleatória → paleta tonal harmoniosa (`themeFromSourceColor`); fundo em degradê diagonal `tone(80)→tone(94)` com formas geométricas (círculos, barras, diamantes) nas tonalidades da família + branco, mais `glassSheen` leve. Substitui o fundo branco com paleta fixa (`GLASS_PALETTE` removida). API `CardBackground({ seed, style })` inalterada — mesmas faces/pilha.

## Etapa 3 — Builds e distribuição — **NÃO INICIADA**

Pendências concentradas aqui: login Google em build nativo (`axei://`), identificadores/permissões, builds de teste e publicação sob autorização específica. Skia não é mais necessário para fundos (adotado Material You); só voltaria se glass real/mesh gradient for desejado.

## Limpeza de código não usado — 11/10/2026

Após a reimplementação da frente, removidos: `getCurrentSession` (`src/services/auth.ts`), `discardCardIfEmpty` (`src/hooks/use-cards.tsx` — descarte é feito via `beforeRemove` + `deleteCard`) e o export de `CARD_INTERNAL_NAME` (`src/utils/cards.ts`). Verificado com `tsc` e `lint`.

## Limpeza — 12/10/2026

Na troca dos fundos para Material You: removida `GLASS_PALETTE` e o fundo branco de `card-background.tsx`. Varredura de estilos/imports não usados nos arquivos alterados (`card/[id].tsx`, `index.tsx`, `card-stack-item.tsx`, `formatting-toolbar.tsx`, `table-block.tsx`, `content-editor.tsx`, `card-background.tsx`): nenhum resquício. Dependências novas: `expo-linear-gradient`, `@material/material-color-utilities`, `expo-haptics`.
