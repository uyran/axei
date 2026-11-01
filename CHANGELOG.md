# CHANGELOG — Estado atual do projeto

> Documento condensado em 11/10/2026: o histórico detalhado de implementações, correções e código substituído foi removido. Aqui vive apenas o **estado atual** — o que existe, o que funciona e o que falta.

## Visão geral

- **Expo SDK 57** · React Native 0.86.3 · React 19.2.3 · TypeScript ~6 · Expo Router ~57 · Reanimated 4.5.1.
- Estrutura: `src/app` (rotas), `src/components`, `src/constants`, `src/hooks`, `src/services`, `src/types`, `src/utils`; alias `@/* -> ./src/*`.
- Fundos dos cartões: degradê Material You (`@material/material-color-utilities` + `expo-linear-gradient`) com composição geométrica procedural; gesto horizontal de embaralhar a pilha com vibração (`expo-haptics`) e efeitos sonoros (`expo-audio`, `assets/sounds/`); gesto vertical rola a pilha.
- Verificação padrão: `npx tsc --noEmit` · `npx expo lint` · `npx expo export --platform android`.
- Cartões persistem em cache local (`expo-sqlite`) e sincronizam com o Supabase (fila offline com retry — Etapa 2.6; SQL de `supabase/schema.sql` aplicado no painel e sync validada em dispositivo em 12/10/2026).

## Etapa 1 — Login e autenticação — **PARCIAL**

**Funcionando e verificado em dispositivo (iPhone e Android):**

- Cadastro com confirmação de e-mail, login e logout com e-mail/senha.
- Persistência da sessão (via `expo-sqlite` localStorage) e proteção de rotas (públicas: `login`, `signup`, `recover`; privada: `index`).
- Recuperação de senha por e-mail.
- Mensagens de erro em português sem expor credenciais.

**Pendente para concluir a etapa:**

- **Validar o login com Google em build nativo** — no Expo Go, o servidor do Supabase completa o OAuth, mas o navegador não devolve o retorno (`exp://`) ao app. O código está pronto em `src/services/google-auth.ts` (deep link + `openAuthSessionAsync`); a validação está prevista para a **Etapa 3**, com scheme `axei://`.

**Arquivos-chave:** `src/services/supabase.ts`, `auth.ts`, `google-auth.ts`, `src/hooks/use-auth.ts`, `src/app/_layout.tsx` (proteção de rotas), `login.tsx`, `signup.tsx`, `recover.tsx`.

## Etapa 2 — Cartões e funcionamento — **EM ANDAMENTO**

| Sub | Status | O que existe hoje |
|---|---|---|
| 2.1 Tela principal e pilha | CONCLUÍDA | Especificação validada (11/10/2026). |
| 2.2 Modelo e regras | CONCLUÍDA | `Card` com `front: string` (HTML) e `back: BackItem[]`; ordenação alfabética case-insensitive; descarte de cartões vazios; nome provisório `Sem título`. |
| 2.3 Criação/abertura/rotação | CONCLUÍDA | FAB `+`, abertura em edição, pilha sobreposta rolável, favoritos (estrela no cartão + filtro no cabeçalho), rotação 3D (Reanimated). Gesto horizontal sobre a pilha anima e reposiciona os cartões temporariamente, com vibração e som (a ordem alfabética não muda); gesto vertical rola a pilha; seleção só por toque. |
| 2.4 Frente: editor | CONCLUÍDA | Mini editor rico WYSIWYG (`react-native-pell-rich-editor` + `react-native-webview`), rolagem interna do conteúdo (`useContainer={false}`); barra na base da frente, **dentro do cartão** (gira com a rotação 3D, na mesma posição da barra do verso), conforme `especificacao_mini_editor.md`: estilo Título/Subtítulo (Aa), B, listas/checklist, cor (6), ↶ (desfazer) — sem itálico e sem refazer, para abrir espaço (decisão confirmada em 31/10/2026); tabela 2×2 pelo botão ▦ (+ linha, + coluna); ícone salvar no canto superior esquerdo. |
| 2.5 Verso: mídias | CONCLUÍDA | Notas, fotos (**câmera ou galeria**, uma ou mais por cartão, decisão confirmada em 31/10/2026) e áudios (gravação/reprodução com `expo-audio`); botões com fundo `#DBEAFE` e borda preta, ícones/rótulos coloridos; durante a gravação o botão vermelho ocupa toda a largura da barra; arquivos em `documentDirectory` (`card-files/` para fotos); remoção apaga o arquivo local. |
| 2.6 Dados/sync/offline | PARCIAL | Cache local (`expo-sqlite` — `cards`/`outbox`/`meta`/`media_outbox`), salvamento automático (debounce 800ms), push/pull por `user_id` com fila offline e retry de 45s (incluindo exclusões de mídia); o cartão de emergência só é criado após um pull inicial bem-sucedido e sem cartões remotos, evitando sobrescrita após falha de rede. Upload de fotos/áudios ao bucket `card-media` com cache local e download sob demanda, reconciliação de exclusões. **SQL aplicado no painel e sync validada em dispositivo (12/10/2026).** Pendências: testar offline, 2 aparelhos e upload de mídia nova. |
| 2.7 Busca/favoritos/vazios | PARCIAL | Busca por nome e conteúdo da frente, filtro de favoritos e estados vazios funcionando na tela principal. Banner do cartão de emergência removido em 31/10/2026: agora o cartão é criado automaticamente na inicialização quando não há cartões. |
| 2.8 Exclusão/integridade | PARCIAL | Exclusão com confirmação funcionando; isolamento por usuário via `user_id` + RLS; exclusão de mídia local e do Storage implementada em 31/10/2026 (fila local `media_outbox`). Falta validar em dispositivo a exclusão com mídia já sincronizada. |
| 2.9 Testes integrados | NÃO INICIADA | Bateria final em dispositivo; testes em dispositivo das subetapas 2.2–2.5 ainda pendentes. |

**Cartão de emergência:** conteúdo validado pelo usuário (190, 192, 193, 199, 191, 180, 100). Nome **vermelho** na pilha e no editor; fica **sempre por último** na pilha principal, inclusive em buscas. No filtro de favoritos, se estiver favoritado, segue a ordenação alfabética dos demais favoritos; caso contrário, não aparece. **Somente ele** exibe o conteúdo da frente na pilha (área rolável). O id fixo `emergency` da decisão original foi substituído em 31/10/2026 por `emergency:<user_id>` para evitar colisão entre usuários (sem SQL novo); cartões legados continuam reconhecidos. **Em 31/10/2026 o banner de oferta foi removido:** quando a inicialização termina sem nenhum cartão, o cartão de emergência é criado automaticamente, sem consulta ao usuário.

**Fundos dos cartões (Material You):** cada cartão tem seed própria que gera cor-fonte aleatória → paleta tonal harmoniosa (`themeFromSourceColor`); fundo em degradê diagonal `tone(80)→tone(94)` com formas geométricas (círculos, barras, diamantes) nas tonalidades da família + branco, mais `glassSheen` leve. Substitui o fundo branco com paleta fixa (`GLASS_PALETTE` removida). API `CardBackground({ seed, style })` inalterada — mesmas faces/pilha.

## Etapa 3 — Builds e distribuição — **NÃO INICIADA**

Pendências concentradas aqui: login Google em build nativo (`axei://`), identificadores/permissões (novo prebuild para refletir a correção do microfone), builds de teste e publicação sob autorização específica. React Native Skia não está instalado nem é utilizado; os fundos atuais usam Material You. Sua adoção futura só será considerada se houver requisito para glass real ou mesh gradient.

## Limpeza de código não usado — 11/10/2026

Após a reimplementação da frente, removidos: `getCurrentSession` (`src/services/auth.ts`), `discardCardIfEmpty` (`src/hooks/use-cards.tsx` — descarte é feito via `beforeRemove` + `deleteCard`) e o export de `CARD_INTERNAL_NAME` (`src/utils/cards.ts`). Verificado com `tsc` e `lint`.

## Limpeza — 12/10/2026

Na troca dos fundos para Material You: removida `GLASS_PALETTE` e o fundo branco de `card-background.tsx`. Varredura de estilos/imports não usados nos arquivos alterados (`card/[id].tsx`, `index.tsx`, `card-stack-item.tsx`, `formatting-toolbar.tsx`, `table-block.tsx`, `content-editor.tsx`, `card-background.tsx`): nenhum resquício. Dependências novas: `expo-linear-gradient`, `@material/material-color-utilities`, `expo-haptics`.

## Limpeza - 30/10/2026

Varredura solicitada: linhas quebradas/desnecessárias (`tsc` e `expo lint` limpos), implementações descartadas remanescentes (nenhum resquício encontrado) e checagem de chaves/arquivos no Git (nenhum problema). **Removido código não utilizado:** `hasPendingSync` (`src/services/sync.ts`) e import não utilizado `outboxCount` (via `db`), sem consumidores no app. Nenhuma linha quebrada encontrada; nenhuma implementação descartada remanescente; `.env.local` íntegro (não rastreado no Git, ignorado via `.gitignore`, contendo apenas chaves `EXPO_PUBLIC_`).

## Ajustes — 31/10/2026

**Decisões de produto confirmadas com o usuário:**

- **Câmera mantida** no verso, junto da galeria. `PROJECT.md` §3.6 alinhado.
- **Barra de formatação permanece dentro da frente do cartão**. `PROJECT.md` §3.5 e `especificacao_mini_editor.md` alinhados.
- **Itálico (`I`) e refazer (`↷`) permanecem removidos** da barra. `PROJECT.md` §3.5 e `especificacao_mini_editor.md` alinhados.
- **Cartão de emergência automático:** o banner de oferta foi removido. Ao final da inicialização, se a lista de cartões estiver vazia, o cartão `Emergência` é criado automaticamente e passa a aparecer na pilha, sem consulta ao usuário. A decisão substitui a regra anterior de perguntar a cada lista vazia. Implementado em `src/hooks/use-cards.tsx`, com espera pela primeira sincronização para não criar um cartão indevido quando o servidor já tiver cartões do usuário. `PROJECT.md` §3.8 e §1 alinhados.

**Correções técnicas:**

- `app.json`: `expo-image-picker.microphonePermission` deixou de ser `false` e passou a usar a mesma mensagem do `expo-audio`. O valor anterior fazia o plugin remover `android.permission.RECORD_AUDIO` do manifesto gerado, podendo bloquear a gravação de áudio em build nativo. **Não foi executado prebuild**; o `android/` local gerado continua com o manifesto antigo até um novo prebuild.
- Instalado `expo-asset` (`~57.0.20`), peer dependency obrigatória de `expo-audio`. O `expo-constants` passou a `57.0.22` dentro do range já declarado.

**Registros que faltavam no documento:**

- Efeitos sonoros em `assets/sounds/` (`sound1`, `sound2`, `sound4`) usados na seleção de cartão, no flip e no gesto de embaralhar. **Os arquivos ainda não estão rastreados no Git** — precisam ser adicionados antes de clone limpo/build.
- Gesto de embaralhar também na horizontal, com direção e intensidade.
- Botões das barras (frente e verso) com fundo `#DBEAFE` e borda preta; barra de busca com fundo fixo `#c0def3` (fora de `src/constants/colors.ts`).

**Correções de integridade (aprovadas em 31/10/2026):**

- **Cartão de emergência:** o identificador deixou de ser o valor fixo `emergency` e passou a ser `emergency:<user_id>` (`src/utils/cards.ts`). Como `public.cards.id` é chave primária global, o id fixo fazia o segundo usuário colidir com a linha do primeiro; o `upsert` era recusado pela RLS e a fila offline retentava para sempre. Cartões legados com `emergency` continuam reconhecidos por `isEmergencyCard`. Se já existe um cartão de emergência, `createEmergencyCard` no provider devolve o existente em vez de duplicar. **Nenhuma alteração de schema.**
- **Órfãos de mídia local:** após o upload, a cópia em `card-files/`/`documentDirectory` só é apagada depois que o cartão foi gravado no servidor com sucesso, e a cópia em `media-cache/` passa a ser a única local. Remover um item ou excluir um cartão apaga essa cópia (`src/services/media.ts` e novo `src/services/media-cleanup.ts`).
- **Órfãos no Storage:** nova tabela **local** `media_outbox` (`src/services/db.ts`) enfileira caminhos a excluir. `flushMediaOutbox` (`src/services/sync.ts`) remove os objetos na sincronização, com retry, inclusive a pasta `userId/cardId/` inteira ao excluir o cartão. Sem SQL novo: as políticas de `select` e `delete` já existentes bastam.
- **Upload travado:** `uploadCardMedia` passou a usar `upsert: false` e a tratar o erro de objeto já existente como sucesso. O caminho é único por item, então não há necessidade real de sobrescrever; isso evita depender de uma política de `UPDATE` que o bucket não tem.

**Verificação em 31/10/2026:**

- `npx tsc --noEmit`: sem erros.
- `npx expo lint`: sem erros.
- Dependências Expo: as cinco versões de patch foram alinhadas em 01/11/2026; `npx expo install --check` confirmou que estão atualizadas.

**Pendências abertas:**

- Versionar `assets/sounds/`.
- Cartão legado `emergency` que já esteja preso na fila de um segundo usuário continua preso: esta correção só vale para cartões novos. Regularizar exige migração de id e análise caso a caso.
- `media-cache/` e `card-files/` sobrevivem ao logout; limpar no encerramento de sessão foi proposto, mas não autorizado nesta rodada.
- Política de `UPDATE` no bucket `card-media` continua ausente (não é mais necessária com `upsert: false`).
- Configurar identificadores e `eas.json` na Etapa 3.

## Ajuste — 01/11/2026

- **Ordenação do cartão de emergência:** regra esclarecida pelo usuário: fica por último na pilha principal, inclusive em buscas; no filtro de favoritos, se estiver marcado, segue a ordem alfabética dos favoritos. Implementada essa exceção condicional em `src/app/index.tsx` e alinhado o `PROJECT.md`.
- **Alinhamento dos requisitos da tela principal:** `PROJECT.md` atualizado para refletir o botão e a confirmação de exclusão, os textos atuais dos estados vazios e o gesto de embaralhar implementado. Esses itens deixam de constar como pendências documentais.
- **Gesto vertical na pilha:** gesto para cima/baixo rola a pilha e não abre o cartão; somente um toque seleciona. O embaralhamento continua somente no gesto horizontal. Código e `PROJECT.md` alinhados.
- **Cor do texto no editor:** removida a tentativa customizada de preservar a seleção, que não funcionou de forma confiável; a paleta voltou a usar `setForeColor` da biblioteca `react-native-pell-rich-editor`.
- **Tamanho da fonte no editor:** substituídos os estilos Título/Subtítulo por controles A−/A+ que ajustam o texto selecionado usando `setFontSize`; removidas as regras CSS que fixavam o tamanho dos elementos e impediam a alteração.
- **Ajuste de A−/A+:** removido o mapeamento customizado de níveis. O tamanho padrão visual passou de 22 px para 16 px, alinhado ao nível 3 da biblioteca `react-native-pell-rich-editor`; os botões avançam ou recuam diretamente pelos níveis nativos.
- **Menu de estilo do editor:** por decisão do usuário, o primeiro menu voltou a oferecer Título/Subtítulo (`heading1`/`heading2`); tamanho base restaurado para 22 px.
- **Sincronização inicial:** falhas no pull agora são diferenciadas de uma lista remota vazia; o cartão de emergência só é criado após confirmação de pull bem-sucedido, evitando sobrescrever um cartão remoto após falha de conexão.
- **Retry de exclusão de mídia:** a contagem periódica de operações pendentes agora inclui `media_outbox`, permitindo novas tentativas enquanto o app permanece aberto.
- **Dependências Expo:** alinhadas às versões recomendadas pelo SDK 57 (`expo`, `expo-auth-session`, `expo-linking`, `expo-router` e `expo-splash-screen`).
