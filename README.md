# Diário Cosmos

Aplicação web para consultar a Imagem Astronômica do Dia (APOD/OPOD) da NASA por data. O projeto mantém o frontend e o backend independentes: o backend consulta a API da NASA e guarda a chave fora do navegador.

## Requisitos

- Node.js 18 ou superior
- Uma chave da API da NASA, disponível gratuitamente em <https://api.nasa.gov/>

## Configuração

1. Copie `.env.example` para `.env` na raiz do repositório e preencha `NASA_API_KEY`.
2. Em um terminal, instale e inicie o backend:

   ```sh
   cd backend
   npm install
   npm run dev
   ```

3. Em outro terminal, instale e inicie o frontend:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

4. Abra o endereço exibido pelo Vite, normalmente <http://localhost:5173>.

O backend atende em `http://localhost:3001`; o servidor de desenvolvimento do Vite encaminha as chamadas `/api` para ele. Para iniciar o backend fora do modo de desenvolvimento, use `npm start` na pasta `backend`. Se a API oficial do APOD responder com conteúdo genérico, o backend consulta o endpoint alternativo publicado pela NASA e só aceita o resultado quando a data solicitada confere. A resposta é normalizada para que `url`/`hdurl` apontem para a mídia e `explanation` seja exibida como texto legível no frontend.

## Teste rápido da API

Com o backend em execução, abra outro terminal e consulte uma data conhecida:

```sh
curl.exe -i "http://127.0.0.1:3001/api/opod?date=2024-01-01"
```

Uma resposta válida tem status `200` e campos como `date`, `title`, `media_type`, `url` e `explanation`. Para essa data, o título publicado pela NASA é `NGC 1232: A Grand Design Spiral Galaxy`. O backend consulta `https://api.nasa.gov/planetary/apod` usando `NASA_API_KEY` do arquivo `.env`; se receber conteúdo genérico, tenta o endpoint diário alternativo da NASA e valida a data antes de responder. `403` indica chave rejeitada; `429` indica limite de requisições. Não compartilhe o valor da chave.

## Funcionalidades

- Carrega automaticamente a publicação de hoje e permite consultar outras datas desde 16 de junho de 1995.
- Exibe título, data, imagem ou vídeo, explicação e crédito quando disponível.
- Informa ao usuário quando há carregamento, erro ou mídia indisponível.

Não publique nem envie o arquivo `.env` ao controle de versão. A chave é usada somente pelo backend.
