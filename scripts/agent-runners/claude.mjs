import { mkdir, symlink } from "node:fs/promises";
import { join, resolve } from "node:path";

// Claude Code CLI adapter。CLI固有のフラグはこのファイルだけに閉じ込める
export const claudeRunner = {
  id: "claude",
  command: "claude",
  defaultModel: "claude-opus-5",
  versionArgs: ["--version"],
  buildExecArgs({ model, prompt, images = [], json = false }) {
    // 画像を渡すフラグが無いので、パスをprompt本文に書いてReadさせる
    const fullPrompt = images.length === 0
      ? prompt
      : `${prompt}\n\nスクリーンショットは次のファイルをReadして確認してください:\n${images.map((path) => `- ${path}`).join("\n")}`;
    return [
      "-p",
      fullPrompt,
      "--model",
      model,
      // ユーザー設定を持ち込まず、workspace内の設定だけを読む（codexの--ignore-user-config相当）
      "--setting-sources",
      "project",
      "--dangerously-skip-permissions",
      ...(json ? ["--output-format", "stream-json", "--verbose"] : []),
    ];
  },
  async prepareWorkspace(workspaceDir) {
    // skillsは .agents/skills/ に配置される。Claude Code が読む .claude/skills/ から参照させる
    await mkdir(resolve(workspaceDir, ".claude"), { recursive: true });
    try {
      await symlink(join("..", ".agents", "skills"), resolve(workspaceDir, ".claude", "skills"), "dir");
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  },
};
