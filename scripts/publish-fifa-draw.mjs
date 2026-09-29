import { createHash, randomInt } from "node:crypto";
import { createLeagueTournament } from "../src/draw.js";

const apply = process.argv.includes("--apply");
const url = process.env.VITE_SUPABASE_URL || Object.entries(process.env).find(([name]) => name.endsWith("VITE_SUPABASE_URL"))?.[1];
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw Error("Credenciais do Supabase ausentes.");

const headers = {
  "Content-Type": "application/json",
  apikey: key,
  Authorization: `Bearer ${key}`,
};
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
};
const hash = (value) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex").slice(0, 16);
const request = async (path, options = {}) => {
  const response = await fetch(`${url}/rest/v1/${path}`, { ...options, headers: { ...headers, ...options.headers } });
  if (!response.ok) throw Error(`${options.method || "GET"} ${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
};

const [records, registrations, savedResults, rankingEntries] = await Promise.all([
  request("interclasse_draws?id=eq.official&select=payload,updated_at&limit=1"),
  request("interclasse_registrations?modality_id=eq.fifa&select=class_name&order=class_name.asc"),
  request("interclasse_competition_results?competition_id=eq.fifa&select=competition_id,payload&limit=1"),
  request("interclasse_score_entries?competition_id=eq.fifa&source=eq.competition&select=id"),
]);
const current = records[0]?.payload;
if (!current?.brackets?.fifa) throw Error("O sorteio oficial do FIFA não foi encontrado.");
const teams = [...new Set(registrations.map((item) => item.class_name))];
if (teams.length < 8) throw Error(`O FIFA possui apenas ${teams.length} turmas; são necessárias ao menos 8.`);

const otherBefore = Object.fromEntries(Object.entries(current.brackets).filter(([id]) => id !== "fifa"));
const next = structuredClone(current);
next.brackets.fifa = createLeagueTournament(teams, () => randomInt(0, 2 ** 32) / 2 ** 32);
const otherAfter = Object.fromEntries(Object.entries(next.brackets).filter(([id]) => id !== "fifa"));
if (JSON.stringify(otherBefore) !== JSON.stringify(otherAfter)) throw Error("A verificação detectou alteração fora do FIFA.");

const report = {
  mode: apply ? "apply" : "dry-run",
  participantCount: teams.length,
  currentFifaFormat: current.brackets.fifa.format,
  currentFifaTeamOrder: current.brackets.fifa.teams || [],
  currentFifaSavedMatches: Object.keys((savedResults[0]?.payload || {}).matches || {}).length,
  fifaBefore: hash(current.brackets.fifa),
  fifaAfter: hash(next.brackets.fifa),
  otherBracketsBefore: hash(otherBefore),
  otherBracketsAfter: hash(otherAfter),
  newTeamOrder: next.brackets.fifa.teams,
  fifaResultsToReset: savedResults.length,
  fifaRankingEntriesToReset: rankingEntries.length,
};

if (apply) {
  await request("interclasse_draws?id=eq.official", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ payload: next, updated_at: new Date().toISOString() }),
  });
  if (savedResults.length || rankingEntries.length) {
    await request("rpc/interclasse_save_competition_result", {
      method: "POST",
      body: JSON.stringify({ p_competition_id: "fifa", p_payload: { version: 1, matches: {} }, p_entries: [] }),
    });
  }
  const verified = (await request("interclasse_draws?id=eq.official&select=payload&limit=1"))[0]?.payload;
  const verifiedOthers = Object.fromEntries(Object.entries(verified?.brackets || {}).filter(([id]) => id !== "fifa"));
  if (hash(verifiedOthers) !== hash(otherBefore) || hash(verified?.brackets?.fifa) !== hash(next.brackets.fifa)) {
    throw Error("A verificação após a gravação falhou.");
  }
  report.verified = true;
}

console.log(JSON.stringify(report, null, 2));
