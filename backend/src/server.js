import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const PORTA = Number(process.env.PORT) || 3001;
const DATA_MINIMA = "1995-06-16";
const DURACAO_MAXIMA_MS = 15_000;
const EXPLICACAO_GENERICA =
  "Discover the cosmos! Each day a different image or photograph of our fascinating universe is featured, along with a brief explanation written by a professional astronomer.";

function dataValida(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || data < DATA_MINIMA) {
    return false;
  }

  const [ano, mes, dia] = data.split("-").map(Number);
  const dataReal = new Date(Date.UTC(ano, mes - 1, dia));
  return dataReal.toISOString().slice(0, 10) === data;
}

function responder(resposta, status, corpo) {
  resposta.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  resposta.end(JSON.stringify(corpo));
}

const servidor = createServer(async (requisicao, resposta) => {
  const endereco = new URL(requisicao.url, "http://localhost");

  if (requisicao.method !== "GET" || endereco.pathname !== "/api/opod") {
    responder(resposta, 404, { erro: "Rota não encontrada." });
    return;
  }

  const data = endereco.searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const hoje = new Date().toISOString().slice(0, 10);

  if (!dataValida(data) || data > hoje) {
    responder(resposta, 400, {
      erro: `Informe uma data válida entre ${DATA_MINIMA} e hoje.`,
    });
    return;
  }

  if (!process.env.NASA_API_KEY) {
    console.error("NASA_API_KEY não está configurada no arquivo .env.");
    responder(resposta, 500, {
      erro: "Serviço indisponível. Configure NASA_API_KEY no arquivo .env.",
    });
    return;
  }

  const parametros = new URLSearchParams({
    api_key: process.env.NASA_API_KEY,
    date: data,
  });
  const temporizador = AbortSignal.timeout(DURACAO_MAXIMA_MS);

  try {
    const retorno = await fetch(`https://api.nasa.gov/planetary/apod?${parametros}`, {
      signal: temporizador,
    });

    if (!retorno.ok) {
      console.error(`A API da NASA respondeu com status ${retorno.status}.`);
      const limiteAtingido = retorno.status === 429;
      responder(resposta, limiteAtingido ? 503 : 502, {
        erro: limiteAtingido
          ? "A NASA está recebendo muitas solicitações. Tente novamente em alguns instantes."
          : "Não foi possível carregar a publicação da NASA. Tente novamente mais tarde.",
      });
      return;
    }

    const publicacao = await retorno.json();
    const publicacaoValida =
      publicacao &&
      typeof publicacao.title === "string" &&
      typeof publicacao.date === "string" &&
      typeof publicacao.explanation === "string" &&
      typeof publicacao.url === "string" &&
      ["image", "video"].includes(publicacao.media_type);

    if (!publicacaoValida) {
      console.error("A API da NASA retornou uma publicação em formato inesperado.");
      responder(resposta, 502, {
        erro: "A NASA retornou uma publicação em formato inesperado.",
      });
      return;
    }

    if (publicacao.explanation.trim() === EXPLICACAO_GENERICA) {
      console.error("A API da NASA retornou conteúdo genérico em vez da publicação APOD.");
      responder(resposta, 502, {
        erro: "A API da NASA respondeu, mas retornou conteúdo genérico em vez da publicação APOD. Tente novamente mais tarde; se persistir, verifique a disponibilidade da API da NASA.",
      });
      return;
    }

    responder(resposta, 200, publicacao);
  } catch (erro) {
    if (erro.name === "TimeoutError" || erro.name === "AbortError") {
      console.error("A solicitação à API da NASA excedeu o tempo limite.");
      responder(resposta, 504, {
        erro: "A NASA demorou para responder. Tente novamente.",
      });
      return;
    }

    console.error("Falha ao consultar a API da NASA:", erro.message);
    responder(resposta, 502, {
      erro: "Não foi possível conectar à NASA. Verifique sua conexão e tente novamente.",
    });
  }
});

servidor.listen(PORTA, "127.0.0.1", () => {
  console.log(`Backend do Diário Cosmos disponível em http://localhost:${PORTA}`);
});
