export const BUILD_VERSION_PARAM = "__medora_v";

export function createBuildRefreshUrl(href, buildId) {
  const url = new URL(href);
  url.searchParams.set(BUILD_VERSION_PARAM, buildId);
  return url.toString();
}

export function stripBuildVersionParam(href) {
  const url = new URL(href);
  url.searchParams.delete(BUILD_VERSION_PARAM);
  return url.toString();
}
