import { modalities } from "./modalities.js";
import { logoForClass } from "./class-logos.js";
import "./public-draw.css";
import "./public-results.css";
import "./component-layout-fixes.css";
import "./manual-advancement.css";
import "./bye-advancement.css";
import "./match-schedule.css";
import { assetUrl, recoverImage } from "./assets.js";
import { competitionProgress } from "./competition-results.js";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function matchSchedule(result) {
  if (!result?.scheduledAt) return "";
  const date = new Date(result.scheduledAt);
  if (Number.isNaN(date.getTime())) return "";
  return `<time datetime="${esc(result.scheduledAt)}">${date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time>`;
}

function competitionMeta(id) {
  const [modalityId, eventName, division] = id.split(":");
  const modality = modalities.find((item) => item.id === modalityId);
  return { title: eventName ? `${eventName} — ${division}` : modality?.name || id, subtitle: eventName ? modality?.name : "", category: modality?.category || "Outras" };
}

function team(teamName) {
  const logo = logoForClass(teamName);
  return `<span class="public-team">${logo ? `<img src="${assetUrl(logo)}" alt="" width="42" height="42" loading="lazy">` : ""}<strong>${esc(teamName || "A definir")}</strong></span>`;
}

function playedMatch(match) {
  if (match.bye) return `<article class="public-result-match is-bye"><header><span>${esc(match.phase)}</span><b>AVANÇO DIRETO</b></header><div><span>${team(match.home)}</span><strong>→</strong><span>${team("Próxima fase")}</span></div><p>Avanço definido pelo sorteio apenas para a próxima fase.</p></article>`;
  const result = match.result || {};
  const complete = match.complete;
  const scorers = (result.scorers || []).map((item) => `<span>${esc(item.studentName)} <b>${item.points || 1}</b></span>`).join("");
  return `<article class="public-result-match ${complete ? "is-complete" : ""}"><header><span>${esc(match.phase)}</span><b>${complete ? "ENCERRADO" : "A JOGAR"}</b></header>${matchSchedule(result)}<div><span>${team(match.home)}</span><strong>${complete ? result.homeScore : "–"}<i>×</i>${complete ? result.awayScore : "–"}</strong><span>${team(match.away)}</span></div>${complete && match.knockout && result.homePenalty !== undefined ? `<p>Pênaltis: ${result.homePenalty} × ${result.awayPenalty}</p>` : ""}${complete && match.knockout ? `<p class="public-advanced">Classificado: <strong>${esc(result.advancedTeam)}</strong></p>` : ""}${scorers ? `<footer>${scorers}</footer>` : ""}</article>`;
}

function standingsMarkup(progress) {
  return `<div class="public-standings">${["A", "B"].map((group) => `<section><header><strong>Classificação · Grupo ${group}</strong><span>J V E D SG PTS</span></header>${progress.standings.tables[group].map((row) => `<div class="${row.qualified ? "is-qualified" : ""}"><b>${row.position}</b>${team(row.className)}<span>${row.played} ${row.wins} ${row.draws} ${row.losses} ${row.goalDifference} <strong>${row.points}</strong></span></div>`).join("")}</section>`).join("")}</div>`;
}

function scorersMarkup(progress) {
  if (!progress.scorers.length) return "";
  return `<section class="public-scorers"><header><span>DESTAQUES</span><strong>Pontuadores da competição</strong></header><div>${progress.scorers.map((item, index) => `<article><b>${index + 1}</b><span><strong>${esc(item.studentName)}</strong><small>${esc(item.className)}</small></span><em>${item.goals} ${item.goals === 1 ? "ponto" : "pontos"}</em></article>`).join("")}</div></section>`;
}

function bracketMarkup(bracket, payload) {
  if (bracket.automaticWinner) return `<div class="public-automatic"><span>Classificação automática</span>${team(bracket.automaticWinner)}<p>Única turma inscrita nesta competição.</p></div>`;
  const progress = competitionProgress(bracket, payload);
  if (bracket.format === "groups-knockout") return `${standingsMarkup(progress)}<div class="public-stage-title"><span>JOGOS DOS GRUPOS</span><strong>Cada turma enfrenta uma vez todas as demais do seu grupo</strong></div><div class="public-result-grid">${progress.groupMatches.map(playedMatch).join("")}</div><div class="public-stage-title"><span>MATA-MATA</span><strong>1º × 4º e 2º × 3º do grupo oposto</strong></div><div class="public-result-grid">${progress.knockoutMatches.map(playedMatch).join("")}</div>${scorersMarkup(progress)}`;
  return `<div class="public-result-grid">${progress.knockoutMatches.map(playedMatch).join("")}</div>${scorersMarkup(progress)}`;
}

function drawCard([id, bracket], results) {
  const meta = competitionMeta(id);
  const completed = Object.keys(results[id]?.matches || {}).length;
  return `<details class="public-draw-card" data-draw-category="${esc(meta.category)}"><summary><span class="public-card-icon">${bracket.format === "groups-knockout" ? "A/B" : "×"}</span><span><small>${esc(meta.category)}</small><strong>${esc(meta.title)}</strong>${meta.subtitle ? `<em>${esc(meta.subtitle)}</em>` : ""}</span><span class="public-card-count">${completed ? `${completed} ${completed === 1 ? "resultado" : "resultados"}` : `${bracket.participantCount} ${bracket.participantCount === 1 ? "turma" : "turmas"}`} <b aria-hidden="true">⌄</b></span></summary><div class="public-bracket">${bracketMarkup(bracket, results[id] || { version: 1, matches: {} })}</div></details>`;
}

export async function mountPublicDraw(root) {
  try {
    const response = await fetch("/api/draw", { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const { draw, results = {} } = await response.json();
    if (!draw?.brackets) return;
    const competitions = Object.entries(draw.brackets).filter(([, bracket]) => bracket?.participantCount > 0);
    if (!competitions.length) return;
    const categories = [...new Set(competitions.map(([id]) => competitionMeta(id).category))];
    root.hidden = false;
    document.querySelector("[data-public-draw-link]")?.removeAttribute("hidden");
    root.innerHTML = `<div class="public-draw-heading"><div><span class="eyebrow dark">JOGOS E RESULTADOS</span><h2>Acompanhe o interclasse<span>.</span></h2><p>Consulte grupos, classificação, placares e pontuadores de todas as modalidades.</p></div><div class="public-draw-date"><span>SORTEIO REALIZADO EM</span><strong>${new Date(draw.generatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</strong><small>Resultados atualizados pela organização</small></div></div><div class="public-draw-filters" role="group" aria-label="Filtrar sorteio"><button class="selected" data-draw-filter="">Todos</button>${categories.map((category) => `<button data-draw-filter="${esc(category)}">${esc(category)}</button>`).join("")}</div><div class="public-draw-list">${competitions.map((item) => drawCard(item, results)).join("")}</div>`;
    root.querySelectorAll("[data-draw-filter]").forEach((button) => button.onclick = () => {
      root.querySelectorAll("[data-draw-filter]").forEach((item) => item.classList.toggle("selected", item === button));
      root.querySelectorAll("[data-draw-category]").forEach((card) => card.hidden = Boolean(button.dataset.drawFilter && card.dataset.drawCategory !== button.dataset.drawFilter));
    });
    root.querySelector(".public-draw-card")?.setAttribute("open", "");
    root.querySelectorAll("img").forEach((image) => image.addEventListener("error", () => recoverImage(image)));
  } catch {}
}
