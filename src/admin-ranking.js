import "./admin-ranking.css";
import { modalities } from "./modalities.js";
import { buildRanking, scoreTypes } from "./ranking-data.js";

const defaultClasses = [1, 2, 3].flatMap((year) => ["A", "B", "C", "D", "E"].map((letter) => `${year}º ${letter}`));
const typeName = Object.fromEntries(scoreTypes);

export function mountRankingAdmin(root, { rows, esc }) {
  let entries = [];
  let editingId = null;
  const classes = [...new Set([...defaultClasses, ...rows.map((row) => row.class_name)])].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const request = async (method = "GET", body) => {
    const response = await fetch("/api/admin/ranking", {
      method,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw Error((await response.json()).error || "Não foi possível atualizar o ranking.");
    return response.json();
  };

  const fieldOptions = (values, selected) => values.map(([value, label]) => `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(label)}</option>`).join("");

  function render() {
    const ranking = buildRanking(entries, [...new Set(entries.map((entry) => entry.class_name))]);
    const editing = entries.find((entry) => entry.id === editingId);
    root.innerHTML = `<div class="ranking-admin-heading"><div><span class="eyebrow dark">PLACAR GERAL</span><h2>Pontuação das turmas</h2><p>Registre resultados, frequência, plataforma, bônus e penalidades. O ranking público é recalculado automaticamente.</p></div><div class="ranking-admin-summary"><strong>${entries.reduce((sum, entry) => sum + Number(entry.points || 0), 0)}</strong><span>pontos lançados</span></div></div><div class="ranking-admin-layout"><form id="score-form" class="score-form"><div class="score-form-title"><strong>${editing ? "Editar lançamento" : "Novo lançamento"}</strong><span>${editing ? "Altere os dados e salve novamente." : "Cada registro fica no histórico do placar."}</span></div><div class="score-form-grid"><label>Turma<select name="class_name" required>${classes.map((value) => `<option ${value === editing?.class_name ? "selected" : ""}>${esc(value)}</option>`).join("")}</select></label><label>Modalidade<select name="modality_id"><option value="">Geral / fora das modalidades</option>${modalities.map((item) => `<option value="${item.id}" ${item.id === editing?.modality_id ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></label><label>Tipo<select name="entry_type" required>${fieldOptions(scoreTypes, editing?.entry_type || "resultado")}</select></label><label class="score-description">Descrição<input name="label" required minlength="3" maxlength="120" value="${esc(editing?.label || "")}" placeholder="Ex.: vitória no futsal ou frequência de 95%"></label><label>Pontos<input name="points" type="number" required min="-10000" max="10000" value="${editing?.points ?? 0}"><small>Aceita valores negativos.</small></label><label>Vitórias<input name="wins" type="number" required min="0" max="999" value="${editing?.wins ?? 0}"></label><label>Empates<input name="draws" type="number" required min="0" max="999" value="${editing?.draws ?? 0}"></label><label>Derrotas<input name="losses" type="number" required min="0" max="999" value="${editing?.losses ?? 0}"></label></div><p class="admin-error" role="alert"></p><div class="score-form-actions">${editing ? '<button id="cancel-score" type="button" class="admin-secondary">Cancelar</button>' : ""}<button class="submit" type="submit">${editing ? "Salvar alterações" : "Adicionar ao ranking"} <span>↗</span></button></div></form><section class="ranking-admin-preview"><span>PRÉVIA DO RANKING</span>${ranking.length ? ranking.slice(0, 8).map((row) => `<div><b>${row.position}</b><strong>${esc(row.className)}</strong><small>${row.wins}V · ${row.draws}E · ${row.losses}D</small><em>${row.points} pts</em></div>`).join("") : "<p>Nenhum ponto lançado ainda.</p>"}</section></div><section class="score-history"><div><h3>Histórico de lançamentos</h3><span>${entries.length} ${entries.length === 1 ? "registro" : "registros"}</span></div>${entries.length ? `<div class="admin-table"><table><thead><tr><th>Turma</th><th>Tipo</th><th>Descrição</th><th>Modalidade</th><th>V · E · D</th><th>Pontos</th><th>Ações</th></tr></thead><tbody>${entries.map((entry) => `<tr><td><strong>${esc(entry.class_name)}</strong></td><td>${esc(typeName[entry.entry_type] || entry.entry_type)}</td><td>${esc(entry.label)}</td><td>${esc(modalities.find((item) => item.id === entry.modality_id)?.name || "Geral")}</td><td>${entry.wins} · ${entry.draws} · ${entry.losses}</td><td><strong class="score-value ${entry.points < 0 ? "negative" : ""}">${entry.points > 0 ? "+" : ""}${entry.points}</strong></td><td class="admin-actions"><button data-score-edit="${entry.id}">Editar</button><button class="danger" data-score-delete="${entry.id}">${entry.source === "teacher" ? "Desfazer" : "Excluir"}</button></td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">O histórico aparecerá após o primeiro lançamento.</div>'}</section>`;
    const form = root.querySelector("#score-form");
    form.onsubmit = async (event) => {
      event.preventDefault();
      const button = form.querySelector(".submit");
      const data = Object.fromEntries(new FormData(form));
      ["points", "wins", "draws", "losses"].forEach((key) => data[key] = Number(data[key]));
      if (editingId) data.id = editingId;
      button.disabled = true;
      button.textContent = "Salvando…";
      try {
        await request(editingId ? "PATCH" : "POST", data);
        editingId = null;
        entries = await request();
        render();
      } catch (error) {
        form.querySelector(".admin-error").textContent = error.message;
        button.disabled = false;
        button.textContent = editingId ? "Salvar alterações ↗" : "Adicionar ao ranking ↗";
      }
    };
    root.querySelector("#cancel-score")?.addEventListener("click", () => { editingId = null; render(); });
    root.querySelectorAll("[data-score-edit]").forEach((button) => button.onclick = () => { editingId = button.dataset.scoreEdit; render(); root.scrollIntoView({ behavior: "smooth" }); });
    root.querySelectorAll("[data-score-delete]").forEach((button) => button.onclick = async () => {
      const entry = entries.find((item) => item.id === button.dataset.scoreDelete);
      const message = entry.source === "teacher"
        ? `Desfazer a penalidade de ${entry.responsible_student} e devolver 10 pontos para a turma ${entry.class_name}?`
        : `Excluir “${entry.label}” da turma ${entry.class_name}?`;
      if (!confirm(message)) return;
      try { await request("DELETE", { id: entry.id }); entries = await request(); render(); } catch (error) { alert(error.message); }
    });
  }

  root.innerHTML = '<div class="ranking-admin-loading">Carregando pontuação…</div>';
  request().then((data) => { entries = data; render(); }).catch((error) => { root.innerHTML = `<div class="empty">${esc(error.message)}</div>`; });
}
