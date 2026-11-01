
# AXEI — Definição do aplicativo e plano de desenvolvimento

## 1. Objetivo do projeto

O Axei é um aplicativo móvel para Android e iOS destinado à criação, organização, pesquisa e consulta de informações em cartões pessoais.

Cada cartão possui duas faces:

- **Frente:** editor de texto rico (WYSIWYG), com títulos, formatação, cores, listas, checklist e tabelas.
- **Verso:** anotações, fotografias da galeria e gravações de áudio.

### Fluxo principal

1. O usuário realiza o login.
2. A tela principal apresenta uma pilha visual de cartões sobrepostos, e não uma lista convencional.
3. O usuário pode criar cartões pelo botão `+`.
4. Cada cartão permite editar sua frente e seu verso por meio de rotação tridimensional.
5. É possível favoritar, pesquisar e excluir cartões.
6. Na inicialização, quando não houver nenhum cartão, o aplicativo cria automaticamente um cartão de emergência, sem consultar o usuário.

O acesso é individual por usuário. Os dados devem permanecer protegidos por conta, com persistência e sincronização na nuvem por meio do Supabase e suporte offline.

---

## 2. Tecnologias e arquitetura

### Tecnologias utilizadas

- Expo SDK 57.
- React Native 0.86.3.
- React 19.2.3.
- TypeScript 6.
- Expo Router, com rotas em `src/app`.
- Supabase para autenticação e serviços de backend.
- `expo-sqlite` para persistência local da sessão.
- `react-native-pell-rich-editor` e `react-native-webview` para o editor da frente do cartão.
- `expo-audio` para gravação e reprodução de áudio.
- `expo-image-picker` para seleção de fotografias.
- `expo-file-system` para armazenamento de arquivos locais.
- React Native Reanimated para animações e rotação 3D.
- `@expo/vector-icons` para ícones.

### Organização do código

Preservar a separação de responsabilidades entre:

- Telas e rotas.
- Componentes.
- Hooks.
- Serviços.
- Tipos.
- Utilitários.

O cliente Supabase está localizado em:

`src/services/supabase.ts`

O modelo principal dos cartões está localizado em:

`src/types/card.ts`

Preservar os caminhos e a organização existentes, salvo necessidade técnica justificada.

### Tecnologias e recursos previstos

- Supabase PostgreSQL com políticas RLS para proteção dos dados.
- Supabase Storage para fotografias e áudios.
- Persistência local, sincronização e suporte offline.
- Login Google em build nativo, utilizando o esquema `axei://`.

O estado de implementação de cada recurso deve ser consultado no `CHANGELOG.md`. Não considerar um recurso concluído apenas porque sua tecnologia está instalada.

---

## 3. Requisitos funcionais

### 3.1 Autenticação

O aplicativo deve oferecer:

- Cadastro com e-mail e senha.
- Login com e-mail e senha.
- Logout.
- Recuperação de senha.
- Autenticação com Google.
- Persistência da sessão.
- Proteção das rotas privadas.

Rotas públicas:
- `login`
- `signup`
- `recover`

Rota privada principal:
- `index`

Mensagens de erro devem ser apresentadas em português, sem expor credenciais ou informações sensíveis.

**Observação:** o retorno da autenticação Google não é capturado corretamente no Expo Go. A integração deve ser validada em build nativo com o esquema `axei://`.

### 3.2 Tela principal

A tela principal deve apresentar:

- Ícone do aplicativo no topo.
- Barra de pesquisa permanentemente visível.
- Botão de estrela ao lado da pesquisa para filtrar somente favoritos.
- Pilha vertical de cartões sobrepostos.
- Botão flutuante `+` no canto inferior direito.

#### Aparência e organização da pilha

- Os cartões devem ter aparência tridimensional.
- Altura aproximada de 1,2 vez a largura.
- Bordas arredondadas.
- Deslocamento vertical que permita visualizar o nome de todos os cartões.
- Rolagem quando houver muitos cartões.
- Ordenação alfabética crescente, sem diferenciar maiúsculas e minúsculas, considerando o português brasileiro. Na pilha principal, o cartão de emergência fica por último, inclusive nos resultados da pesquisa.
- Quando o filtro de favoritos estiver ativo, o cartão de emergência só aparece se estiver favoritado e, nesse caso, segue a ordenação alfabética dos demais favoritos.
- Favoritar ou desfavoritar não deve alterar a ordenação.
- Todos os cartões devem apresentar a estrela de favorito no canto superior esquerdo.

#### Gesto de embaralhar

- Arrastar horizontalmente sobre a pilha deve animar o reposicionamento temporário dos cartões, considerando a direção e aplicando maior intensidade.
- Arrastar verticalmente deve rolar a pilha para cima ou para baixo, sem embaralhar os cartões.
- O arraste vertical não deve abrir o cartão; somente um toque deve selecioná-lo.
- O embaralhamento horizontal não altera a ordenação alfabética nem seleciona um cartão; a abertura continua sendo feita por toque.
- O gesto fornece resposta tátil e efeito sonoro.

#### Estados vazios

Apresentar mensagens diferentes para:

- Nenhum resultado encontrado na pesquisa: "Nenhum cartão encontrado."
- Nenhum cartão favorito: "Nenhum cartão favorito ainda. Toque na estrela de um cartão para favoritar."

### 3.3 Criação de cartões

Ao tocar no botão `+`:

- Criar um cartão imediatamente em modo de edição.
- Apresentar o campo de nome vazio com o placeholder `Nome do cartão`.
- Gerar um fundo visual aleatório para cada cartão.
- Manter o mesmo fundo na frente e no verso do cartão.

Regras de nome e descarte:

- O nome interno provisório será `Sem título`.
- Um cartão sem nome e sem conteúdo significativo deve ser descartado silenciosamente ao sair.
- Se houver conteúdo, mas não houver nome, apresentar o alerta "Dá um nome ao cartão".
- O usuário poderá manter o cartão como "Sem título" ou descartá-lo.

### 3.4 Visualização e edição do cartão

- A frente e o verso devem alternar por rotação tridimensional no eixo Y.
- Utilizar React Native Reanimated.
- Duração prevista da animação: 450 ms.
- O botão de opções (`…`) deve ficar no canto superior direito da tela, fora do conteúdo do cartão. Ao tocá-lo, abrir uma confirmação com o título "Excluir cartão", as ações "Cancelar" e "Excluir", e informar que a ação não pode ser desfeita.
- O nome deve permanecer centralizado.
- Ao focar o campo de nome, posicionar o cursor no início do texto, sem deslocar seu conteúdo.

### 3.5 Frente do cartão: editor de texto rico

Utilizar `react-native-pell-rich-editor` integrado com `react-native-webview`.

O conteúdo da frente deve ser armazenado como string HTML em `Card.front`.

A barra de formatação deve ficar no rodapé da frente do cartão, dentro dele, e aparecer somente quando a frente estiver visível.

#### Ferramentas da barra

- `Aa`: submenu com “Título” (`heading1`) e “Subtítulo” (`heading2`).
- `B`: negrito.
- `☷`: listas com marcadores, numeradas e checklist.
- `A`: seleção de cor, com seis opções.
- A aplicação das cores utiliza o comportamento padrão de seleção do editor rich text.
- `↶`: desfazer.

O itálico (`I`) e o refazer (`↷`) foram removidos da barra para ampliar o espaço; decisão confirmada em 31/10/2026.

O botão de tabela deve ficar separado da barra principal:

- Criar tabela inicial 2 × 2.
- Adicionar linha.
- Adicionar coluna.

Outras regras:

- O ícone de salvar deve ficar no canto superior esquerdo da frente.
- Ao salvar, recolher o teclado.
- O botão de favorito deve existir somente na tela principal.
- A barra deve respeitar a especificação aprovada em `especificacao_mini_editor.md`.

### 3.6 Verso do cartão: notas, fotografias e áudio

A barra inferior deve oferecer três recursos:

**Nota**
- Caixa de texto multilinha.

**Foto**
- Seleção de fotografias da galeria e captura pela câmera.
- As duas opções devem estar disponíveis no menu de adição de foto.

**Gravar**
- Gravação de áudio.
- Exibição da duração da gravação em tempo real.
- Reprodução dos áudios gravados.

Armazenamento:

- Gravações de áudio no diretório de documentos do aplicativo.
- Fotografias copiadas para `documentDirectory/card-files/`.
- A remoção de um item deve também remover seu arquivo físico correspondente.
- Permissões negadas devem ser tratadas com mensagens de alerta.

A sincronização dos arquivos com o Supabase Storage pertence à implementação de persistência e sincronização.

### 3.7 Busca e favoritos

- Pesquisar pelo nome do cartão e pelo conteúdo textual da frente.
- Busca sem diferenciação entre letras maiúsculas e minúsculas.
- O filtro de favoritos deve mostrar somente cartões marcados.
- Favoritar não deve alterar a ordenação alfabética.
- Na pilha principal, o cartão de emergência fica por último, inclusive em buscas. No filtro de favoritos, se estiver favoritado, segue a ordenação alfabética dos demais favoritos.

### 3.8 Cartão de emergência

Na inicialização, quando não houver nenhum cartão, criar automaticamente um cartão de emergência, sem consultar o usuário. Não deve existir banner nem confirmação para essa criação.

O cartão deve ser criado com o nome `Emergência` e com o seguinte conteúdo na frente:

190 – Polícia Militar  
192 – SAMU  
193 – Corpo de Bombeiros  
199 – Defesa Civil  
191 – Polícia Rodoviária Federal  
180 – Central de Atendimento à Mulher  
100 – Direitos Humanos - Violações contra Crianças e Adolescentes

A criação deve respeitar as regras normais de identificação e armazenamento dos cartões.

O identificador do cartão de emergência deve ser único por usuário, no formato `emergency:<user_id>`, para não colidir com o cartão de outro usuário. Cartões antigos com o identificador legado `emergency` continuam reconhecidos.

A criação automática só pode ocorrer quando a lista estiver vazia e nunca deve gerar um segundo cartão de emergência.

### 3.9 Regras gerais dos cartões

- Não incluir campo de data de alteração.
- A data de criação poderá ser exibida se prevista na interface.
- O salvamento deve preservar o conteúdo durante a edição.
- A persistência definitiva deve utilizar a arquitetura local e em nuvem definida para o projeto.
- A exclusão de cartões deve preservar a integridade dos arquivos associados.
- Cada usuário deve acessar exclusivamente seus próprios dados.

---

## 4. Dados, persistência e sincronização

O Supabase é responsável pelos serviços de backend e pela persistência na nuvem.

### Banco de dados

- Utilizar PostgreSQL para os dados dos cartões.
- Associar cada cartão ao usuário proprietário por meio de `user_id`.
- Aplicar políticas RLS para isolamento dos dados.
- Preservar relacionamentos e integridade dos registros.

### Arquivos e mídias

- Utilizar Supabase Storage para fotografias e gravações de áudio.
- Não armazenar arquivos de mídia diretamente como conteúdo binário no PostgreSQL.
- Manter referências aos arquivos nos registros correspondentes.
- Tratar exclusões de arquivos e registros para evitar arquivos órfãos, tanto no aparelho quanto no Storage.
- A remoção de um item ou de um cartão deve apagar a mídia correspondente; exclusões feitas offline entram em fila local e são aplicadas na próxima sincronização.

### Funcionamento offline

A arquitetura deve contemplar:

- Cache local dos cartões.
- Fila de operações pendentes de sincronização.
- Recuperação após perda de conexão.
- Sincronização quando a conexão for restabelecida.
- Tratamento de conflitos entre alterações locais e remotas.

O Supabase não deve ser considerado um mecanismo de sincronização offline automática. Essa funcionalidade depende da implementação específica do aplicativo.

---

## 5. Etapas do desenvolvimento

### Etapa 1 — Autenticação

Escopo:
- Cadastro.
- Login.
- Logout.
- Recuperação de senha.
- Persistência de sessão.
- Proteção de rotas.
- Login Google.

### Etapa 2 — Cartões e funcionalidades

**2.1 — Tela principal e pilha de cartões**

**2.2 — Modelo de dados e regras de negócio**

**2.3 — Criação, abertura, edição e rotação**

**2.4 — Frente: editor de texto rico e formatação**

**2.5 — Verso: anotações, fotografias e áudio**

**2.6 — Persistência, sincronização e funcionamento offline**

**2.7 — Busca, favoritos, estados vazios e cartão de emergência**

**2.8 — Exclusão e integridade dos arquivos**

**2.9 — Testes integrados e encerramento da etapa**

### Etapa 3 — Builds e distribuição

Escopo:
- Revisão dos identificadores do aplicativo.
- Revisão das permissões Android e iOS.
- Verificação das políticas RLS.
- Geração de builds de desenvolvimento e produção.
- Testes em dispositivos Android e iPhone.
- Validação do login Google em build nativo.
- Preparação para distribuição e publicação, mediante autorização.

---

## 6. Critérios de conclusão

Uma etapa somente deve ser considerada concluída quando:

1. Os requisitos previstos tiverem sido implementados ou suas exceções autorizadas.
2. Os testes aplicáveis tiverem sido executados.
3. Os resultados dos testes estiverem registrados.
4. As pendências restantes estiverem identificadas.
5. A documentação refletir o estado real do aplicativo.
6. Não existirem instruções obsoletas que possam induzir a implementação incorreta.

A conclusão de uma etapa não autoriza automaticamente o início da seguinte.

O usuário deve receber um resumo do trabalho realizado e decidir sobre a continuidade.

---

## 7. Documentação do projeto

Os documentos possuem responsabilidades distintas:

### AGENTS.md
Contém as instruções permanentes para o agente de desenvolvimento: segurança, comportamento, proteção dos dados, Git, dependências e forma de trabalhar.

### PROJECT.md
Este documento. Contém a definição do produto, arquitetura, requisitos funcionais, regras de negócio e planejamento das etapas.

### CHANGELOG.md
Contém o histórico objetivo e o estado atual do desenvolvimento, incluindo:

- Funcionalidades implementadas.
- Alterações realizadas.
- Testes executados e respectivos resultados.
- Pendências.
- Problemas conhecidos.
- Etapas concluídas ou em andamento.

O `CHANGELOG.md` é a referência para verificar o que está efetivamente implementado. O `PROJECT.md` é a referência para verificar o que o aplicativo deve fazer.

### Documentos técnicos complementares

As especificações detalhadas aprovadas, como `especificacao_mini_editor.md`, devem ser preservadas e consultadas quando a tarefa envolver seus respectivos recursos.
