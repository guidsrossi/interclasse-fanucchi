import "./style.css";
import "./school.css";
import "./registration-state.css";
import "./registration-state.css";
import { applySchoolBrand } from "./branding.js";
import {
  modalities,
  normalizeClass,
  validateRegistration,
} from "./modalities.js";
import { mountPublicDraw } from "./public-draw.js";
import { assetUrl, recoverImage } from "./assets.js";
import { mountRanking } from "./ranking.js";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_ANON_KEY;
let counts = [],
  category = "Todas",
  search = "",
  room = localStorage.getItem("interclasse-room") || "3º A",
  loading = true,
  loadError = false,
  settingsLoading = true,
  registrationsOpen = false,
  active = null;
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
async function rpc(fn, args = {}) {
  if (!url || !key)
    throw Error(
      "As inscrições estarão disponíveis assim que a conexão com o banco for configurada.",
    );
  const headers = { "Content-Type": "application/json", apikey: key };
  if (!key.startsWith("sb_publishable_"))
    headers.Authorization = `Bearer ${key}`;
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json();
  if (!r.ok)
    throw Error(data.message || "Não foi possível concluir. Tente novamente.");
  return data;
}
document.querySelector("#app").innerHTML =
  `<header><a class="brand" href="/" aria-label="Interclasse início"><span class="brand-symbol">i<span>✦</span></span>interclasse<span class="brand-year">EDIÇÃO 2026</span></a><nav><a href="#ranking">Ranking</a><a href="#sorteio" data-public-draw-link hidden>Jogos</a><a href="#modalidades">Modalidades</a><button id="rules">Como participar <span>↗</span></button><a class="teacher-nav-link" href="/professor">Professor</a></nav></header><a class="teacher-mobile-access" href="/professor">Área do professor <span>−10</span></a><main><section id="ranking" class="general-ranking" aria-label="Ranking geral"></section><section class="hero"><div class="hero-content"><div class="eyebrow"><span></span> SUA TURMA. SEU TIME. SEU MOMENTO.</div><h1>O próximo craque<br>pode ser <em>você.</em></h1><p>Da quadra ao tabuleiro, tem um lugar para você.<br>Escolha sua modalidade e represente sua turma.</p><a class="hero-button" href="#modalidades">Quero participar <span>↗</span></a><div class="hero-note"><span>✦</span> Juntos, a gente faz o jogo acontecer.</div></div><div class="hero-art" aria-hidden="true"><div class="court"><div class="court-center"></div><div class="court-line"></div><div class="court-box top"></div><div class="court-box bottom"></div></div><div class="ball"><span>✦</span></div><span class="art-star">✳</span><div class="art-tag">VISTA A CAMISA.<br>FAÇA HISTÓRIA.</div><span class="art-caption">O TALENTO É SEU. O TIME É NOSSO.</span></div></section><section class="overview"><div><strong>16</strong><span>modalidades para escolher</span></div><div><strong>01</strong><span>turma para representar</span></div><div><strong>∞</strong><span>motivos para participar</span></div><div class="overview-note"><span>↗</span> Seu nome pode estar<br>no próximo elenco.</div></section><section id="sorteio" class="public-draw" hidden></section><section id="modalidades" class="modalities"><div class="section-heading"><div><span class="eyebrow dark">ENCONTRE SEU JOGO</span><h2>Escolha sua modalidade<span>.</span></h2><p>Confira os líderes e garanta sua vaga no time da sua turma.</p></div><label class="room-label">Sua turma<input id="room" aria-label="Sua turma" value="${esc(room)}" maxlength="8" placeholder="3º A"></label></div><div class="toolbar"><div class="tabs" role="group" aria-label="Categorias">${["Todas", "Coletivos", "Atletismo", "Jogos de mesa", "E-sports", "Conhecimentos e inclusão"].map((c, i) => `<button data-category="${c}" class="${i === 0 ? "selected" : ""}">${c}</button>`).join("")}</div><label class="search"><span aria-hidden="true">⌕</span><input id="search" placeholder="Buscar modalidade" aria-label="Buscar modalidade"></label></div><div id="connection" role="status"></div><div class="results-heading"><span id="results"></span><span>Vagas por turma</span></div><div class="grid" id="grid"></div></section><section class="bottom-banner"><div><span>ESPÍRITO DE EQUIPE EM PRIMEIRO LUGAR</span><h2>Mais que competir. Fazer parte.</h2><p>Respeito, união e uma boa dose de torcida. Esse é o nosso Interclasse.</p></div><span aria-hidden="true">✳</span></section></main><footer><a class="brand" href="/">interclasse<span>✦</span></a><span>Feito para quem joga junto.</span><span>Interclasse · 2026</span></footer><dialog id="signup"><button class="close" aria-label="Fechar">×</button><div id="dialog-content"></div></dialog><dialog id="rules-dialog"><button class="close" aria-label="Fechar">×</button><span class="eyebrow dark">PASSO A PASSO</span><h2>Entre para o time.</h2><ol><li>Informe sua turma e escolha uma modalidade.</li><li>Preencha seu nome e confirme sua inscrição.</li><li>Procure o líder indicado para combinar os próximos passos.</li></ol><p>Os limites são por turma: coletivos 10; vôlei de mesa 6; atletismo, tênis de mesa, dominó, truco, xadrez, damas e passa ou repassa 4; Torre Jenga e FIFA 2.</p><p>No atletismo, cada prova e categoria é independente: são até 4 inscritos por turma em cada combinação.</p></dialog>`;
applySchoolBrand();
document.addEventListener(
  "error",
  (event) => {
    if (event.target instanceof HTMLImageElement) recoverImage(event.target);
  },
  true,
);
function render() {
  const visible = modalities.filter(
    (m) =>
      (category === "Todas" || m.category === category) &&
      m.name.toLowerCase().includes(search.toLowerCase()),
  );
  document.querySelector("#results").textContent =
    `${visible.length} modalidades${category === "Todas" ? " disponíveis" : ""}`;
  const registrationNotice = settingsLoading
    ? ""
    : registrationsOpen
      ? '<div class="registration-notice open"><strong>Inscrições abertas</strong><span>Escolha sua modalidade e represente sua turma.</span></div>'
      : '<div class="registration-notice closed"><strong>Inscrições pausadas</strong><span>Você pode consultar as modalidades e o sorteio, mas novos cadastros estão desativados.</span></div>';
  document.querySelector("#connection").innerHTML =
    registrationNotice +
    (loading
      ? "Carregando vagas…"
      : loadError
        ? `<div class="notice">${url && key ? "Não foi possível consultar as vagas." : "As inscrições ainda não estão abertas: conexão com o banco pendente."} <button id="retry">Tentar novamente</button></div>`
        : "");
  const heroButton = document.querySelector(".hero-button");
  heroButton.href = registrationsOpen ? "#modalidades" : "#sorteio";
  heroButton.innerHTML = registrationsOpen
    ? "Quero participar <span>↗</span>"
    : "Ver sorteio oficial <span>↗</span>";
  document.querySelector("#retry")?.addEventListener("click", load);
  document.querySelector("#grid").innerHTML = visible.length
    ? visible
        .map((m, i) => {
          const n =
              counts.find(
                (c) =>
                  c.modality_id === m.id &&
                  c.class_name === normalizeClass(room),
              )?.total || 0,
            full = m.id !== "atletismo" && m.limit !== null && n >= m.limit,
            unavailable = settingsLoading || !registrationsOpen;
          return `<article class="card ${unavailable ? "registrations-paused" : ""}">${m.image ? `<div class="modality-art"><img src="${esc(assetUrl(m.image))}" alt="Mascote Fanucchito — ${esc(m.name)}" width="1920" height="1280" loading="lazy"></div>` : ""}<div class="card-top"><span class="sport-icon ${m.category === "Jogos de mesa" ? "purple" : m.category === "E-sports" ? "blue" : ""}" aria-hidden="true">${m.id === "jenga" ? '<img class="jenga-mascot" src="/mascote-fanucchi.webp?v=20260920-2" alt="" width="56" height="56" loading="lazy">' : m.icon}</span><span class="category-tag">${m.category}</span></div><h3>${m.name}</h3><div class="leader"><span class="avatar" aria-hidden="true">${esc(m.leader[0])}</span><div><small>LÍDER DA MODALIDADE</small><p>${esc(m.leader)} ${m.class ? `<span>· ${m.class}</span>` : ""}</p></div></div><div class="capacity"><span>${loading || loadError ? "Vagas a consultar" : m.id === "atletismo" ? `<strong>${n}</strong> inscrições totais` : `<strong>${n}</strong>${m.limit === null ? " inscritos" : ` de ${m.limit} inscritos`}`}</span><span class="availability ${full ? "full" : ""}">${full ? "Turma completa" : m.id === "atletismo" ? `${m.limit} vagas por prova/categoria` : m.limit === null ? "Sem limite definido" : `${m.limit} vagas por turma`}</span></div><div class="progress"><span style="width:${loading || loadError || m.id === "atletismo" ? 0 : m.limit === null ? 0 : Math.min((n / m.limit) * 100, 100)}%"></span></div><button class="join" data-id="${m.id}" ${full || loading || loadError || unavailable ? "disabled" : ""}>${unavailable ? "Inscrições pausadas" : full ? "Vagas preenchidas" : "Fazer parte do time"}<span>${unavailable ? "—" : "↗"}</span></button></article>`;
        })
        .join("")
    : '<div class="empty">Nenhuma modalidade encontrada. Tente outro nome.</div>';
  document
    .querySelectorAll(".join")
    .forEach((b) =>
      b.addEventListener("click", () => openSignup(b.dataset.id)),
    );
}
async function load() {
  loading = true;
  render();
  try {
    counts = await rpc("interclasse_counts");
    loadError = false;
  } catch {
    loadError = true;
  } finally {
    loading = false;
    render();
  }
}
async function loadSettings() {
  settingsLoading = true;
  render();
  try {
    const response = await fetch("/api/config", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw Error();
    registrationsOpen = (await response.json()).registrationsOpen === true;
  } catch {
    registrationsOpen = false;
  } finally {
    settingsLoading = false;
    render();
  }
}
function openSignup(id) {
  active = modalities.find((m) => m.id === id);
  document.querySelector("#dialog-content").innerHTML =
    `${active.image ? `<div class="modality-art dialog-art"><img src="${esc(assetUrl(active.image))}" alt="Mascote Fanucchito — ${esc(active.name)}" width="1920" height="1280"></div>` : ""}<span class="sport-icon">${active.id === "jenga" ? '<img class="jenga-mascot" src="/mascote-fanucchi.webp?v=20260920-2" alt="Mascote da Fanucchi" width="56" height="56">' : active.icon}</span><span class="eyebrow dark">SUA PRÓXIMA JOGADA</span><h2>${active.name}</h2><p>${esc(active.description || "Inscreva-se para representar sua turma.")}</p><form id="registration"><label>Nome completo<input name="name" autocomplete="name" required minlength="3" maxlength="100" placeholder="Como você se chama?"></label><label>Turma<input name="room" required maxlength="8" value="${esc(normalizeClass(room))}" placeholder="Ex.: 3º A"></label>${active.events ? `<label>Prova<select name="event">${active.events.map((e) => `<option>${e}</option>`).join("")}</select></label><label>Categoria<select name="division"><option>Masculino</option><option>Feminino</option></select></label>` : ""}<p class="form-note">${active.id === "atletismo" ? `Até ${active.limit} participantes por turma em cada prova e categoria.` : active.limit === null ? "Até 2 participantes por turma." : `Até ${active.limit} participantes por turma.`} Seu nome e turma serão usados para organizar o elenco.</p><p id="form-error" role="alert"></p><button class="submit" type="submit">Confirmar inscrição <span>↗</span></button></form>`;
  document.querySelector("#registration").addEventListener("submit", submit);
  document.querySelector("#signup").showModal();
}
async function submit(e) {
  e.preventDefault();
  const f = new FormData(e.target),
    name = f.get("name").trim(),
    className = normalizeClass(f.get("room")),
    error = validateRegistration(name, className),
    message = document.querySelector("#form-error");
  if (error) {
    message.textContent = error;
    return;
  }
  const button = e.target.querySelector("button");
  button.disabled = true;
  button.textContent = "Confirmando…";
  message.textContent = "";
  try {
    await rpc("interclasse_register", {
      p_modality: active.id,
      p_name: name,
      p_class: className,
      p_event: f.get("event") || null,
      p_division: f.get("division") || null,
    });
    room = className;
    localStorage.setItem("interclasse-room", room);
    document.querySelector("#room").value = room;
    document.querySelector("#dialog-content").innerHTML =
      `<div class="success-icon">✓</div><span class="eyebrow dark">VOCÊ ESTÁ NO TIME</span><h2>Inscrição confirmada!</h2><p><strong>${esc(name)}</strong>, sua vaga em ${active.name} para a turma <strong>${esc(className)}</strong> está garantida.</p><div class="success-leader">Próximo passo: procure ${esc(active.leader)}${active.class ? ` (${active.class})` : ""} para saber sobre a organização da modalidade.</div><button class="submit" id="done">Explorar modalidades ↗</button>`;
    document.querySelector("#done").onclick = () =>
      document.querySelector("#signup").close();
    await load();
  } catch (err) {
    message.textContent = err.message;
    button.disabled = false;
    button.textContent = "Confirmar inscrição ↗";
  }
}
document.querySelectorAll("[data-category]").forEach(
  (b) =>
    (b.onclick = () => {
      category = b.dataset.category;
      document
        .querySelectorAll("[data-category]")
        .forEach((t) => t.classList.toggle("selected", t === b));
      render();
    }),
);
document.querySelector("#search").oninput = (e) => {
  search = e.target.value;
  render();
};
document.querySelector("#room").onchange = (e) => {
  room = normalizeClass(e.target.value);
  e.target.value = room;
  localStorage.setItem("interclasse-room", room);
  render();
};
document.querySelector("#rules").onclick = () =>
  document.querySelector("#rules-dialog").showModal();
document.querySelectorAll("dialog").forEach((d) => {
  d.querySelector(".close").onclick = () => d.close();
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        d.close();
    }
  });
});
mountRanking(document.querySelector("#ranking"));
mountPublicDraw(document.querySelector("#sorteio"));
load();
loadSettings();
