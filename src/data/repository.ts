// 公開リポジトリの場所。サイトからファイルの原本へ辿れるようにするために使う
export const repositoryUrl = "https://github.com/lumilinks-hq/atlas-design-system";
export const repositoryBranch = "main";

// リポジトリ内のパスを GitHub の原本へ結ぶ。* を含むものと末尾が / のものはディレクトリ、それ以外はファイルを指す
export function artifactSourceHref(path: string) {
  const segments = path.replace(/\/$/, "").split("/");
  const globIndex = segments.findIndex((segment) => segment.includes("*"));
  if (globIndex >= 0) return `${repositoryUrl}/tree/${repositoryBranch}/${segments.slice(0, globIndex).join("/")}`;
  if (path.endsWith("/")) return `${repositoryUrl}/tree/${repositoryBranch}/${segments.join("/")}`;
  return `${repositoryUrl}/blob/${repositoryBranch}/${segments.join("/")}`;
}
