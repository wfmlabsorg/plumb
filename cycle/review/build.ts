/** Builds dist/review.html (load a packet by file) and, given a packet path, a copy with the packet embedded. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const dir = import.meta.dir;
import { page } from "./page";
const r = await Bun.build({ entrypoints: [join(dir, "src", "app.ts")], target: "browser", minify: true, format: "iife" });
if (!r.success) throw new Error(r.logs.map(String).join("\n"));
const js = (await r.outputs[0]!.text()).replace(/<\/script/gi, "<\\/script");
mkdirSync(join(dir, "dist"), { recursive: true }); writeFileSync(join(dir, "dist", "review.html"), page(js));
const [packetPath, outPath] = process.argv.slice(2);
if (packetPath && outPath) writeFileSync(outPath, page(js, readFileSync(packetPath, "utf8")));
console.log(`built dist/review.html${outPath ? ` and ${outPath}` : ""}`);
