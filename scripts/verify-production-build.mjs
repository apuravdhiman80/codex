import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { stdout } from "node:process";

const outputDirectory = path.resolve("dist");
const disallowed = [/TEST ADAPTER - NOT LIVE INFERENCE/, /e2eVisionAdapters/, /VITE_E2E_TEST_ADAPTERS/];

async function listJavaScript(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJavaScript(target);
    return /\.(?:m?js)$/.test(entry.name) ? [target] : [];
  }));
  return files.flat();
}

const assets = await listJavaScript(outputDirectory);
for (const asset of assets) {
  const source = await readFile(asset, "utf8");
  const marker = disallowed.find((pattern) => pattern.test(source));
  if (marker) {
    throw new Error(`Production asset ${path.relative(outputDirectory, asset)} contains test-only marker ${marker}.`);
  }
}

stdout.write(`Production bundle check passed (${assets.length} JavaScript assets; no E2E adapter code or label).\n`);
