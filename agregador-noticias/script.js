const API = "http://localhost:3000";

const menu = document.getElementById("topo-menu");
const filtro = document.getElementById("filtro-fontes");
const principal = document.getElementById("principal");
const laterais = document.getElementById("laterais");
const grade = document.getElementById("grade");

let categoriaAtual = "politica";
let pedidoAtual = 0;

function tempoDesde(dataISO) {
  const minutos = Math.floor((Date.now() - new Date(dataISO)) / 60000);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  return `há ${Math.floor(horas / 24)} d`;
}

function criarNoticia(noticia, tipo) {
  const link = document.createElement("a");
  link.className = `n-${tipo}`;
  link.href = noticia.link;
  link.target = "_blank";
  link.rel = "noopener";

  if (tipo !== "lateral") {
    if (noticia.imagem) {
      const img = document.createElement("img");
      img.src = noticia.imagem;
      img.alt = "";
      link.appendChild(img);
    } else {
      const vazio = document.createElement("div");
      vazio.className = "sem-imagem";
      link.appendChild(vazio);
    }
  }

  const titulo = document.createElement(tipo === "principal" ? "h2" : "h3");
  titulo.className = "manchete";
  titulo.textContent = noticia.titulo;
  link.appendChild(titulo);

  const meta = document.createElement("p");
  meta.className = "meta";
  const fonte = document.createElement("span");
  fonte.textContent = noticia.fonte;
  const hora = document.createElement("span");
  hora.textContent = tempoDesde(noticia.data);
  meta.append(fonte, hora);
  link.appendChild(meta);

  return link;
}

function limpar() {
  principal.textContent = "";
  laterais.textContent = "";
  grade.textContent = "";
}

async function carregarNoticias(fonteId) {
  const meuPedido = ++pedidoAtual;
  limpar();
  principal.textContent = "Carregando...";

  try {
    const params = new URLSearchParams({ categoria: categoriaAtual });
    if (fonteId) params.set("fonte", fonteId);

    const resposta = await fetch(`${API}/noticias?${params}`);
    const noticias = await resposta.json();

    // Se o leitor já clicou em outra aba, esta resposta chegou atrasada
    if (meuPedido !== pedidoAtual) return;

    principal.textContent = "";

    if (!Array.isArray(noticias) || noticias.length === 0) {
      principal.textContent = "Nenhuma notícia encontrada nesta aba.";
      return;
    }

    principal.appendChild(criarNoticia(noticias[0], "principal"));

    noticias.slice(1, 5).forEach((n) => {
      laterais.appendChild(criarNoticia(n, "lateral"));
    });

    noticias.slice(5).forEach((n) => {
      grade.appendChild(criarNoticia(n, "item"));
    });
  } catch (erro) {
    if (meuPedido !== pedidoAtual) return;
    principal.textContent = "Não foi possível carregar as notícias.";
    console.error(erro);
  }
}

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

abrirCategoria();