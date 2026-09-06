// lint、typecheck、test:run をこの順で最後まで走らせ、失敗をまとめて 1 回で報告する。
// 個別コマンドを編集のたびに叩くと往復が増えるため、画面が仕上がった時点でこれだけを実行する
import { spawnSync } from "node:child_process";
import console from "node:console";
import process from "node:process";

const steps = [
  ["lint", ["run", "lint"]],
  ["typecheck", ["run", "typecheck"]],
  ["test", ["run", "test:run"]],
];

const failures = [];
for (const [name, args] of steps) {
  const result = spawnSync("pnpm", args, { encoding: "utf8", shell: false });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trimEnd();
  if (result.status === 0) {
    console.log(`ok   ${name}`);
    continue;
  }
  console.log(`FAIL ${name}`);
  failures.push([name, output]);
}

if (failures.length === 0) {
  console.log("check passed: lint, typecheck, test");
  process.exit(0);
}

for (const [name, output] of failures) {
  console.log(`\n===== ${name} =====\n${output}`);
}
console.log(`\ncheck failed: ${failures.map(([name]) => name).join(", ")}`);
process.exit(1);
