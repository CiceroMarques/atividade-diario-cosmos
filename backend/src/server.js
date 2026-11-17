import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const PORTA = Number(process.env.PORT) || 3001;
const DATA_MINIMA = "1995-06-16";
const DURACAO_MAXIMA_MS = 30_000;
const ENDPOINT_APOD_ALTERNATIVO =
  "https://science.nasa.gov/wp-json/wp/v2/apod-basic/";
const EXPLICACAO_GENERICA =
  "Discover the cosmos! Each day a different image or photograph of our fascinating universe is featured, along with a brief explanation written by a professional astronomer.";

function dataAtualAPOD() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valores = Object.fromEntries(
    partes.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]),
  );
  return `${valores.year}-${valores.month}-${valores.day}`;
}

function dataValida(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || data < DATA_MINIMA) {
    return false;
  }

  const [ano, mes, dia] = data.split("-").map(Number);
  const dataReal = new Date(Date.UTC(ano, mes - 1, dia));
  return dataReal.toISOString().slice(0, 10) === data;
}

function urlDeLogoNASA(url) {
  try {
    const endereco = new URL(url);
    return (
      endereco.hostname === "science.nasa.gov" &&
      endereco.pathname.endsWith("/nasa-logo@2x.png")
    );
  } catch {
    return false;
  }
}

function publicacaoValida(publicacao, data) {
  return (
    publicacao &&
    typeof publicacao.title === "string" &&
    typeof publicacao.date === "string" &&
    typeof publicacao.explanation === "string" &&
    typeof publicacao.url === "string" &&
    ["image", "video"].includes(publicacao.media_type) &&
    publicacao.date === data
  );
}

function conteudoGenerico(publicacao) {
  const urlsDaMidia = [publicacao.url, publicacao.hdurl].filter(
    (url) => typeof url === "string",
  );
  return (
    publicacao.explanation.trim() === EXPLICACAO_GENERICA ||
    publicacao.title.trim().toLowerCase() === "nasa science" ||
    urlsDaMidia.some(urlDeLogoNASA)
  );
}

function removerHTML(texto) {
  return texto
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/[ \t]+/g, " ");
}

function normalizarPublicacaoAlternativa(publicacoes, data) {
  const publicacao = Array.isArray(publicacoes)
    ? publicacoes.find((item) => item?.date === data)
    : null;
  const urlDaMidia =
    publicacao?.media_type === "image"
      ? publicacao.hdurl || publicacao.url
      : publicacao?.url;

  if (
    !publicacao ||
    typeof publicacao.title !== "string" ||
    typeof publicacao.explanation !== "string" ||
    typeof urlDaMidia !== "string" ||
    !["image", "video"].includes(publicacao.media_type)
  ) {
    return null;
  }

  return {
    date: publicacao.date,
    title: removerHTML(publicacao.title).trim(),
    media_type: publicacao.media_type,
    url: urlDaMidia,
    hdurl: publicacao.media_type === "image" ? urlDaMidia : undefined,
    explanation: removerHTML(publicacao.explanation)
      .replace(/^Explanation:\s*/i, "")
      .replace(/\n+\s*Tomorrow(?:'|’)s picture:[\s\S]*$/i, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    copyright:
      typeof publicacao.copyright === "string"
        ? removerHTML(publicacao.copyright).replace(/\n+/g, " ").trim()
        : undefined,
  };
}

async function buscarPublicacaoAlternativa(data) {
  const parametros = new URLSearchParams({ api_key: "DEMO_KEY" });
  const retorno = await fetch(`${ENDPOINT_APOD_ALTERNATIVO}?${parametros}`, {
    signal: AbortSignal.timeout(DURACAO_MAXIMA_MS),
  });

  if (!retorno.ok) {
    throw new Error(`O endpoint alternativo APOD respondeu com status ${retorno.status}.`);
  }

  let publicacoes;
  try {
    publicacoes = await retorno.json();
  } catch {
    throw new Error("O endpoint alternativo APOD retornou uma resposta inválida.");
  }

  return normalizarPublicacaoAlternativa(publicacoes, data);
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

  const hoje = dataAtualAPOD();
  const data = endereco.searchParams.get("date") || hoje;

  if (!dataValida(data) || data > hoje) {
    responder(resposta, 400, {
      erro: `Informe uma data válida entre ${DATA_MINIMA} e hoje.`,
    });
    return;
  }

  const chaveNASA = process.env.NASA_API_KEY?.trim();
  if (!chaveNASA) {
    console.error("NASA_API_KEY não está configurada no arquivo .env.");
    responder(resposta, 500, {
      erro: "Serviço indisponível. Configure NASA_API_KEY no arquivo .env.",
    });
    return;
  }

  const parametros = new URLSearchParams({
    api_key: chaveNASA,
    date: data,
  });

  try {
    const retorno = await fetch(`https://api.nasa.gov/planetary/apod?${parametros}`, {
      signal: AbortSignal.timeout(DURACAO_MAXIMA_MS),
    });

    if (!retorno.ok) {
      console.error(`A API APOD respondeu com status ${retorno.status}.`);
      const limiteAtingido = retorno.status === 429;
      responder(resposta, limiteAtingido ? 503 : 502, {
        erro: limiteAtingido
          ? "A NASA está recebendo muitas solicitações. Tente novamente em alguns instantes."
          : retorno.status === 403
            ? "A NASA rejeitou a chave configurada. Confira NASA_API_KEY no arquivo .env."
            : "A API da NASA não conseguiu carregar a publicação. Tente novamente mais tarde.",
      });
      return;
    }

    let publicacao;
    try {
      publicacao = await retorno.json();
    } catch {
      console.error("A API APOD retornou uma resposta que não é JSON válido.");
      responder(resposta, 502, {
        erro: "A API da NASA retornou uma resposta inválida.",
      });
      return;
    }

    if (!publicacaoValida(publicacao, data)) {
      console.error("A API APOD retornou uma publicação incompatível com a data.");
      responder(resposta, 502, {
        erro: "A API da NASA retornou dados incompatíveis com a data solicitada.",
      });
      return;
    }

    if (conteudoGenerico(publicacao)) {
      console.error("A API APOD retornou conteúdo genérico; consultando o endpoint alternativo.");
      const publicacaoAlternativa = await buscarPublicacaoAlternativa(data);
      if (!publicacaoAlternativa) {
        console.error("O endpoint alternativo não retornou uma publicação para a data solicitada.");
        responder(resposta, 502, {
          erro: "A API da NASA não retornou uma publicação válida para a data solicitada.",
        });
        return;
      }

      publicacao = publicacaoAlternativa;
    }

    responder(resposta, 200, publicacao);
  } catch (erro) {
    if (erro.name === "TimeoutError" || erro.name === "AbortError") {
      console.error("A solicitação à API APOD excedeu o tempo limite.");
      responder(resposta, 504, {
        erro: "A NASA demorou para responder. Tente novamente.",
      });
      return;
    }

    console.error("Falha ao consultar a API APOD:", erro.message);
    responder(resposta, 502, {
      erro: "Não foi possível conectar à API da NASA. Verifique a conexão e tente novamente.",
    });
  }
});

servidor.listen(PORTA, "127.0.0.1", () => {
  console.log(`Backend do Diário Cosmos disponível em http://localhost:${PORTA}`);
});
