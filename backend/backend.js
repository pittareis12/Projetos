const express = require("express");
const cors = require("cors");
const Parser = require("rss-parser");

const app = express();
app.use(cors());

// categoria: aba do menu onde a fonte aparece
// url: um feed | urls: vários feeds juntos
// caminhos (opcional): só passam notícias cujo link contém um deles
const FONTES = [
  {
    id: "g1",
    nome: "G1",
    categoria: "politica",
    url: "https://g1.globo.com/rss/g1/politica/"
  },
  {
    id: "cnn",
    nome: "CNN Brasil",
    categoria: "politica",
    url: "https://www.cnnbrasil.com.br/feed/",
    caminhos: ["/politica/", "/eleicoes/"]
  },
  {
    id: "poder360",
    nome: "Poder360",
    categoria: "politica",
    url: "https://www.poder360.com.br/feed/"
  },
  {
    id: "infomoney",
    nome: "InfoMoney",
    categoria: "economia",
    urls: [
      "https://www.infomoney.com.br/economia/feed/",
      "https://www.infomoney.com.br/mercados/feed/"
    ]
  },
  {
    id: "valor",
    nome: "Valor Econômico",
    categoria: "economia",
    url: "https://valor.globo.com/rss/valor"
  }
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

// Cache por endereço do feed
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
  const urls = fonte.urls || [fonte.url];
  const listas = await Promise.all(urls.map(buscarFeed));

  // Junta os feeds e remove matérias repetidas (mesmo link)
  const vistos = new Set();
  const itens = [];
  for (const item of listas.flat()) {
    if (!item.link || vistos.has(item.link)) continue;
    vistos.add(item.link);
    itens.push(item);
  }

  const filtrados = fonte.caminhos
    ? itens.filter((item) =>
        fonte.caminhos.some((caminho) => item.link.includes(caminho))
      )
    : itens;

  return filtrados
    .map((item) => ({
      titulo: item.title,
      link: item.link,
      imagem: pegarImagem(item),
      fonte: fonte.nome,
      fonteId: fonte.id,
      data: item.isoDate || item.pubDate
    }))
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .slice(0, 12);
}

app.get("/fontes", (req, res) => {
  const { categoria } = req.query;
  const lista = categoria
    ? FONTES.filter((f) => f.categoria === categoria)
    : FONTES;

  res.json(lista.map(({ id, nome }) => ({ id, nome })));
});

app.get("/noticias", async (req, res) => {
  const { categoria, fonte } = req.query;

  let escolhidas = FONTES;
  if (categoria) escolhidas = escolhidas.filter((f) => f.categoria === categoria);
  if (fonte) escolhidas = escolhidas.filter((f) => f.id === fonte);

  const listas = await Promise.all(escolhidas.map(buscarFonte));
  const todas = listas
    .flat()
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  res.json(todas);
});

app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});