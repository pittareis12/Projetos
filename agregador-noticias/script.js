const API = "http://localhost:3000";

const filtro = document.getElementById("filtro-fontes");
const principal = document.getElementById("principal");
const laterais = document.getElementById("laterais");
const grade = document.getElementById("grade");

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
  limpar();
  principal.textContent = "Carregando...";

  try {
    const url = fonteId
      ? `${API}/noticias?fonte=${fonteId}`
      : `${API}/noticias`;
    const resposta = await fetch(url);
    const noticias = await resposta.json();

    principal.textContent = "";

    if (!Array.isArray(noticias) || noticias.length === 0) {
      principal.textContent = "Nenhuma notícia encontrada nesta fonte.";
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
    principal.textContent = "Não foi possível carregar as notícias.";
    console.error(erro);
  }
}

async function carregarFontes() {
  try {
    const resposta = await fetch(`${API}/fontes`);
    const fontes = await resposta.json();
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

carregarFontes();
carregarNoticias("");