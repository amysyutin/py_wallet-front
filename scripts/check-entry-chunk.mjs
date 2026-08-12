import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { stdout } from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = path.join(projectRoot, "dist");
const indexHtml = await readFile(path.join(distDirectory, "index.html"), "utf8");
const entryMatch = indexHtml.match(/<script[^>]+src="([^"]+\.js)"/);

if (!entryMatch) {
  throw new Error("Unable to find the JavaScript entry chunk in dist/index.html");
}

const entryPath = path.join(distDirectory, entryMatch[1].replace(/^\//, ""));
const entryBytes = (await stat(entryPath)).size;
const javascriptChunks = (await readdir(path.join(distDirectory, "assets"))).filter(
  (fileName) => fileName.endsWith(".js"),
);
const maxEntryBytes = 500_000;

if (javascriptChunks.length < 2) {
  throw new Error("Expected route code splitting to produce multiple JavaScript chunks");
}

if (entryBytes > maxEntryBytes) {
  throw new Error(
    `Entry chunk is ${entryBytes} bytes; expected at most ${maxEntryBytes} bytes`,
  );
}

stdout.write(
  `Entry chunk policy passed: ${entryBytes} bytes across ${javascriptChunks.length} JavaScript chunks\n`,
);
