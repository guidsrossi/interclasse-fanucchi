export function applySchoolBrand() {
  document.title = "Interclasse Fanucchi • Entre para o time";
  document.querySelector('meta[name="theme-color"]').content = "#063e9b";
  document.querySelector('meta[name="description"]').content =
    "Represente sua turma no Interclasse da Escola Prof. Fábio Fanucchi. Escolha sua modalidade e entre para o time.";
  document.querySelector("header .brand").innerHTML =
    '<span class="school-badge"><img src="/mascote-fanucchi.webp?v=20260920-2" alt="" width="52" height="52"></span><span class="school-wordmark">interclasse <strong>Fanucchi</strong><small>ESCOLA PROF. FÁBIO FANUCCHI</small></span><span class="brand-year">EDIÇÃO 2026</span>';
  document
    .querySelector("header .brand")
    .setAttribute("aria-label", "Interclasse Fanucchi — início");
  document.querySelector(".hero .eyebrow").innerHTML =
    "<span></span> ORGULHO DE SER FANUCCHI";
  document.querySelector("h1").innerHTML =
    "Jogue com raça.<br>Faça parte do <em>time.</em>";
  document.querySelector(".hero-content > p").innerHTML =
    'Na quadra, no campo ou no tabuleiro, leve o espírito<br class="desktop-break"> da Fanucchi e represente sua turma.';
  document.querySelector(".hero-note").innerHTML =
    "<span>★</span> Talento, união e fair play em cada jogada.";
  const art = document.querySelector(".hero-art");
  art.removeAttribute("aria-hidden");
  art.innerHTML =
    '<span class="mascot-star star-one" aria-hidden="true">★</span><span class="mascot-star star-two" aria-hidden="true">✦</span><img class="hero-mascot" src="/mascote-fanucchi.webp?v=20260920-2" alt="Mascote da Fanucchi: gato preto com tapa-olho e lenço azul, apoiado em um livro aberto com a mensagem Fair Play." width="900" height="900" fetchpriority="high"><div class="fair-play-stamp"><span>★ ★ ★</span>FAIR PLAY<small>RESPEITO DENTRO E FORA DO JOGO</small></div>';
  document
    .querySelector(".hero")
    .insertAdjacentHTML(
      "afterend",
      '<div class="school-motto"><span aria-hidden="true">★</span><span>DISCIPLINA</span><i>•</i><span>ESTUDO</span><i>•</i><span>RESPEITO</span><span aria-hidden="true">★</span></div>',
    );
  document.querySelector(".bottom-banner div > span").textContent =
    "O ESPÍRITO FANUCCHI ENTRA EM CAMPO";
  document.querySelector(".bottom-banner h2").textContent =
    "Nossa escola. Nossa torcida. Nosso time.";
  document.querySelector(".bottom-banner p").textContent =
    "Jogue com respeito, celebre com sua turma e faça do Interclasse uma história para lembrar.";
  document.querySelector(".bottom-banner > span").outerHTML =
    '<div class="banner-mascot" aria-hidden="true"><img src="/mascote-fanucchi.webp?v=20260920-2" alt="" width="130" height="130" loading="lazy"></div>';
  document.querySelector("footer .brand").innerHTML =
    "interclasse <span>Fanucchi ★</span>";
  document.querySelector("footer > span").textContent =
    "Disciplina, estudo e respeito. Sempre.";
  document.querySelector("footer > span:last-child").textContent =
    "Escola Prof. Fábio Fanucchi · 2026";
}
