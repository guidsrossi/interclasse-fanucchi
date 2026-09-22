import "./admin-results.css";
import "./component-layout-fixes.css";
import "./manual-advancement.css";
import "./bye-advancement.css";
import { modalities } from "./modalities.js";
import { competitionProgress } from "./competition-results.js";

const option = (value, label, selected = false) => `<option value="${value}" ${selected ? "selected" : ""}>${label}</option>`;

function metaFor(id) {
  const [modalityId, eventName, division] = id.split(":");
  const modality = modalities.find((item) => item.id === modalityId);
  return { title: eventName ? `${eventName} — ${division}` : modality?.name || id, category: modality?.category || "Outras" };
}

export function mountResultsAdmin(root, { esc }) {
  let draw = null;
  let results = {};
  let students = [];
  let selectedCompetition = "";
  let error = "";

  const studentOptions = (className, selected = "") => students
    .filter((item) => item.class_name === className)
    .map((item) => option(esc(item.student_name), esc(item.student_name), item.student_name === selected)).join("");

  function scorerRow(match, scorer = {}) {
    const className = [match.home, match.away].includes(scorer.className) ? scorer.className : match.home;
    return `<div class="result-scorer"><select name="scorer_class">${[match.home, match.away].map((name) => option(esc(name), esc(name), name === className)).join("")}</select><select name="student_name" required>${studentOptions(className, scorer.studentName)}</select><input name="scorer_points" type="number" min="1" max="999" value="${Number(scorer.points) || 1}" aria-label="Pontos marcados" required><button type="button" class="remove-scorer" aria-label="Remover pontuador">×</button></div>`;
  }

  function bindScorerRow(row, match) {
    row.querySelector('[name="scorer_class"]').onchange = (event) => {
      row.querySelector('[name="student_name"]').innerHTML = studentOptions(event.target.value);
    };
    row.querySelector(".remove-scorer").onclick = () => row.remove();
  }

  function matchMarkup(match) {
    if (match.bye) return `<article class="result-match is-bye"><header><span>${esc(match.phase)}</span><b>Avanço direto do sorteio</b></header><p><strong>${esc(match.home)}</strong> avança somente para a próxima fase por não ter adversário neste confronto.</p></article>`;
    if (!match.home || !match.away) return `<article class="result-match is-locked"><header><span>${esc(match.phase)}</span><b>Aguardando definição</b></header><p>Este confronto será liberado após a conclusão da fase anterior.</p></article>`;
    const result = match.result || {};
    const complete = match.complete;
    return `<form class="result-match ${complete ? "is-complete" : ""}" data-match-id="${match.id}"><header><span>${esc(match.phase)}</span><b>${complete ? "Resultado lançado" : "A lançar"}</b></header><div class="result-scoreboard"><label><strong>${esc(match.home)}</strong><input name="home_score" type="number" min="0" max="999" value="${result.homeScore ?? ""}" required></label><i>×</i><label><strong>${esc(match.away)}</strong><input name="away_score" type="number" min="0" max="999" value="${result.awayScore ?? ""}" required></label></div>${match.knockout ? `<label class="advanced-team">Turma que avançou<select name="advanced_team" required><option value="">Selecione manualmente</option>${[match.home, match.away].map((name) => option(esc(name), esc(name), result.advancedTeam === name)).join("")}</select><small>O sistema não escolhe o classificado automaticamente pelo placar.</small></label>` : ""}<div class="penalty-fields" ${match.knockout && result.homeScore === result.awayScore && result.homeScore !== undefined ? "" : "hidden"}><span>Pênaltis (opcional)</span><label>${esc(match.home)}<input name="home_penalty" type="number" min="0" max="999" value="${result.homePenalty ?? ""}"></label><label>${esc(match.away)}<input name="away_penalty" type="number" min="0" max="999" value="${result.awayPenalty ?? ""}"></label></div><div class="result-scorers"><div><strong>Quem marcou os pontos</strong><small>A soma individual deve fechar o placar de cada turma.</small></div><div class="result-scorer-list">${(result.scorers || []).map((scorer) => scorerRow(match, scorer)).join("")}</div><button type="button" class="add-scorer">+ Adicionar estudante</button></div><p class="admin-error" role="alert"></p><footer>${complete ? '<button type="button" class="clear-result danger-secondary">Limpar resultado</button>' : ""}<button type="submit" class="submit">Salvar resultado <span>↗</span></button></footer></form>`;
  }

  function render() {
    if (!draw?.brackets) {
      root.innerHTML = '<div class="empty">Publique o sorteio antes de lançar os resultados.</div>';
      return;
    }
    const competitions = Object.entries(draw.brackets).filter(([, bracket]) => bracket.participantCount > 1);
    selectedCompetition = competitions.some(([id]) => id === selectedCompetition) ? selectedCompetition : competitions[0]?.[0] || "";
    const bracket = draw.brackets[selectedCompetition];
    const payload = results[selectedCompetition] || { version: 1, matches: {} };
    const progress = bracket ? competitionProgress(bracket, payload) : null;
    const matches = progress ? [...progress.groupMatches, ...progress.knockoutMatches] : [];
    root.innerHTML = `<div class="results-admin-heading"><div><span class="eyebrow dark">PLACARES E PONTUADORES</span><h2>Lançamento de resultados</h2><p>Cada turma enfrenta uma vez as demais do grupo. Os resultados atualizam a página inicial e o ranking geral automaticamente.</p></div><label>Competição<select id="result-competition">${competitions.map(([id]) => option(esc(id), `${esc(metaFor(id).category)} · ${esc(metaFor(id).title)}`, id === selectedCompetition)).join("")}</select></label></div>${error ? `<p class="results-admin-error">${esc(error)}</p>` : ""}${matches.length ? `<div class="result-match-list">${matches.map(matchMarkup).join("")}</div>` : '<div class="empty">Nenhum jogo disponível.</div>'}`;
    root.querySelector("#result-competition")?.addEventListener("change", (event) => { selectedCompetition = event.target.value; error = ""; render(); });
    root.querySelectorAll(".result-match:not(.is-locked)").forEach((form) => {
      const match = matches.find((item) => item.id === form.dataset.matchId);
      form.querySelectorAll(".result-scorer").forEach((row) => bindScorerRow(row, match));
      const togglePenalties = () => {
        const tied = form.home_score.value !== "" && form.away_score.value !== "" && Number(form.home_score.value) === Number(form.away_score.value);
        form.querySelector(".penalty-fields").hidden = !(match.knockout && tied);
      };
      form.home_score.oninput = togglePenalties;
      form.away_score.oninput = togglePenalties;
      form.querySelector(".add-scorer").onclick = () => {
        const holder = form.querySelector(".result-scorer-list");
        holder.insertAdjacentHTML("beforeend", scorerRow(match));
        bindScorerRow(holder.lastElementChild, match);
      };
      form.querySelector(".clear-result")?.addEventListener("click", async () => {
        if (!confirm("Limpar este resultado? Jogos posteriores que dependem dele também serão apagados.")) return;
        await save(form, match, true);
      });
      form.onsubmit = (event) => { event.preventDefault(); save(form, match, false); };
    });
  }

  async function save(form, match, clear) {
    const button = form.querySelector(".submit");
    button.disabled = true;
    form.querySelector(".admin-error").textContent = "";
    const scorers = [...form.querySelectorAll(".result-scorer")].map((row) => ({
      className: row.querySelector('[name="scorer_class"]').value,
      studentName: row.querySelector('[name="student_name"]').value,
      points: Number(row.querySelector('[name="scorer_points"]').value),
    }));
    const body = clear ? { competitionId: selectedCompetition, matchId: match.id, clear: true } : {
      competitionId: selectedCompetition,
      matchId: match.id,
      result: {
        homeScore: Number(form.home_score.value), awayScore: Number(form.away_score.value),
        homePenalty: form.home_penalty.value === "" ? null : Number(form.home_penalty.value),
        awayPenalty: form.away_penalty.value === "" ? null : Number(form.away_penalty.value),
        advancedTeam: form.advanced_team?.value || null, scorers,
      },
    };
    try {
      const response = await fetch("/api/admin/results", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Não foi possível salvar o resultado.");
      results[selectedCompetition] = data.payload;
      error = "";
      render();
    } catch (saveError) {
      form.querySelector(".admin-error").textContent = saveError.message;
      button.disabled = false;
    }
  }

  root.innerHTML = '<div class="ranking-admin-loading">Carregando jogos…</div>';
  Promise.all([
    fetch("/api/admin/draw", { headers: { Accept: "application/json" } }),
    fetch("/api/admin/results", { headers: { Accept: "application/json" } }),
  ]).then(async ([drawResponse, resultResponse]) => {
    if (!drawResponse.ok || !resultResponse.ok) throw Error("Não foi possível carregar os jogos.");
    draw = (await drawResponse.json()).draw;
    const data = await resultResponse.json();
    results = Object.fromEntries((data.results || []).map((item) => [item.competition_id, item.payload]));
    students = data.students || [];
    render();
  }).catch((loadError) => { root.innerHTML = `<div class="empty">${esc(loadError.message)}</div>`; });
}
