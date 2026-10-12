# CHANGELOG — Estado atual do projeto

> Documento condensado em 11/10/2026: o histórico detalhado de implementações, correções e código substituído foi removido. Aqui vive apenas o **estado atual** — o que existe, o que funciona e o que falta.

## Visão geral

- **Expo SDK 57** · React Native 0.86.3 · React 19.2.3 · TypeScript ~6 · Expo Router ~57 · Reanimated 4.5.1.
- Estrutura: `src/app` (rotas), `src/components`, `src/constants`, `src/hooks`, `src/services`, `src/types`, `src/utils`; alias `@/* -> ./src/*`.
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
| 2.3 Criação/abertura/rotação | CONCLUÍDA | FAB `+`, abertura em edição, pilha sobreposta rolável, favoritos (estrela no cartão + filtro na busca), rotação 3D (Reanimated). |
| 2.4 Frente: editor | CONCLUÍDA | Mini editor rico WYSIWYG (`react-native-pell-rich-editor` + `react-native-webview`); barra na base da frente, **dentro do cartão** (gira com a rotação 3D, na mesma posição da barra do verso), conforme `especificacao_mini_editor.md`: Aa (Título/Subtítulo), B, listas/checklist, cor (6), ↶ (desfazer) — sem itálico e sem refazer, para abrir espaço; tabela 2×2 pelo botão ▦ (+ linha, + coluna); ícone salvar no canto superior esquerdo. |
| 2.5 Verso: mídias | CONCLUÍDA | Notas, fotos (**câmera ou galeria**, uma ou mais por cartão) e áudios (gravação/reprodução com `expo-audio`); botões coloridos na barra; durante a gravação o botão vermelho ocupa toda a largura da barra; arquivos em `documentDirectory` (`card-files/` para fotos); remoção apaga o arquivo. |
| 2.6 Dados/sync/offline | PARCIAL | Cache local (`expo-sqlite` — `cards`/`outbox`/`meta`), salvamento automático (debounce 800ms), push/pull por `uid` com fila offline e retry de 45s, upload de fotos/áudios ao bucket `card-media` com cache local e download sob demanda, reconciliação de exclusões. **SQL aplicado no painel e sync validada em dispositivo (12/10/2026).** Pendências: testar offline, 2 aparelhos e upload de mídia nova. |
| 2.7 Busca/favoritos/vazios | PARCIAL | Busca por nome e conteúdo da frente, filtro de favoritos e estados vazios funcionando na tela principal. Falta: banner do cartão de emergência. |
| 2.8 Exclusão/integridade | PARCIAL | Exclusão com confirmação funcionando. Falta: arquivos órfãos de cartão excluído e isolamento por usuário (depende da 2.6). |
| 2.9 Testes integrados | NÃO INICIADA | Bateria final em dispositivo; testes em dispositivo das subetapas 2.2–2.5 ainda pendentes. |

**Cartão de emergência:** conteúdo validado pelo usuário (190, 192, 193, 199, 191, 180, 100); banner de criação automática será implementado na 2.7.

## Etapa 3 — Builds e distribuição — **NÃO INICIADA**

Pendências concentradas aqui: login Google em build nativo (`axei://`), React Native Skia para fundos (se adotado), identificadores/permissões, builds de teste e publicação sob autorização específica.

## Limpeza de código não usado — 11/10/2026

Após a reimplementação da frente, removidos: `getCurrentSession` (`src/services/auth.ts`), `discardCardIfEmpty` (`src/hooks/use-cards.tsx` — descarte é feito via `beforeRemove` + `deleteCard`) e o export de `CARD_INTERNAL_NAME` (`src/utils/cards.ts`). Verificado com `tsc` e `lint`.
