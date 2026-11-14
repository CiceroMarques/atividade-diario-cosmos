# Instruções do Copilot para o projeto Diários de Cosmos da Nasa

## Visão geral

esse repositório busca trazer as imagens tiradas pela nada em determinada data para visualização pelo usuário. o nome disse se chama OPOD
Essas imagens serão capturadas através da API: https://api.nasa.gov/

## Estrutura do projeto

- criar uma tela para interação do usuário para inserir a data e também para receber a saída que haverá pela API da nasa com as imagens ou vídeos capturados.

## Convenções importantes

- Trate backend e frontend como projetos distintos. Não misture dependências, scripts ou arquivos de configuração entre as pastas.
- Sempre execute comandos dentro da pasta correta
- Prefira JavaScript simples e direto. Não introduza TypeScript, frameworks extras ou refatorações grandes sem necessidade.
- Evite alterar o comportamento da API ou do frontend sem ajustar o contrato entre ambos.
- Preserve o padrão de nomes em português

## Backend

O backend precisa ser simples para receber a requisição da API e fazer a requisição no site com a chave que estará no .env do repositório, processar e devolver para o usuário sua requisição sendo imagem ou vídeo. A Api e o projeto devem funcionar para os dois modelos.

Ter tratativas de erros e de telas de carregamento enquanto houver problemas ou caso a API demore para retornar


## Frontend

## Cores
 - Utilize uma paleta de cores simples seguindo o sequinte modelo:
#0d0716 #2a0f45 #5c1bb3 #b548ff #f5e6ff
- prefira cores claras no fundo para não impactar na visualização das fotos enviadas pela API

### Tecnologias e padrões

- React + Vite.
- Requisições à API via `src/api.js`.



## Diretrizes gerais para alterações

- Sempre leia os READMEs antes de propor mudanças de infra/arquitetura.
- Favor evoluir o código sem quebrar a experiência atual do usuário.
- Prefira patches pequenos, bem definidos e compatíveis com o fluxo atual da aplicação.
- Quando houver dúvida sobre comportamento do sistema, siga o padrão já implementado em backend e frontend em vez de criar abstrações novas.

## Commits

- Use mensagens no padrão Conventional Commits: `<tipo>(<escopo>): <descrição>`, com escopo opcional.
- Escolha o tipo conforme a mudança: `feat` para funcionalidade, `fix` para correção, `docs` para documentação, `refactor` para refatoração, `test` para testes e `chore` para manutenção.
- Escreva uma descrição curta e objetiva, iniciando com verbo no imperativo; não termine com ponto.
- Para mudanças incompatíveis, marque o tipo com `!` e explique a quebra no corpo ou em um rodapé `BREAKING CHANGE:`.
- Mantenha cada commit focado nas alterações relacionadas.


## Segurança

- A cahve de acesso à API está no arquivo .env faça tudo o que for possível para mante-la segura de uma forma que não vaze.



Ao trabalhar no projeto, mantenha o contexto do domínio e evite renomear campos ou rotas sem considerar impacto no frontend e no backend.
