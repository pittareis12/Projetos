const express = require("express");
const cors = require("cors");
const Parser = require("rss-parser");

const app = express();
app.use(cors());

// "caminhos" é opcional: se existir, só passam as notícias cujo link contém um deles
const FONTES = [
  { id: "g1", nome: "G1", url: "https://g1.globo.com/rss/g1/politica/" },
  {
    id: "cnn",
    nome: "CNN Brasil",
    url: "https://www.cnnbrasil.com.br/feed/",
    caminhos: ["/politica/", "/eleicoes/"]
  },
  { id: "poder360", nome: "Poder360", url: "https://www.poder360.com.br/feed/" }
];

const parser = new Parser({
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; AgregadorNoticias/1.0)",
    "Accept": "application/rss+xml, application/xml, text/xml"
  },
  customFields: {
    item: [["media:content", "media"]]
  }
});

function pegarImagem(item) {
  const media = Array.isArray(item.media) ? item.media[0] : item.media;
  if (media?.$?.url) return media.$.url;

  if (item.enclosure?.url && item.enclosure.type?.startsWith("image")) {
    return item.enclosure.url;
  }

  const html = item["content:encoded"] || item.content || "";
  const achou = html.match(/<img[^>]+src="([^"]+)"/);
  return achou ? achou[1] : null;
}

// Cache por endereço do feed (assim, duas fontes com o mesmo feed não buscam duas vezes)
const cache = {};
const CINCO_MIN = 5 * 60 * 1000;

async function buscarFeed(url) {
  const guardado = cache[url];
  if (guardado && Date.now() - guardado.hora < CINCO_MIN) {
    return guardado.itens;
  }

  try {
    const feed = await parser.parseURL(url);
    cache[url] = { itens: feed.items, hora: Date.now() };
    return feed.items;
  } catch (erro) {
    console.error(`Erro em ${url}:`, erro.message);
    return guardado ? guardado.itens : [];
  }
}

async function buscarFonte(fonte) {
  const itens = await buscarFeed(fonte.url);

  const filtrados = fonte.caminhos
    ? itens.filter((item) =>
        fonte.caminhos.some((caminho) => item.link?.includes(caminho))
      )
    : itens;

  return filtrados.slice(0, 12).map((item) => ({
    titulo: item.title,
    link: item.link,
    imagem: pegarImagem(item),
    fonte: fonte.nome,
    fonteId: fonte.id,
    data: item.isoDate || item.pubDate
  }));
}

app.get("/fontes", (req, res) => {
  res.json(FONTES.map(({ id, nome }) => ({ id, nome })));
});

app.get("/noticias", async (req, res) => {
  const { fonte } = req.query;
  const escolhidas = fonte ? FONTES.filter((f) => f.id === fonte) : FONTES;

  if (escolhidas.length === 0) {
    return res.status(404).json({ erro: "Fonte não encontrada." });
  }

  const listas = await Promise.all(escolhidas.map(buscarFonte));
  const todas = listas
    .flat()
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  res.json(todas);
});

app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});