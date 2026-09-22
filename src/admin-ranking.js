import "./admin-ranking.css";
import { modalities } from "./modalities.js";
import { buildRanking, scoreTypes } from "./ranking-data.js";
import { attendanceClasses, currentWeekStart, parseAttendanceRows } from "./attendance-import.js";

const typeName = Object.fromEntries(scoreTypes);
const manualScoreTypes = scoreTypes.filter(([value]) => value !== "frequencia");
const formatWeek = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "";

export function mountRankingAdmin(root, { rows, esc }) {
  let entries = [];
  let editingId = null;
  let attendancePreview = null;
  let attendanceFileName = "";
  let attendanceMessage = "";
  let selectedWeek = currentWeekStart();
  const classes = [...new Set([...attendanceClasses, ...rows.map((row) => row.class_name)])]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  const request = async (method = "GET", body) => {
    const response = await fetch("/api/admin/ranking", {
      method,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw Error((await response.json()).error || "Não foi possível atualizar o ranking.");
    return response.json();
  };

  const fieldOptions = (values, selected) => values
    .map(([value, label]) => `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(label)}</option>`)
    .join("");

  const attendancePreviewMarkup = () => {
    if (!attendancePreview) return '<p class="attendance-empty">Selecione o relatório semanal em formato .xlsx para conferir os dados antes de salvar.</p>';
    if (attendancePreview.error) return `<p class="admin-error attendance-error" role="alert">${esc(attendancePreview.error)}</p>`;
    const { entries: imported, missingClasses, ignoredRows } = attendancePreview;
    return `<div class="attendance-preview-heading"><strong>${imported.length} turmas encontradas</strong><span>${esc(attendanceFileName)}</span></div>
      <div class="attendance-preview-table"><table><thead><tr><th>Turma</th><th>Presença</th><th>Pontos</th></tr></thead><tbody>${imported.map((entry) => `<tr><td><strong>${esc(entry.className)}</strong></td><td>${entry.attendanceRate.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td><td><b>+${entry.points}</b></td></tr>`).join("")}</tbody></table></div>
      ${missingClasses.length ? `<p class="attendance-warning"><strong>Sem dados no arquivo:</strong> ${missingClasses.map(esc).join(", ")}. Essas turmas não receberão lançamento nesta semana.</p>` : ""}
      ${ignoredRows.length ? `<p class="attendance-warning">Linhas não reconhecidas: ${ignoredRows.join(", ")}.</p>` : ""}`;
  };

  function render() {
    const ranking = buildRanking(entries, [...new Set(entries.map((entry) => entry.class_name))]);
    const editing = entries.find((entry) => entry.id === editingId);
    const editableTypes = editing?.entry_type === "frequencia" ? scoreTypes : manualScoreTypes;
    root.innerHTML = `<div class="ranking-admin-heading"><div><span class="eyebrow dark">PLACAR GERAL</span><h2>Pontuação das turmas</h2><p>Importe a frequência semanal e registre os demais resultados. O ranking público é recalculado automaticamente.</p></div><div class="ranking-admin-summary"><strong>${entries.reduce((sum, entry) => sum + Number(entry.points || 0), 0)}</strong><span>pontos lançados</span></div></div>
      <section class="weekly-attendance"><div class="weekly-attendance-title"><div><span class="eyebrow dark">FREQUÊNCIA SEMANAL</span><h3>Importar relatório de presença</h3><p>O sistema lê a coluna “(%) de Presença”, identifica as turmas e aplica automaticamente as faixas de 10, 15, 20 ou 25 pontos.</p></div><div class="attendance-rules"><span><b>85%</b>10 pts</span><span><b>90%</b>15 pts</span><span><b>95%</b>20 pts</span><span><b>100%</b>25 pts</span></div></div>
        <form id="attendance-form"><div class="attendance-controls"><label>Segunda-feira da semana<input id="attendance-week" name="week" type="date" value="${selectedWeek}" required></label><label class="attendance-file">Planilha de frequência<input id="attendance-file" name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"><span>${attendanceFileName ? "Trocar planilha" : "Escolher planilha .xlsx"}</span></label><button class="submit" type="submit" ${attendancePreview?.entries?.length ? "" : "disabled"}>Salvar frequência da semana <span>↗</span></button></div><div id="attendance-feedback" class="attendance-feedback">${attendancePreviewMarkup()}</div><p class="admin-error attendance-submit-error" role="alert"></p>${attendanceMessage ? `<p class="attendance-success">${esc(attendanceMessage)}</p>` : ""}</form>
      </section>
      <div class="ranking-admin-layout"><form id="score-form" class="score-form"><div class="score-form-title"><strong>${editing ? "Editar lançamento" : "Novo lançamento manual"}</strong><span>${editing ? "Altere os dados e salve novamente." : "Use este formulário para resultados, plataforma, bônus, penalidades e ajustes."}</span></div><div class="score-form-grid"><label>Turma<select name="class_name" required>${classes.map((value) => `<option ${value === editing?.class_name ? "selected" : ""}>${esc(value)}</option>`).join("")}</select></label><label>Modalidade<select name="modality_id"><option value="">Geral / fora das modalidades</option>${modalities.map((item) => `<option value="${item.id}" ${item.id === editing?.modality_id ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></label><label>Tipo<select name="entry_type" required>${fieldOptions(editableTypes, editing?.entry_type || "resultado")}</select></label><label class="score-description">Descrição<input name="label" required minlength="3" maxlength="120" value="${esc(editing?.label || "")}" placeholder="Ex.: vitória no futsal"></label><label>Pontos<input name="points" type="number" required min="-10000" max="10000" value="${editing?.points ?? 0}"><small>Aceita valores negativos.</small></label><label>Vitórias<input name="wins" type="number" required min="0" max="999" value="${editing?.wins ?? 0}"></label><label>Empates<input name="draws" type="number" required min="0" max="999" value="${editing?.draws ?? 0}"></label><label>Derrotas<input name="losses" type="number" required min="0" max="999" value="${editing?.losses ?? 0}"></label></div><p class="admin-error" role="alert"></p><div class="score-form-actions">${editing ? '<button id="cancel-score" type="button" class="admin-secondary">Cancelar</button>' : ""}<button class="submit" type="submit">${editing ? "Salvar alterações" : "Adicionar ao ranking"} <span>↗</span></button></div></form>
        <section class="ranking-admin-preview"><span>PRÉVIA DO RANKING</span>${ranking.length ? ranking.slice(0, 8).map((row) => `<div><b>${row.position}</b><strong>${esc(row.className)}</strong><small>${row.wins}V · ${row.draws}E · ${row.losses}D</small><em>${row.points} pts</em></div>`).join("") : "<p>Nenhum ponto lançado ainda.</p>"}</section></div>
      <section class="score-history"><div><h3>Histórico de lançamentos</h3><span>${entries.length} ${entries.length === 1 ? "registro" : "registros"}</span></div>${entries.length ? `<div class="admin-table"><table><thead><tr><th>Turma</th><th>Tipo</th><th>Descrição</th><th>Modalidade</th><th>V · E · D</th><th>Pontos</th><th>Ações</th></tr></thead><tbody>${entries.map((entry) => `<tr><td><strong>${esc(entry.class_name)}</strong></td><td>${esc(typeName[entry.entry_type] || entry.entry_type)}</td><td>${esc(entry.label)}</td><td>${esc(modalities.find((item) => item.id === entry.modality_id)?.name || "Geral")}</td><td>${entry.wins} · ${entry.draws} · ${entry.losses}</td><td><strong class="score-value ${entry.points < 0 ? "negative" : ""}">${entry.points > 0 ? "+" : ""}${entry.points}</strong></td><td class="admin-actions">${entry.source === "competition" ? '<span class="weekly-entry-note">Altere em Resultados</span>' : `${entry.attendance_week ? '<span class="weekly-entry-note">Reimporte para alterar</span>' : `<button data-score-edit="${entry.id}">Editar</button>`}<button class="danger" data-score-delete="${entry.id}">${entry.source === "teacher" ? "Desfazer" : "Excluir"}</button>`}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">O histórico aparecerá após o primeiro lançamento.</div>'}</section>`;

    const attendanceForm = root.querySelector("#attendance-form");
    const weekInput = root.querySelector("#attendance-week");
    weekInput.onchange = () => {
      selectedWeek = weekInput.value;
      const date = new Date(`${selectedWeek}T12:00:00Z`);
      weekInput.setCustomValidity(date.getUTCDay() === 1 ? "" : "Escolha uma segunda-feira.");
      weekInput.reportValidity();
    };
    root.querySelector("#attendance-file").onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      attendanceFileName = file.name;
      attendanceMessage = "";
      root.querySelector("#attendance-feedback").innerHTML = '<p class="attendance-empty">Lendo a planilha…</p>';
      try {
        const { readAttendanceXlsx } = await import("./xlsx-attendance-reader.js");
        attendancePreview = parseAttendanceRows(readAttendanceXlsx(await file.arrayBuffer()));
      } catch (error) {
        attendancePreview = { error: error.message || "Não foi possível ler a planilha." };
      }
      render();
    };
    attendanceForm.onsubmit = async (event) => {
      event.preventDefault();
      selectedWeek = weekInput.value;
      if (!attendancePreview?.entries?.length) return;
      const date = new Date(`${selectedWeek}T12:00:00Z`);
      if (date.getUTCDay() !== 1) {
        weekInput.setCustomValidity("Escolha uma segunda-feira.");
        weekInput.reportValidity();
        return;
      }
      const button = attendanceForm.querySelector("button[type=submit]");
      button.disabled = true;
      button.textContent = "Salvando frequência…";
      try {
        const result = await request("POST", {
          action: "weeklyAttendance",
          weekStart: selectedWeek,
          entries: attendancePreview.entries,
        });
        entries = await request();
        attendanceMessage = `${result.imported} turmas salvas para a semana de ${formatWeek(selectedWeek)}.`;
        attendancePreview = null;
        attendanceFileName = "";
        render();
      } catch (error) {
        attendanceForm.querySelector(".attendance-submit-error").textContent = error.message;
        button.disabled = false;
        button.innerHTML = "Salvar frequência da semana <span>↗</span>";
      }
    };

    const form = root.querySelector("#score-form");
    form.onsubmit = async (event) => {
      event.preventDefault();
      const button = form.querySelector(".submit");
      const data = Object.fromEntries(new FormData(form));
      ["points", "wins", "draws", "losses"].forEach((key) => { data[key] = Number(data[key]); });
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
    root.querySelectorAll("[data-score-edit]").forEach((button) => {
      button.onclick = () => { editingId = button.dataset.scoreEdit; render(); root.scrollIntoView({ behavior: "smooth" }); };
    });
    root.querySelectorAll("[data-score-delete]").forEach((button) => {
      button.onclick = async () => {
        const entry = entries.find((item) => item.id === button.dataset.scoreDelete);
        const message = entry.source === "teacher"
          ? `Desfazer a penalidade de ${entry.responsible_student} e devolver 10 pontos para a turma ${entry.class_name}?`
          : `Excluir “${entry.label}” da turma ${entry.class_name}?`;
        if (!confirm(message)) return;
        try { await request("DELETE", { id: entry.id }); entries = await request(); render(); } catch (error) { alert(error.message); }
      };
    });
  }

  root.innerHTML = '<div class="ranking-admin-loading">Carregando pontuação…</div>';
  request().then((data) => { entries = data; render(); }).catch((error) => { root.innerHTML = `<div class="empty">${esc(error.message)}</div>`; });
}
