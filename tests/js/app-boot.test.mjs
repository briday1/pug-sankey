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

test("no Clean Up button and no canvas dragging", () => {
  assert.ok(!html.includes("cleanup-diagram"), "Clean Up button should be removed");
  assert.ok(!/onElementMove/.test(app), "app should not wire element dragging");
});

test("canvas still edits color/label/value via the inspector", () => {
  assert.ok(/data-node-field="color"/.test(app) || /data-node-field=\\"color/.test(app) || app.includes('data-node-field="color"'), "node color field present");
  assert.ok(app.includes('data-node-field="label"'), "node label field present");
  assert.ok(app.includes('data-flow-field="value"'), "flow value field present");
  assert.ok(app.includes('data-flow-field="color"'), "flow color field present");
});
