import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const lambdaRoot = path.join(projectRoot, "build", "lambda");

const copyDirectory = async (source, target) => {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
      continue;
    }

    await fs.copyFile(sourcePath, targetPath);
  }
};

const runCommand = (command, args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`));
    });
  });

await fs.rm(lambdaRoot, { recursive: true, force: true });
await fs.mkdir(lambdaRoot, { recursive: true });

await fs.copyFile(path.join(projectRoot, "package.json"), path.join(lambdaRoot, "package.json"));
await fs.copyFile(
  path.join(projectRoot, "package-lock.json"),
  path.join(lambdaRoot, "package-lock.json"),
);
await copyDirectory(path.join(projectRoot, "dist"), path.join(lambdaRoot, "dist"));

await runCommand("npm", ["ci", "--omit=dev"], lambdaRoot);
