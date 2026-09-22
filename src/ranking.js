import "./ranking.css";
import "./ranking-history.css";
import "./component-layout-fixes.css";
import { logoForClass } from "./class-logos.js";
import { assetUrl } from "./assets.js";
import { rankingRules } from "./ranking-data.js";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const identity = (className) => {
  const logo = logoForClass(className);
  return `${logo ? `<img src="${esc(assetUrl(logo))}" alt="" width="48" height="48">` : `<span>${esc(className.slice(-1))}</span>`}<strong>${esc(className)}</strong>`;
};

function rulesMarkup() {
  return `<aside class="ranking-rules"><div class="ranking-rules-title"><span>COMO PONTUAR</span><strong>Regras do ranking</strong></div><div class="rule-block"><b>Resultados dos jogos</b><p>Os placares lançados pela organização entram automaticamente.</p><div class="rule-chips"><span>Vitória<b>+3</b></span><span>Empate no grupo<b>+1</b></span></div></div><div class="rule-block"><b>Frequência</b><p>Soma de pontos conforme a frequência da turma.</p><div class="rule-chips">${rankingRules.attendance.map((rule) => `<span>${rule.label}<b>+${rule.points}</b></span>`).join("")}</div></div><div class="rule-block"><b>Plataforma</b><p>Pontuação proporcional ao indicador.</p><div class="platform-rules">${rankingRules.platform.map((rule) => `<span class="${rule.label.toLowerCase()}"><i></i>${rule.label}<b>${rule.points} pts</b></span>`).join("")}</div></div><div class="rule-block penalties"><b>Perde ponto</b><ul><li>Briga de jogadores: perda dos pontos do dia e desclassificação da modalidade. Em caso de torcida, perda do direito de assistir aos jogos.</li><li>Aluno fora da sala após o jogo: <strong>−10 pontos por aluno</strong>.</li><li>Atraso após o jogo acarreta em <strong>W.O.</strong></li><li>Pendências de plataforma devem ser regularizadas.</li></ul></div></aside>`;
}

const typeLabel = { resultado: "Resultado", frequencia: "Frequência", plataforma: "Plataforma", bonus: "Bônus", penalidade: "Penalidade", ajuste: "Ajuste" };

function historyMarkup(entries, ranking) {
  if (!entries.length) return "";
  const grouped = new Map(ranking.map((row) => [row.className, []]));
  entries.forEach((entry) => {
    if (!grouped.has(entry.class_name)) grouped.set(entry.class_name, []);
    grouped.get(entry.class_name).push(entry);
  });
  return `<section class="ranking-history"><header><span>TRANSPARÊNCIA DO RANKING</span><h3>Histórico da origem dos pontos</h3><p>Abra uma turma para conferir cada resultado, frequência, bônus, penalidade ou ajuste que compõe o total.</p></header><div>${[...grouped].map(([className, items], index) => `<details ${index === 0 ? "open" : ""}><summary><div class="ranking-identity">${identity(className)}</div><span>${items.length} ${items.length === 1 ? "lançamento" : "lançamentos"}</span><b>${items.reduce((sum, item) => sum + Number(item.points || 0), 0)} pts</b></summary><div class="ranking-history-list">${items.map((entry) => `<article><span class="history-type ${entry.source === "competition" ? "is-game" : ""}">${esc(typeLabel[entry.entry_type] || entry.entry_type)}</span><div><strong>${esc(entry.label)}</strong><small>${entry.source === "competition" ? "Gerado pelo placar oficial" : entry.source === "teacher" ? "Registrado por professor" : "Lançado pela organização"} · ${new Date(entry.created_at).toLocaleString("pt-BR")}</small></div><em class="${Number(entry.points) < 0 ? "is-negative" : ""}">${Number(entry.points) > 0 ? "+" : ""}${entry.points} pts</em></article>`).join("")}</div></details>`).join("")}</div></section>`;
}

function penaltiesMarkup(entries) {
  const penalties = entries.filter((entry) => entry.source === "teacher" && entry.responsible_student && Number(entry.points) < 0).slice(0, 8);
  if (!penalties.length) return "";
  return `<section class="public-score-events"><div><span>TRANSPARÊNCIA DO PLACAR</span><h3>Responsáveis por perda de pontos</h3><p>Ocorrências registradas pelos professores.</p></div><div class="public-score-event-list">${penalties.map((entry) => `<article><div><strong>${esc(entry.responsible_student)}</strong><span>Turma ${esc(entry.class_name)}</span></div><b>${entry.points} pts</b><small>${new Date(entry.created_at).toLocaleString("pt-BR")}</small></article>`).join("")}</div></section>`;
}

export async function mountRanking(root) {
  if (!root) return;
  root.innerHTML = `<div class="ranking-loading"><span></span><strong>Carregando ranking geral…</strong></div>`;
  try {
    const response = await fetch("/api/ranking", { headers: { Accept: "application/json" } });
    if (!response.ok) throw Error();
    const data = await response.json();
    const ranking = data.ranking || [];
    const entries = data.entries || [];
    const scoreEvents = penaltiesMarkup(entries);
    const history = historyMarkup(entries, ranking);
    const podium = ranking.slice(0, 3);
    root.innerHTML = `<div class="ranking-heading"><div><span class="eyebrow">PLACAR GERAL · INTERCLASSE 2026</span><h2>Cada ponto conta<span>.</span></h2><p>A soma de todas as modalidades, resultados, frequência e plataforma em um só ranking.</p></div><div class="ranking-update"><span>ÚLTIMA ATUALIZAÇÃO</span><strong>${data.updatedAt ? new Date(data.updatedAt).toLocaleString("pt-BR") : "Aguardando pontuação"}</strong></div></div>${ranking.length ? `<div class="ranking-layout"><div class="ranking-board"><div class="podium">${podium.map((row, index) => `<article class="podium-card place-${index + 1}"><em>${index === 0 ? "★" : index + 1}</em><div class="ranking-identity">${identity(row.className)}</div><div><strong>${row.points}</strong><span>pontos</span></div><small>${row.wins}V · ${row.draws}E · ${row.losses}D</small></article>`).join("")}</div><div class="ranking-table"><div class="ranking-table-head"><span>POS.</span><span>TURMA</span><span>V · E · D</span><span>PONTOS</span></div>${ranking.map((row) => `<div class="ranking-row ${row.position <= 3 ? "is-top" : ""}"><b>${String(row.position).padStart(2, "0")}</b><div class="ranking-identity">${identity(row.className)}</div><span>${row.wins} · ${row.draws} · ${row.losses}</span><strong>${row.points}</strong></div>`).join("")}</div></div>${rulesMarkup()}</div>${history}${scoreEvents}` : `<div class="ranking-layout"><div class="ranking-empty"><span>★</span><h3>O placar começa no primeiro ponto.</h3><p>Assim que a organização lançar os resultados, as turmas aparecerão aqui em tempo real.</p></div>${rulesMarkup()}</div>`}`;
  } catch {
    root.innerHTML = `<div class="ranking-error"><strong>Ranking temporariamente indisponível.</strong><button type="button">Tentar novamente</button></div>`;
    root.querySelector("button").onclick = () => mountRanking(root);
  }
}
