const API = "http://localhost:3000";

const menu = document.getElementById("topo-menu");
const busca = document.getElementById("busca");
const filtro = document.getElementById("filtro-fontes");
const feed = document.getElementById("feed");
const porVeiculo = document.getElementById("por-veiculo");
const letreiro = document.getElementById("letreiro");

let categoriaAtual = "politica";
let pedidoAtual = 0;
let noticiasCarregadas = [];

// ---------- Funções de apoio ----------

function tempoDesde(dataISO) {
  const minutos = Math.floor((Date.now() - new Date(dataISO)) / 60000);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  return `há ${Math.floor(horas / 24)} d`;
}

function iniciais(nome) {
  const palavras = nome.split(" ");
  const letras =
    palavras.length > 1 ? palavras[0][0] + palavras[1][0] : nome.slice(0, 2);
  return letras.toUpperCase();
}

function criarMensagem(texto) {
  const caixa = document.createElement("div");
  caixa.className = "mensagem";
  caixa.textContent = texto;
  return caixa;
}

// ---------- Notícias ----------

function criarPost(noticia) {
  const post = document.createElement("a");
  post.className = "post";
  post.href = noticia.link;
  post.target = "_blank";
  post.rel = "noopener";

  const cabecalho = document.createElement("div");
  cabecalho.className = "post-cabecalho";

  const avatar = document.createElement("span");
  avatar.className = "avatar";
  avatar.textContent = iniciais(noticia.fonte);

  const quem = document.createElement("div");
  quem.className = "post-fonte";
  const nome = document.createElement("strong");
  nome.textContent = noticia.fonte;
  const hora = document.createElement("span");
  hora.textContent = tempoDesde(noticia.data);
  quem.append(nome, hora);

  cabecalho.append(avatar, quem);
  post.appendChild(cabecalho);

  const titulo = document.createElement("h2");
  titulo.className = "manchete";
  titulo.textContent = noticia.titulo;
  post.appendChild(titulo);

  if (noticia.imagem) {
    const img = document.createElement("img");
    img.src = noticia.imagem;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", () => img.remove());
    post.appendChild(img);
  }

  return post;
}

function criarVeiculo(noticia) {
  const link = document.createElement("a");
  link.className = "veiculo";
  link.href = noticia.link;
  link.target = "_blank";
  link.rel = "noopener";

  const titulo = document.createElement("h3");
  titulo.className = "manchete";
  titulo.textContent = noticia.titulo;

  const meta = document.createElement("div");
  meta.className = "meta";
  const fonte = document.createElement("span");
  fonte.textContent = noticia.fonte;
  const hora = document.createElement("span");
  hora.textContent = tempoDesde(noticia.data);
  meta.append(fonte, hora);

  link.append(titulo, meta);
  return link;
}

// Desenha a lista atual, aplicando o que foi digitado na busca
function desenhar() {
  const termo = busca.value.trim().toLowerCase();
  const lista = termo
    ? noticiasCarregadas.filter((n) => n.titulo.toLowerCase().includes(termo))
    : noticiasCarregadas;

  feed.textContent = "";
  porVeiculo.textContent = "";

  if (lista.length === 0) {
    feed.appendChild(
      criarMensagem(
        termo
          ? "Nenhuma notícia com esse termo."
          : "Nenhuma notícia encontrada nesta aba."
      )
    );
    return;
  }

  lista.forEach((n) => feed.appendChild(criarPost(n)));

  // Coluna da direita: a mais recente de cada veículo
  const vistos = new Set();
  lista.forEach((n) => {
    if (vistos.has(n.fonteId)) return;
    vistos.add(n.fonteId);
    porVeiculo.appendChild(criarVeiculo(n));
  });
}

async function carregarNoticias(fonteId) {
  const meuPedido = ++pedidoAtual;
  noticiasCarregadas = [];
  feed.textContent = "";
  porVeiculo.textContent = "";
  feed.appendChild(criarMensagem("Carregando..."));

  try {
    const params = new URLSearchParams({ categoria: categoriaAtual });
    if (fonteId) params.set("fonte", fonteId);

    const resposta = await fetch(`${API}/noticias?${params}`);
    const noticias = await resposta.json();

    // Se o leitor já clicou em outra aba, esta resposta chegou atrasada
    if (meuPedido !== pedidoAtual) return;

    noticiasCarregadas = Array.isArray(noticias) ? noticias : [];
    desenhar();
  } catch (erro) {
    if (meuPedido !== pedidoAtual) return;
    feed.textContent = "";
    feed.appendChild(
      criarMensagem(
        "Não foi possível carregar as notícias. Confira se o servidor está ligado."
      )
    );
    console.error(erro);
  }
}

// ---------- Filtro de fontes ----------

async function carregarFontes() {
  const categoria = categoriaAtual;

  try {
    const resposta = await fetch(`${API}/fontes?categoria=${categoria}`);
    const fontes = await resposta.json();

    if (categoria !== categoriaAtual) return;

    filtro.textContent = "";
    if (fontes.length === 0) return;

    const todas = [{ id: "", nome: "Todas" }, ...fontes];

    todas.forEach((fonte, i) => {
      const botao = document.createElement("button");
      botao.textContent = fonte.nome;
      if (i === 0) botao.classList.add("ativo");

      botao.addEventListener("click", () => {
        filtro.querySelectorAll("button").forEach((b) => {
          b.classList.toggle("ativo", b === botao);
        });
        carregarNoticias(fonte.id);
      });

      filtro.appendChild(botao);
    });
  } catch (erro) {
    console.error(erro);
  }
}

function abrirCategoria() {
  busca.value = "";
  carregarFontes();
  carregarNoticias("");
}

menu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", (evento) => {
    evento.preventDefault();

    menu.querySelectorAll("a").forEach((a) => {
      a.classList.toggle("ativo", a === link);
    });

    categoriaAtual = link.dataset.categoria;
    abrirCategoria();
  });
});

busca.addEventListener("input", desenhar);

// ---------- Letreiro de cotações ----------

function formatar(numero, casas = 2) {
  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  });
}

function criarCotacao(item) {
  let direcao = "estavel";
  let seta = "–";
  if (item.variacao > 0) {
    direcao = "alta";
    seta = "▲";
  }
  if (item.variacao < 0) {
    direcao = "queda";
    seta = "▼";
  }

  const caixa = document.createElement("span");
  caixa.className = `cotacao ${direcao}`;

  const nome = document.createElement("span");
  nome.className = "cotacao-nome";
  nome.textContent = item.nome;

  const valor = document.createElement("span");
  valor.className = "cotacao-valor";
  valor.textContent = item.prefixo
    ? `${item.prefixo} ${formatar(item.valor)}`
    : formatar(item.valor);

  const variacao = document.createElement("span");
  variacao.className = "cotacao-variacao";
  const sinal = item.variacao > 0 ? "+" : "";
  variacao.textContent = `${seta} ${sinal}${formatar(item.variacao)}%`;

  caixa.append(nome, valor, variacao);
  return caixa;
}

async function carregarCotacoes() {
  try {
    const resposta = await fetch(`${API}/cotacoes`);
    const itens = await resposta.json();

    letreiro.textContent = "";
    if (!Array.isArray(itens) || itens.length === 0) return;

    // Duas cópias da lista, para o letreiro girar sem emendas
    for (let i = 0; i < 2; i++) {
      const conjunto = document.createElement("div");
      conjunto.className = "letreiro-conjunto";
      if (i === 1) conjunto.setAttribute("aria-hidden", "true");

      itens.forEach((item) => conjunto.appendChild(criarCotacao(item)));
      letreiro.appendChild(conjunto);
    }
  } catch (erro) {
    console.error(erro);
  }
}

// ---------- Início ----------

abrirCategoria();
carregarCotacoes();
setInterval(carregarCotacoes, 2 * 60 * 1000);