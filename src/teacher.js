import "./style.css";
import "./school.css";
import "./teacher.css";

const app = document.querySelector("#app");
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
let students = [];

function shell(content) {
  app.innerHTML = `<header class="teacher-header"><a class="brand" href="/"><span class="brand-symbol">i<span>✦</span></span>interclasse<span class="brand-year">PROFESSOR</span></a><a href="/" class="teacher-back">← Voltar ao site</a></header><main class="teacher-main">${content}</main>`;
}

function login(message = "") {
  shell(`<section class="teacher-login"><span class="teacher-kicker">ACESSO DO PROFESSOR</span><h1>Registro de ocorrência</h1><p>Acesse para registrar rapidamente um estudante fora da sala. A ocorrência desconta 10 pontos da turma.</p><form id="teacher-login"><label>Senha dos professores<input type="password" name="password" autocomplete="current-password" required autofocus></label><p class="teacher-error" role="alert">${esc(message)}</p><button type="submit">Entrar <span>↗</span></button></form></section>`);
  document.querySelector("#teacher-login").onsubmit = async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    try {
      const response = await fetch("/api/teacher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", password: new FormData(event.currentTarget).get("password") }) });
      if (!response.ok) throw Error((await response.json()).error || "Não foi possível entrar.");
      await load();
    } catch (error) { login(error.message); }
  };
}

function dashboard(data) {
  students = data.students || [];
  const classes = [...new Set(students.map((student) => student.class_name))];
  shell(`<section class="teacher-dashboard"><div class="teacher-title"><div><span class="teacher-kicker">PENALIDADE DE SALA</span><h1>Quem está cabulando?</h1><p>Selecione a turma e o estudante. O lançamento ficará público no ranking geral.</p></div><button id="teacher-logout" class="teacher-logout">Sair</button></div><form id="absence-form" class="absence-form"><label>1. Selecione a turma<select name="class_name" required><option value="">Escolha a turma</option>${classes.map((className) => `<option>${esc(className)}</option>`).join("")}</select></label><label>2. Selecione o estudante<select name="student_name" required disabled><option value="">Escolha primeiro a turma</option></select></label><div class="absence-warning"><span>−10</span><div><strong>pontos no ranking geral</strong><p>O nome do estudante será exibido publicamente como responsável pela perda.</p></div></div><p class="teacher-error" role="alert"></p><button class="absence-submit" type="submit" disabled>Registrar perda de 10 pontos</button></form><section class="teacher-recent"><div><span>ÚLTIMOS REGISTROS</span><strong>Ocorrências recentes</strong></div>${data.recent?.length ? data.recent.map((item) => `<article><div><strong>${esc(item.responsible_student)}</strong><span>${esc(item.class_name)}</span></div><b>−10 pts</b><small>${new Date(item.created_at).toLocaleString("pt-BR")}</small></article>`).join("") : "<p>Nenhuma ocorrência registrada por professores.</p>"}</section></section>`);
  const form = document.querySelector("#absence-form");
  const classSelect = form.class_name;
  const studentSelect = form.student_name;
  const submit = form.querySelector(".absence-submit");
  classSelect.onchange = () => {
    const visible = students.filter((student) => student.class_name === classSelect.value);
    studentSelect.innerHTML = `<option value="">Escolha o estudante</option>${visible.map((student) => `<option>${esc(student.student_name)}</option>`).join("")}`;
    studentSelect.disabled = !visible.length;
    submit.disabled = true;
  };
  studentSelect.onchange = () => submit.disabled = !studentSelect.value;
  form.onsubmit = async (event) => {
    event.preventDefault();
    const className = classSelect.value;
    const studentName = studentSelect.value;
    if (!confirm(`Confirmar que ${studentName}, da turma ${className}, estava cabulando?\n\nA turma perderá 10 pontos e o nome será exibido no ranking.`)) return;
    submit.disabled = true;
    submit.textContent = "Registrando…";
    try {
      const response = await fetch("/api/teacher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "absence", class_name: className, student_name: studentName }) });
      if (!response.ok) throw Error((await response.json()).error || "Não foi possível registrar.");
      const result = await response.json();
      shell(`<section class="teacher-success"><span>✓</span><h1>Penalidade registrada</h1><p><strong>${esc(result.responsible_student)}</strong> foi identificado como responsável. A turma <strong>${esc(result.class_name)}</strong> perdeu 10 pontos.</p><button id="another-entry">Registrar outra ocorrência</button><a href="/">Ver ranking público →</a></section>`);
      document.querySelector("#another-entry").onclick = load;
    } catch (error) {
      form.querySelector(".teacher-error").textContent = error.message;
      submit.disabled = false;
      submit.textContent = "Registrar perda de 10 pontos";
    }
  };
  document.querySelector("#teacher-logout").onclick = async () => { await fetch("/api/teacher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); login(); };
}

async function load() {
  try {
    const response = await fetch("/api/teacher?action=data", { headers: { Accept: "application/json" } });
    if (response.status === 401) return login();
    if (!response.ok) throw Error((await response.json()).error || "Não foi possível carregar os estudantes.");
    dashboard(await response.json());
  } catch (error) { login(error.message); }
}

load();
