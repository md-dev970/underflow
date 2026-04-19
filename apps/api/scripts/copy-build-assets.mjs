import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const assetCopies = [
  {
    source: path.join(projectRoot, "src", "db", "migrations"),
    target: path.join(projectRoot, "dist", "db", "migrations"),
  },
];

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

for (const asset of assetCopies) {
  await copyDirectory(asset.source, asset.target);
}
