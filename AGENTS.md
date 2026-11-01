
# Instruções do Projeto Axei

## 1. Sobre o projeto

Este é um aplicativo móvel desenvolvido com React Native e Expo.

- Backend e banco de dados: Supabase.
- Controle de versão: Git.
- Plataformas prioritárias: Android e iOS.
- Distribuição e atualizações: Expo EAS.
- Priorizar soluções mobile-first, desempenho e compatibilidade entre plataformas.

Preserve a arquitetura existente e as funcionalidades já implementadas.

## 2. Documentação do Expo: atenção às versões

O Expo pode introduzir alterações importantes a cada versão do SDK. Não presuma que APIs conhecidas continuam funcionando da mesma maneira.

Antes de escrever ou modificar código relacionado ao Expo, EAS ou React Native:

1. Consulte a versão principal do pacote `expo` no arquivo `package.json`.
2. Consulte a documentação correspondente à versão instalada:
   https://docs.expo.dev/versions/
3. Para outras informações, consulte:
   https://docs.expo.dev/llms.txt
4. Siga os links para a documentação específica do recurso utilizado.
5. Não utilize APIs desatualizadas ou incompatíveis com a versão instalada.

Sempre priorize a documentação oficial correspondente à versão do projeto.

## 3. Comandos e gerenciamento de dependências

Se o projeto utilizar Bun, identificado pela presença de `bun.lock`, utilize `bunx` no lugar de `npx`.

Comandos principais:

```bash
npx expo install <pacote>
npx expo start
npx expo lint
npx tsc --noEmit
npx expo-doctor
```

Se utilizar Bun, adapte os comandos para `bunx` quando aplicável.

Regras:

- Utilize sempre `expo install` para instalar dependências compatíveis com o SDK do Expo.
- Não instale ou atualize bibliotecas sem necessidade.
- Antes de adicionar uma dependência, verifique se já existe uma solução disponível no projeto.
- Consulte as habilidades disponíveis antes de adicionar novas dependências.
- Não execute `expo install --fix` automaticamente. Primeiro analise os possíveis impactos e solicite autorização.
- Não atualize o Expo SDK ou dependências principais sem autorização.
- Execute lint e verificação de tipos antes de considerar uma tarefa concluída, quando aplicáveis.

## 4. Navegação e organização das telas

Utilize Expo Router para navegação, respeitando a arquitetura já existente no projeto.

Quando o projeto utilizar Expo Router:

- As rotas devem ficar em `src/app/`.
- Cada arquivo de rota representa uma tela.
- Os arquivos `_layout.tsx` definem a estrutura de navegação.
- Componentes, hooks e utilitários que não sejam rotas devem ficar fora de `src/app/`.
- Importe `Link`, `router` e `useLocalSearchParams` de `expo-router`.

Documentação:
https://docs.expo.dev/router/introduction/

Não migre ou altere a estrutura de navegação existente sem autorização.

## 5. Construção e publicação com Expo EAS

Utilize Expo Application Services (EAS) para:

- Construir versões Android e iOS.
- Gerenciar assinaturas e certificados.
- Publicar versões do aplicativo.
- Distribuir atualizações OTA quando compatíveis.

Comandos e documentação:

- EAS Build: `eas build`
- EAS Submit: `eas submit`
- EAS Update: `eas update`

Em projetos com Bun, utilize `bunx eas-cli`.

Nos demais projetos, utilize `npx eas-cli@latest`.

Documentação oficial:
https://docs.expo.dev/eas/

Nota de estado (31/10/2026): o projeto ainda não possui `eas.json` nem identificadores nativos (`android.package`/`ios.bundleIdentifier`) configurados; a configuração pertence à Etapa 3.

Não publique builds, atualizações ou versões nas lojas sem autorização expressa.

## 6. Configurações nativas do Android e iOS

Se os diretórios `ios/` e `android/` não existirem, o projeto poderá utilizar Continuous Native Generation (CNG).

Nesse caso:

- Não crie nem modifique manualmente os diretórios nativos gerados.
- Configure comportamentos nativos por meio de `app.json`, `app.config.js` ou plugins de configuração.
- Preserve as configurações existentes.

O Expo Go possui apenas os módulos nativos incluídos na sua versão.

Ao adicionar bibliotecas que contenham código nativo, verifique se será necessário gerar uma nova versão de desenvolvimento.

Não presuma que toda biblioteca funcionará no Expo Go.

## 7. Segurança e proteção do Supabase

O Supabase é o backend e o banco de dados do Axei.

Estas regras são obrigatórias:

- Nunca apagar, excluir, truncar ou recriar tabelas sem autorização expressa.
- Nunca executar comandos SQL destrutivos sem autorização.
- Nunca executar reset do banco de dados.
- Nunca modificar políticas RLS sem explicar previamente os impactos e obter autorização.
- Nunca expor chaves privadas, tokens, senhas ou credenciais.
- Nunca expor a chave `service_role` no aplicativo.
- Nunca modificar arquivos `.env` sem autorização.
- Preservar os dados existentes e os relacionamentos entre tabelas.
- Antes de modificar o banco, analisar a estrutura atual e as migrations existentes.
- Priorizar alterações compatíveis com os dados e funcionalidades já existentes.
- Não substituir configurações de produção por configurações de teste.

Qualquer alteração na estrutura do banco deve ser previamente analisada.

## 8. Proteção do código e do projeto

Antes de realizar alterações importantes:

1. Verifique o estado atual do Git.
2. Identifique modificações locais existentes.
3. Analise os arquivos envolvidos na tarefa.
4. Verifique as dependências entre os componentes.

Regras obrigatórias:

- Nunca descartar alterações locais do usuário.
- Nunca executar `git reset`, `git clean` ou comandos destrutivos sem autorização.
- Nunca executar `git checkout` para descartar alterações locais.
- Nunca executar `git commit` ou `git push` sem autorização.
- Não sobrescrever arquivos existentes sem antes analisar seu conteúdo.
- Não modificar arquivos que não tenham relação com a tarefa solicitada.
- Não realizar refatorações amplas sem necessidade.
- Preservar funcionalidades existentes.

## 9. Forma de trabalhar e corrigir problemas

Sempre adote o seguinte procedimento:

1. Entenda o problema ou a funcionalidade solicitada.
2. Analise os arquivos e as dependências envolvidos.
3. Identifique a causa do problema antes de propor uma correção.
4. Apresente o plano de solução quando a alteração for significativa.
5. Faça alterações pequenas, específicas e controladas.
6. Verifique se outras funcionalidades foram afetadas.
7. Execute os testes, lint e verificação de tipos pertinentes.
8. Informe os arquivos modificados.
9. Apresente os resultados dos testes.
10. Informe eventuais problemas que ainda permaneçam.

Não declare uma correção concluída sem verificar seu resultado.

## 10. Comunicação com o usuário

- Utilize sempre português brasileiro.
- Explique de maneira clara as alterações realizadas.
- Informe em qual diretório os comandos devem ser executados.
- Apresente os comandos completos.
- Quando houver risco de alteração importante, execute uma etapa por vez e aguarde a confirmação.
- Explique os riscos antes de executar operações que possam afetar dados ou funcionalidades.
- Não faça alterações desnecessárias.
- Priorize soluções simples, seguras e compatíveis com a arquitetura atual.

## 11. Regra principal

A prioridade é manter o Axei funcionando corretamente, proteger os dados do Supabase e preservar o código existente.

Não sacrifique funcionalidades já implementadas para resolver um problema isolado.

Não altere a arquitetura, o banco de dados, as dependências principais ou as configurações de publicação sem justificativa técnica e autorização do usuário.
