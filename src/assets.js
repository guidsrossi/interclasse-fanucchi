const assetVersion = "20260920-2";

export function assetUrl(path) {
  if (!path || !path.startsWith("/")) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${assetVersion}`;
}

export function recoverImage(image) {
  if (image.dataset.assetRetry === "done") {
    image.hidden = true;
    image.closest(".team-identity")?.classList.add("logo-failed");
    return;
  }
  image.dataset.assetRetry = "done";
  const source = new URL(image.currentSrc || image.src, location.origin);
  source.searchParams.set("retry", Date.now().toString());
  image.src = source.toString();
}
