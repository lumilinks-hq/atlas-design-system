import { escapeRegExp } from "./lib.mjs";

// 隔離できているかの証拠を残す。エージェントのイベントログ(sanitize前)に
// リポジトリの絶対パスや採点器の名前が何回現れたかを数える
function countOccurrences(haystack, needle) {
  if (!haystack || !needle) return 0;
  return (haystack.match(new RegExp(escapeRegExp(needle), "g")) ?? []).length;
}

export function scanIsolation(eventsText, { rootDir, markers = ["evaluate-experiment"] }) {
  const markerMentions = {};
  for (const marker of markers) {
    markerMentions[marker] = countOccurrences(eventsText, marker);
  }
  return {
    repoPathMentions: countOccurrences(eventsText, rootDir),
    markerMentions,
  };
}
