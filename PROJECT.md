# AXEI — Definição do aplicativo e plano de desenvolvimento

> **Documento principal do projeto.** Mantido como `PROJECT.md` na raiz. O estado atual do código e das verificações vive no `CHANGELOG.md`.

## 1. Definição e objetivo

O **Axei** é um aplicativo móvel (Android e iOS) para criar, organizar, pesquisar e consultar dados em **cartões pessoais**. Cada cartão tem:

- **Frente** — um mini editor rico WYSIWYG para conteúdo textual (títulos, negrito, itálico, cores, listas, checklist, tabelas).
- **Verso** — anotações, fotografias da galeria e gravações de áudio.

**Fluxo resumido:** o usuário faz login, vê uma **pilha visual de cartões sobrepostos** (não uma lista) na tela principal, cria cartões com o botão **+**, edita frente e verso com rotação 3D do cartão, favorita, pesquisa por nome/conteúdo e exclui com confirmação. No primeiro acesso (ou sem cartões), um banner oferece criar automaticamente um **cartão de emergência** com números úteis.

O acesso é individual por usuário; os dados ficam protegidos por conta, com sincronização com a nuvem (Supabase) e suporte offline previstos na Etapa 2.6.

## 2. Tecnologia

**Em uso hoje:**

- Expo SDK 57, React Native 0.86.3, React 19.2.3, TypeScript ~6, Expo Router ~57 (rotas em `src/app`, alias `@/* -> ./src/*`).
- Supabase — autenticação (e-mail/senha + Google), cliente em `src/services/supabase.ts` com sessão persistente via `expo-sqlite` localStorage.
- `react-native-pell-rich-editor` + `react-native-webview` — frente do cartão (mini editor rico, compatível com Expo Go).
- `expo-audio`, `expo-image-picker`, `expo-file-system` — verso do cartão (áudio, fotos, arquivos locais).
- React Native Reanimated — rotação 3D do cartão; `@expo/vector-icons` (Ionicons) — ícones.

**Previsto (ainda não instalado/ativo):**

- Supabase PostgreSQL + políticas RLS + Supabase Storage — persistência, sincronização e offline (Etapa 2.6).
- React Native Skia — fundos visuais dos cartões (alternativa atual: fundo *glass* procedural em SVG/CSS; Skia exige build nativo — Etapa 3).
- Login Google em build nativo com scheme `axei://` (Etapa 3 — no Expo Go o retorno OAuth não é capturado).

**Regras técnicas:** manter as tecnologias principais salvo autorização expressa; confirmar compatibilidade antes de atualizar; instalar pacotes Expo com `npx expo install`; separar telas, componentes, serviços, tipos e utilitários; não tratar o PostgreSQL como armazenamento automático de multimídia (fotos/áudios vão para o Storage).

## 3. Regras para a IA

### 3.1 Autorização e escopo

- Antes de **qualquer** implementação: ler este arquivo e o `CHANGELOG.md`, examinar o código existente, registrar o diagnóstico e **apresentar o escopo aguardando autorização**.
- Executar somente a etapa/tarefa expressamente autorizada. Ao concluir, parar, resumir e pedir autorização para a próxima.
- Não tomar decisões que alterem requisitos, arquitetura, modelo de dados, dependências importantes ou comportamento do app sem consultar o usuário.
- Não ampliar escopo nem adicionar funcionalidades não previstas.

### 3.2 Verificações e testes

- **Itens marcados como `[x]` ou `CONCLUÍDO` não precisam ser relidos nem revalidados a cada nova etapa** — consultar apenas se a nova etapa depender diretamente deles.
- **Verificação completa (`tsc`, `lint`, `expo export`) somente após mudanças críticas**: dependências novas/removidas, modelo de dados, navegação, reimplementações de componentes grandes. Ajustes pequenos (estilo, rótulos, correções pontuais) bastam `tsc` + `lint` ou nenhuma bateria, a critério do tamanho da mudança.
- Testes em dispositivo só quando o usuário pedir ou quando a mudança for de risco alto; não inventar resultados de teste.
- Nunca afirmar que teste/build/sincronização foi executado sem ter executado.

### 3.3 Documentação

- `PROJECT.md` mantém apenas requisitos e estado **vigentes**; `CHANGELOG.md` mantém apenas o **estado atual** do projeto (sem saga de código que foi implementado e substituído).
- Ao substituir código/instrução, remover no mesmo momento a versão obsoleta.
- Nunca commitar senhas, tokens ou credenciais; `.env.local` é a única fonte das chaves públicas.

### 3.4 Segurança e dependências

- RLS do Supabase deve garantir que cada usuário só acesse seus próprios dados (Etapa 2.6).
- Não adicionar bibliotecas sem necessidade comprovada; evitar versões beta/alpha.

## 4. Funcionalidades e regras vigentes

**Autenticação (Etapa 1):** e-mail/senha (cadastro, login, logout, recuperação de senha) e Google; sessão persistente; rotas protegidas (públicas: `login`, `signup`, `recover`; privada: `index`); mensagens de erro em português sem expor credenciais. **Google está bloqueado no Expo Go** (retorno OAuth não capturado) — revisão no build nativo da Etapa 3.

**Tela principal:** ícone do app no topo; barra de pesquisa **sempre visível** com botão de estrela ao lado que alterna filtro de somente favoritos; pilha vertical de cartões sobrepostos (altura ≈ 1,2 × largura, bordas arredondadas, aparência 3D), cada um deslocado para baixo de modo que o nome de todos fique visível; com muitos cartões a pilha rola; ordenação **alfabética crescente case-insensitive** (pt-BR); favoritar não altera a ordenação; estrela (favoritar/desfavoritar) no canto superior esquerdo de **todos** os cartões; FAB **+** no canto inferior direito; estados vazios distintos ("Toque em +..." / "Nenhum cartão encontrado" / "Nenhum cartão favorito ainda").

**Cartão novo:** abre imediatamente em modo de edição, nome vazio com placeholder `Nome do cartão`, fundo *glass* aleatório por cartão (o mesmo na frente e no verso). Cartão sem nome nem conteúdo significativo é **descartado silenciosamente** ao sair; com conteúdo mas sem nome, Alert "Dá um nome ao cartão" (manter como "Sem título" ou descartar). O nome interno provisório é `Sem título`.

**Tela do cartão:** rotação tridimensional no eixo Y (Reanimated, 450 ms) entre frente e verso; menu de exclusão no canto superior direito **da tela** (com confirmação); nome sempre centralizado e, ao focar, cursor no início do campo (sem mover o texto).

**Frente do cartão — mini editor rico WYSIWYG** (`react-native-pell-rich-editor` + `react-native-webview`, barra idêntica a `especificacao_mini_editor.md`, aprovada em 11/10/2026):

- Conteúdo salvo como **string HTML** (`Card.front`).
- Barra de formatação **dentro do cartão, na base da frente** (mesma posição da barra do verso; gira junto com a rotação 3D): **Aa** (Título/Subtítulo) · **B** · **☷** listas (marcadores, numerada, checklist) · **A** cor (6 cores) · **↶** (desfazer).
- Botão **▦** à parte: Nova tabela 2×2, + Linha, + Coluna.
- Ícone de **salvar** no canto superior esquerdo da frente (recolhe teclado); favorito só na tela principal.

**Verso do cartão — barra inferior com:** Nota (caixa de texto multilinha), Foto (escolha entre **tirar uma foto com a câmera do próprio celular** ou selecionar da galeria; o app permite **uma ou mais fotos** por cartão) e Gravar (áudio com duração ao vivo; **enquanto grava, o botão vermelho ocupa toda a largura da barra** com o tempo decorrido, voltando ao normal ao parar). Botões coloridos (ícone e fundo). Áudios gravados direto no diretório de fotos copiadas para `documentDirectory/card-files/`; remover um item apaga o arquivo físico. Permissões negadas tratadas com Alert.

**Cartão de emergência (Etapa 2.7):** sempre que o usuário não tiver **nenhum** cartão (primeira abertura ou depois de apagar todos), um banner na área vazia pergunta se deseja criá-lo automaticamente (botões **Criar** / **Agora não** — "Agora não" esconde até o próximo lançamento); se aceitar, cartão `Emergência` (id fixo `emergency`, sem SQL novo) com o conteúdo abaixo na frente. **Regras:** nome **vermelho** na pilha e no editor; **sempre exibido por último** na pilha (inclusive em busca/favoritos); **somente ele** mostra o conteúdo da frente como texto na pilha (os demais cartões continuam só com a faixa de nome); participa normalmente de busca e favoritos.

```
190 – Polícia Militar
192 – SAMU
193 – Corpo de Bombeiros
199 – Defesa Civil
191 – Polícia Rodoviária Federal
180 – Central de Atendimento à Mulher
100 – Direitos Humanos - Violações contra Crianças e Adolescentes
```

**Regras gerais:** sem campo de data de alteração (data de criação pode ser exibida se prevista na interface); salvamento automático em memória (persistência na 2.6); busca por nome e conteúdo textual da frente, case-insensitive.

## 5. Etapas

| Etapa | Status | Resumo |
|---|---|---|
| 1 — Login e autenticação | **PENDENTE** | E-mail/senha, sessão, rotas e recuperação **aprovados em dispositivo** (iPhone e Android). Única pendência: **login Google não funciona no Expo Go** (deep link `exp://` do retorno OAuth não é capturado; código pronto, revisão no build nativo da Etapa 3 com scheme `axei://`). |
| 2 — Cartões e funcionamento | **EM ANDAMENTO** | Ver subetapas abaixo. |
| 3 — Builds e distribuição | NÃO INICIADA | Revisar identificadores, permissões e RLS; builds de teste; login Google em build nativo; Skia (se adotado); publicação sob autorização específica. |

### Etapa 2 — subetapas

| Sub | Status | Resumo |
|---|---|---|
| 2.1 Tela principal e pilha | CONCLUÍDA | Especificação validada pelo usuário em 11/10/2026. |
| 2.2 Modelo e regras de negócio | CONCLUÍDA | Modelo `Card` em `src/types/card.ts` (frente: string HTML; verso: `BackItem[]`); ordenação, descarte e nome provisório implementados. Teste em dispositivo pendente junto com 2.9. |
| 2.3 Criação, abertura, edição e rotação | CONCLUÍDA | Botão `+`, abertura em edição, pilha, favoritos, rotação 3D. Teste em dispositivo pendente junto com 2.9. |
| 2.4 Frente: editor e formatação | CONCLUÍDA | Mini editor rico WYSIWYG (pell + WebView) com barra conforme `especificacao_mini_editor.md` (A+/A− removidos); `Card.front` como HTML; tabela pelo botão ▦ (+ linha, + coluna). Teste em dispositivo pendente junto com 2.9. |
| 2.5 Verso: anotações, fotos e áudio | CONCLUÍDA | Notas, fotos (galeria) e áudio (gravação/reprodução); arquivos em `documentDirectory`. Teste em dispositivo pendente junto com 2.9. Sync com Storage fica na 2.6. |
| 2.6 Dados, sincronização e offline | PARCIAL | Cache local (`expo-sqlite`), salvamento automático, push/pull por `uid` com fila offline e retry, upload de mídia ao bucket `card-media` com cache local. **SQL aplicado no painel e sync validada em dispositivo (12/10/2026).** Pendências para fechar: testar modo offline (fila sem rede), sync entre 2 aparelhos e confirmação de upload de mídia nova no bucket. |
| 2.7 Busca, favoritos e estados vazios | PARCIAL | Busca, filtro de favoritos e estados vazios funcionam na tela principal. **Banner do cartão de emergência implementado (regras decididas com o usuário em 12/10/2026, ver seção 4).** Falta: teste em dispositivo. |
| 2.8 Exclusão e integridade | PARCIAL | Exclusão com confirmação já existe. Falta: tratar arquivos órfãos (foto/áudio de cartão excluído) e testar isolamento por usuário (depende da 2.6). |
| 2.9 Testes integrados e encerramento | NÃO INICIADA | Bateria final em dispositivo (criação, edição, rotação, favoritos, ordenação, busca, exclusão, editor, checklist, tabela, mídias, offline) + correções + encerramento da etapa. |

### Regras de encerramento

Uma etapa só vira `CONCLUÍDA` quando as tarefas foram executadas (ou exceções autorizadas), os testes aplicáveis foram executados e registrados, os documentos refletem o estado real sem instruções obsoletas, as pendências estão listadas e o usuário recebeu o resumo. Ao concluir, **parar e aguardar autorização** antes da próxima etapa.
