import { useEffect, useState } from "react";
import { buscarOPOD } from "./api.js";

const partesDataHoje = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
  .formatToParts(new Date())
  .filter(({ type }) => type !== "literal")
  .reduce((partes, { type, value }) => ({ ...partes, [type]: value }), {});
const dataHoje = `${partesDataHoje.year}-${partesDataHoje.month}-${partesDataHoje.day}`;
const dataMinima = "1995-06-16";

function formatarData(data) {
  return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function urlDeIncorporacao(url) {
  try {
    const endereco = new URL(url);
    const host = endereco.hostname.toLowerCase();
    let id;

    if (host === "youtu.be" || host.endsWith(".youtu.be")) {
      id = endereco.pathname.split("/").filter(Boolean)[0];
    } else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      id =
        endereco.searchParams.get("v") ||
        endereco.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];
    }

    if (id && /^[\w-]+$/.test(id)) {
      return `https://www.youtube-nocookie.com/embed/${id}`;
    }
  } catch {
    return null;
  }

  return null;
}

function App() {
  const [dataSelecionada, setDataSelecionada] = useState(dataHoje);
  const [dataConsultada, setDataConsultada] = useState(dataHoje);
  const [tentativa, setTentativa] = useState(0);
  const [publicacao, setPublicacao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const controlador = new AbortController();
    setCarregando(true);
    setErro("");
    setPublicacao(null);

    buscarOPOD(dataConsultada, controlador.signal)
      .then(setPublicacao)
      .catch((falha) => {
        if (falha.name !== "AbortError") {
          setErro(falha.message);
        }
      })
      .finally(() => {
        if (!controlador.signal.aborted) {
          setCarregando(false);
        }
      });

    return () => controlador.abort();
  }, [dataConsultada, tentativa]);

  function consultar(evento) {
    evento.preventDefault();
    if (dataSelecionada) {
      setDataConsultada(dataSelecionada);
    }
  }

  const incorporacao = publicacao?.media_type === "video"
    ? urlDeIncorporacao(publicacao.url)
    : null;

  return (
    <main className="pagina">
      <header className="cabecalho">
        <a className="marca" href="/" aria-label="Diário Cosmos, início">
          <span className="marca-icone" aria-hidden="true">✦</span>
          <span>diário<span className="marca-destaque">cosmos</span></span>
        </a>
        <span className="selo-nasa">NASA · APOD</span>
      </header>

      <section className="apresentacao" aria-labelledby="titulo-principal">
        <div className="apresentacao-texto">
          <p className="sobretitulo"><span /> UM UNIVERSO DE DESCOBERTAS</p>
          <h1 id="titulo-principal">O cosmos de<br />hoje, <em>para você.</em></h1>
          <p className="introducao">
            Todos os dias, uma nova janela para o universo. Escolha uma data e
            explore a imagem astronômica publicada pela NASA.
          </p>
        </div>
        <div className="orbita" aria-hidden="true">
          <span className="orbita-anel orbita-anel-um" />
          <span className="orbita-anel orbita-anel-dois" />
          <span className="orbita-planeta" />
          <span className="orbita-estrela orbita-estrela-um">✦</span>
          <span className="orbita-estrela orbita-estrela-dois">✧</span>
        </div>
      </section>

      <section className="painel-data" aria-label="Escolha uma data">
        <form className="formulario-data" onSubmit={consultar}>
          <label htmlFor="data-opod">
            <span className="icone-calendario" aria-hidden="true">▦</span>
            <span className="texto-label">EXPLORE POR DATA</span>
            <input
              id="data-opod"
              type="date"
              min={dataMinima}
              max={dataHoje}
              value={dataSelecionada}
              onChange={(evento) => setDataSelecionada(evento.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={carregando || !dataSelecionada}>
            {carregando ? "Buscando..." : "Descobrir"}
            <span aria-hidden="true">↗</span>
          </button>
        </form>
        <p className="dica-data">Uma imagem diferente do universo para cada dia, desde 1995.</p>
      </section>

      <section className="resultado" aria-live="polite" aria-busy={carregando}>
        {carregando && (
          <div className="estado estado-carregando">
            <span className="spinner" />
            <p>Buscando uma nova descoberta...</p>
          </div>
        )}

        {!carregando && erro && (
          <div className="estado estado-erro" role="alert">
            <span className="erro-icone" aria-hidden="true">!</span>
            <div>
              <h2>Não foi possível carregar a publicação</h2>
              <p>{erro}</p>
            </div>
            <button
              type="button"
              className="botao-tentar"
              onClick={() => setTentativa((atual) => atual + 1)}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!carregando && publicacao && (
          <article className="cartao-publicacao">
            <div className="midia">
              {publicacao.media_type === "image" ? (
                <img
                  src={publicacao.hdurl || publicacao.url}
                  alt={publicacao.title}
                  loading="eager"
                />
              ) : incorporacao ? (
                <iframe
                  src={incorporacao}
                  title={`Vídeo: ${publicacao.title}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <video src={publicacao.url} controls>
                  Seu navegador não consegue reproduzir este vídeo.
                </video>
              )}
              <span className="etiqueta-midia">
                {publicacao.media_type === "image" ? "✦ IMAGEM DO DIA" : "▶ VÍDEO DO DIA"}
              </span>
            </div>
            <div className="detalhes">
              <div className="metadados">
                <span>PUBLICAÇÃO NASA</span>
                <span className="ponto-metadados" />
                <time dateTime={publicacao.date}>{formatarData(publicacao.date)}</time>
              </div>
              <h2>{publicacao.title}</h2>
              {publicacao.copyright && (
                <p className="credito">Imagem: {publicacao.copyright}</p>
              )}
              <div className="linha-detalhe" />
              <h3>A história por trás da imagem</h3>
              <p className="explicacao">{publicacao.explanation}</p>
              <a
                className="link-original"
                href={publicacao.hdurl || publicacao.url}
                target="_blank"
                rel="noreferrer"
              >
                Ver mídia original <span aria-hidden="true">↗</span>
              </a>
            </div>
          </article>
        )}
      </section>

      <footer className="rodape">
        <span>FEITO PARA QUEM OLHA PARA CIMA</span>
        <span>Dados e mídia: NASA Astronomy Picture of the Day</span>
      </footer>
    </main>
  );
}

export default App;
