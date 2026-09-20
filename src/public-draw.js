import { modalities } from "./modalities.js";
import { logoForClass } from "./class-logos.js";
import "./public-draw.css";
import { assetUrl, recoverImage } from "./assets.js";

const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );

function competitionMeta(id) {
  const [modalityId, eventName, division] = id.split(":");
  const modality = modalities.find((item) => item.id === modalityId);
  return {
    title: eventName ? `${eventName} — ${division}` : modality?.name || id,
    subtitle: eventName ? modality?.name : "",
    category: modality?.category || "Outras",
  };
}

function team(teamName) {
  const logo = logoForClass(teamName);
  return `<span class="public-team">${logo ? `<img src="${assetUrl(logo)}" alt="" width="42" height="42" loading="lazy">` : ""}<strong>${esc(teamName || "A definir")}</strong></span>`;
}

function match(match) {
  return `<div class="public-match ${match.b ? "" : "is-bye"}"><span>${team(match.a)}</span><i>${match.b ? "×" : "avança direto"}</i>${match.b ? `<span>${team(match.b)}</span>` : ""}</div>`;
}

function roundsMarkup(rounds = []) {
  return `<div class="public-rounds">${rounds.map((round) => `<section class="public-round"><h4>${esc(round.name)}</h4><div>${round.matches.map(match).join("")}</div></section>`).join("")}</div>`;
}

function bracketMarkup(bracket) {
  if (bracket.automaticWinner)
    return `<div class="public-automatic"><span>Classificação automática</span>${team(bracket.automaticWinner)}<p>Única turma inscrita nesta competição.</p></div>`;
  if (bracket.format === "groups-knockout")
    return `<div class="public-groups">${["A", "B"].map((group) => `<section><header><span>GRUPO</span><strong>${group}</strong></header><div>${bracket.groups[group].map((name, index) => `<div><b>${index + 1}</b>${team(name)}</div>`).join("")}</div></section>`).join("")}</div><div class="public-stage-title"><span>Próxima fase</span><strong>Os 4 melhores de cada grupo avançam ao mata-mata</strong></div>${roundsMarkup(bracket.knockout?.rounds)}`;
  return roundsMarkup(bracket.rounds);
}

function drawCard([id, bracket]) {
  const meta = competitionMeta(id);
  return `<details class="public-draw-card" data-draw-category="${esc(meta.category)}"><summary><span class="public-card-icon">${bracket.format === "groups-knockout" ? "A/B" : "×"}</span><span><small>${esc(meta.category)}</small><strong>${esc(meta.title)}</strong>${meta.subtitle ? `<em>${esc(meta.subtitle)}</em>` : ""}</span><span class="public-card-count">${bracket.participantCount} ${bracket.participantCount === 1 ? "turma" : "turmas"} <b aria-hidden="true">⌄</b></span></summary><div class="public-bracket">${bracketMarkup(bracket)}</div></details>`;
}

export async function mountPublicDraw(root) {
  try {
    const response = await fetch("/api/draw", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;
    const { draw } = await response.json();
    if (!draw?.brackets) return;
    const competitions = Object.entries(draw.brackets).filter(
      ([, bracket]) => bracket?.participantCount > 0,
    );
    if (!competitions.length) return;
    const categories = [
      ...new Set(competitions.map(([id]) => competitionMeta(id).category)),
    ];
    root.hidden = false;
    document
      .querySelector("[data-public-draw-link]")
      ?.removeAttribute("hidden");
    root.innerHTML = `<div class="public-draw-heading"><div><span class="eyebrow dark">SORTEIO OFICIAL</span><h2>Os confrontos estão definidos<span>.</span></h2><p>Consulte os grupos e chaveamentos de todas as modalidades.</p></div><div class="public-draw-date"><span>REALIZADO EM</span><strong>${new Date(draw.generatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</strong><small>Resultado somente para visualização</small></div></div><div class="public-draw-filters" role="group" aria-label="Filtrar sorteio"><button class="selected" data-draw-filter="">Todos</button>${categories.map((category) => `<button data-draw-filter="${esc(category)}">${esc(category)}</button>`).join("")}</div><div class="public-draw-list">${competitions.map(drawCard).join("")}</div>`;
    root.querySelectorAll("[data-draw-filter]").forEach(
      (button) =>
        (button.onclick = () => {
          root
            .querySelectorAll("[data-draw-filter]")
            .forEach((item) =>
              item.classList.toggle("selected", item === button),
            );
          root
            .querySelectorAll("[data-draw-category]")
            .forEach(
              (card) =>
                (card.hidden = Boolean(
                  button.dataset.drawFilter &&
                    card.dataset.drawCategory !== button.dataset.drawFilter,
                )),
            );
        }),
    );
    root.querySelector(".public-draw-card")?.setAttribute("open", "");
    root
      .querySelectorAll("img")
      .forEach((image) =>
        image.addEventListener("error", () => recoverImage(image)),
      );
  } catch {}
}
