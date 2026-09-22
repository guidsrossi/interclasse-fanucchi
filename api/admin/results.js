import { authorized } from "./_auth.js";
import { competitionProgress, rankingEntriesForCompetition } from "../../src/competition-results.js";
import { modalities } from "../../src/modalities.js";

const headers = (key) => ({ "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` });
const competitionIdPattern = /^[\p{L}\p{N}: _—-]{1,180}$/u;
const matchIdPattern = /^(group-[AB]-\d+-\d+|ko-\d+-\d+)$/;
const nonNegativeInteger = (value) => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 999;

function competitionMeta(competitionId) {
  const [modalityId, eventName, division] = competitionId.split(":");
  const modality = modalities.find((item) => item.id === modalityId);
  return { id: competitionId, modalityId, title: eventName ? `${eventName} — ${division}` : modality?.name || competitionId };
}

export function normalizeMatchResult(input, match, students) {
  if (!nonNegativeInteger(input?.homeScore) || !nonNegativeInteger(input?.awayScore)) throw Error("Informe placares inteiros entre 0 e 999.");
  const result = { homeScore: Number(input.homeScore), awayScore: Number(input.awayScore), scorers: [] };
  if (match.knockout) {
    if (![match.home, match.away].includes(input?.advancedTeam)) throw Error("Escolha qual turma avançou neste confronto.");
    result.advancedTeam = input.advancedTeam;
    const hasHomePenalty = input.homePenalty !== null && input.homePenalty !== undefined && input.homePenalty !== "";
    const hasAwayPenalty = input.awayPenalty !== null && input.awayPenalty !== undefined && input.awayPenalty !== "";
    if (hasHomePenalty !== hasAwayPenalty || (hasHomePenalty && (!nonNegativeInteger(input.homePenalty) || !nonNegativeInteger(input.awayPenalty)))) throw Error("Revise o placar dos pênaltis.");
    if (hasHomePenalty) {
      result.homePenalty = Number(input.homePenalty);
      result.awayPenalty = Number(input.awayPenalty);
    }
  }
  const scorers = Array.isArray(input?.scorers) ? input.scorers : [];
  if (scorers.length > 100) throw Error("Há pontuadores demais neste jogo.");
  result.scorers = scorers.map((item) => {
    const className = String(item?.className || "").trim();
    const studentName = String(item?.studentName || "").trim().replace(/\s+/g, " ");
    const points = Number(item?.points);
    if (![match.home, match.away].includes(className) || studentName.length < 3 || studentName.length > 100 || !Number.isInteger(points) || points < 1 || points > 999) throw Error("Revise os estudantes e os pontos individuais informados.");
    if (!students.has(`${className}|${studentName.toLocaleLowerCase("pt-BR")}`)) throw Error(`${studentName} não está na lista da turma ${className}.`);
    return { className, studentName, points };
  });
  for (const [className, expected] of [[match.home, result.homeScore], [match.away, result.awayScore]]) {
    const assigned = result.scorers.filter((item) => item.className === className).reduce((sum, item) => sum + item.points, 0);
    if (assigned !== expected) throw Error(`Distribua os ${expected} pontos de ${className} entre os estudantes.`);
  }
  result.updatedAt = new Date().toISOString();
  return result;
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: "Não autorizado." });
  if (!["GET", "PUT"].includes(req.method)) return res.status(405).end();
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "Administração ainda não configurada." });
  if (req.method === "GET") {
    const [resultsResponse, studentsResponse] = await Promise.all([
      fetch(`${url}/rest/v1/interclasse_competition_results?select=competition_id,payload,updated_at&order=updated_at.desc`, { headers: headers(key) }),
      fetch(`${url}/rest/v1/interclasse_students?select=class_name,student_name&order=class_name.asc,student_name.asc&limit=5000`, { headers: headers(key) }),
    ]);
    if (!resultsResponse.ok || !studentsResponse.ok) return res.status(502).json({ error: "Não foi possível consultar os resultados." });
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ results: await resultsResponse.json(), students: await studentsResponse.json() });
  }

  const competitionId = String(req.body?.competitionId || "").trim();
  const matchId = String(req.body?.matchId || "").trim();
  if (!competitionIdPattern.test(competitionId) || !matchIdPattern.test(matchId)) return res.status(400).json({ error: "Jogo inválido." });
  const [drawResponse, savedResponse, studentsResponse] = await Promise.all([
    fetch(`${url}/rest/v1/interclasse_draws?id=eq.official&select=payload&limit=1`, { headers: headers(key) }),
    fetch(`${url}/rest/v1/interclasse_competition_results?competition_id=eq.${encodeURIComponent(competitionId)}&select=payload&limit=1`, { headers: headers(key) }),
    fetch(`${url}/rest/v1/interclasse_students?select=class_name,student_name&limit=5000`, { headers: headers(key) }),
  ]);
  if (![drawResponse, savedResponse, studentsResponse].every((response) => response.ok)) return res.status(502).json({ error: "Não foi possível validar o jogo." });
  const draw = (await drawResponse.json())[0]?.payload;
  const bracket = draw?.brackets?.[competitionId];
  if (!bracket) return res.status(404).json({ error: "Competição não encontrada no sorteio publicado." });
  const payload = (await savedResponse.json())[0]?.payload || { version: 1, matches: {} };
  payload.version = 1;
  payload.matches = { ...(payload.matches || {}) };
  const progress = competitionProgress(bracket, payload);
  const match = [...progress.groupMatches, ...progress.knockoutMatches].find((item) => item.id === matchId);
  if (!match?.home || !match?.away) return res.status(409).json({ error: "Este confronto ainda depende dos resultados anteriores." });

  if (req.body?.clear === true) delete payload.matches[matchId];
  else {
    const students = new Set((await studentsResponse.json()).map((item) => `${item.class_name}|${item.student_name.toLocaleLowerCase("pt-BR")}`));
    try { payload.matches[matchId] = normalizeMatchResult(req.body?.result, match, students); }
    catch (error) { return res.status(400).json({ error: error.message }); }
  }
  if (match.group) Object.keys(payload.matches).filter((id) => id.startsWith("ko-")).forEach((id) => delete payload.matches[id]);
  else Object.keys(payload.matches).filter((id) => {
    const round = Number(id.match(/^ko-(\d+)-/)?.[1]);
    return Number.isInteger(round) && round > match.roundIndex;
  }).forEach((id) => delete payload.matches[id]);

  const entries = rankingEntriesForCompetition(competitionMeta(competitionId), bracket, payload).map((item) => ({ ...item, label: item.label.slice(0, 120) }));
  const response = await fetch(`${url}/rest/v1/rpc/interclasse_save_competition_result`, {
    method: "POST",
    headers: headers(key),
    body: JSON.stringify({ p_competition_id: competitionId, p_payload: payload, p_entries: entries }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return res.status(502).json({ error: data.message || "Não foi possível salvar o resultado." });
  }
  return res.status(200).json({ payload, rankingEntries: entries.length });
}
