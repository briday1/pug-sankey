import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const WEB = new URL("../../src/pug_sankey/web/", import.meta.url);
const app = readFileSync(new URL("app.mjs", WEB), "utf8");
const html = readFileSync(new URL("index.html", WEB), "utf8");

// IDs the app builds dynamically inside the inspector at runtime.
const DYNAMIC_IDS = new Set(["insp-add-flow", "insp-add-annotation"]);

test("every element id app.mjs looks up exists in index.html", () => {
  const refs = new Set();
  for (const match of app.matchAll(/\$\("#([\w-]+)"\)/g)) refs.add(match[1]);
  for (const match of app.matchAll(/getElementById\("([\w-]+)"\)/g)) refs.add(match[1]);
  const missing = [...refs].filter((id) => !DYNAMIC_IDS.has(id) && !html.includes(`id="${id}"`));
  assert.deepEqual(missing, [], `app.mjs references ids missing from index.html: ${missing.join(", ")}`);
});

test("the editor shell keeps the identical source + canvas sections", () => {
  for (const marker of ["id=\"source-panel\"", "class=\"preview\"", "id=\"diagram\"", "id=\"canvas-inspector\"", "layers-panel"]) {
    assert.ok(html.includes(marker), `index.html should keep ${marker}`);
  }
});

test("toolbar dropdowns share a native exclusive group, separate from object panels", () => {
  const details = [...html.matchAll(/<details\b[^>]*>/g)].map(match => match[0]);
  const menus = details.filter(tag => /class="[^"]*\btoolbar-menu\b/.test(tag));
  assert.equal(menus.length, 4, "About, Project, New, and Settings menus are grouped");
  for (const menu of menus) assert.match(menu, /\bname="application-menu"/, "opening a toolbar menu closes the previous one");
  for (const panel of details.filter(tag => !menus.includes(tag))) {
    assert.doesNotMatch(panel, /\bname="application-menu"/, "object panels remain independently expandable");
  }
});

test("no Clean Up button and no canvas dragging", () => {
  assert.ok(!html.includes("cleanup-diagram"), "Clean Up button should be removed");
  assert.ok(!/onElementMove/.test(app), "app should not wire element dragging");
});

test("New only creates nodes and flows in the single diagram", () => {
  const menu = html.match(/<details\b[^>]*\bnew-menu\b[^>]*>([\s\S]*?)<\/details>/)?.[1];
  assert.ok(menu);
  assert.deepEqual([...menu.matchAll(/<button\b[^>]*id="([^"]+)"/g)].map(match => match[1]), ["add-node", "add-flow"]);
  for (const removed of ["add-diagram", "add-image", "node-image-file", "graph-browser-select", "graph-count", "layers-list"]) {
    assert.ok(!html.includes(`id="${removed}"`), `${removed} is not exposed`);
    assert.ok(!app.includes(`#${removed}`), `${removed} has no leftover event wiring`);
  }
});

test("the objects panel contains only nodes and flows, while image exports remain available", () => {
  const objects = html.match(/<aside\b[^>]*id="layers-panel"[^>]*>([\s\S]*?)<\/aside>/)?.[1];
  assert.ok(objects);
  assert.doesNotMatch(objects, /<select\b|Graphs|Nodes and images|selected graph/);
  assert.match(objects, /id="nodes-list"/);
  assert.match(objects, /id="flows-list"/);
  assert.equal([...objects.matchAll(/<details\b/g)].length, 2);
  for (const id of ["open-copy-export", "open-save-export", "copy-export-format", "save-export-format"]) assert.ok(html.includes(`id="${id}"`));
});

test("canvas still edits color/label/value via the inspector", () => {
  assert.ok(/data-node-field="color"/.test(app) || /data-node-field=\\"color/.test(app) || app.includes('data-node-field="color"'), "node color field present");
  assert.ok(app.includes('data-node-field="label"'), "node label field present");
  assert.ok(app.includes('data-flow-field="value"'), "flow value field present");
  assert.ok(app.includes('data-flow-field="color"'), "flow color field present");
});

test("app fetches the CLI-provided project file (--gui)", () => {
  assert.ok(app.includes('launchParams.get("project") === "1"'), "reads the project param");
  assert.ok(app.includes('fetch("/__project.pug")'), "fetches the project pug");
  assert.ok(!app.includes('fetch("/__project.css")'), "uses Pug as the only source document");
});

test("app honors the --vim launch flag", () => {
  assert.ok(app.includes('launchParams.get("vim") === "1"'), "reads the vim param");
  assert.ok(app.includes('attachVimMode('), "attaches vim mode");
});
