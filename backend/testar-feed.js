// uso: node testar-feed.js ENDEREÇO_DO_FEED
const url = process.argv[2];

if (!url) {
  console.log("Uso: node testar-feed.js ENDEREÇO_DO_FEED");
  process.exit(1);
}

fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0 (compatible; AgregadorNoticias/1.0)" }
})
  .then(async (resposta) => {
    console.log("Endereço final:", resposta.url);
    console.log("Status:", resposta.status);
    console.log("Tipo:", resposta.headers.get("content-type"));
    const texto = await resposta.text();
    console.log("Começo da resposta:");
    console.log(texto.slice(0, 200));
  })
  .catch((erro) => console.error("Falhou:", erro.cause?.message || erro.message));