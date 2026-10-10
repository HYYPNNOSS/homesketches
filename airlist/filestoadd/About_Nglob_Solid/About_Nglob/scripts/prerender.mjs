import fs from "node:fs/promises";
import path from "node:path";
import { render, hydrationBootstrap } from "../.ssr/entry-server.js";

const template = await fs.readFile("dist/index.html", "utf8");
const html = template
  .replace("</head>", hydrationBootstrap() + "</head>")
  .replace('<div id="root"></div>', `<div id="root">${render()}</div>`);
for (const route of ["", "about"]) {
  const output = path.join("dist", route, "index.html");
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, html);
}
console.log("About Nglob: pre-rendered HTML and Solid hydration ready.");
