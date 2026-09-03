// Codex CLI adapter。CLI固有のフラグはこのファイルだけに閉じ込める
const baseArgs = ["exec", "--ignore-user-config", "--ignore-rules", "--ephemeral", "--approve-for-me"];

export const codexRunner = {
  id: "codex",
  command: "codex",
  defaultModel: "gpt-5.4",
  versionArgs: ["--version"],
  buildExecArgs({ model, prompt, images = [], json = false, cwd }) {
    // -i/--image は可変長のため、promptは--区切りの後に置かないと画像パス扱いされる
    return [
      ...baseArgs,
      ...(json ? ["--json"] : []),
      "--model",
      model,
      ...(cwd ? ["-C", cwd] : []),
      ...images.flatMap((path) => ["-i", path]),
      "--",
      prompt,
    ];
  },
};
