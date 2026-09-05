import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const web = new URL("../../src/pug_sankey/web/", import.meta.url);
const html = readFileSync(new URL("index.html", web), "utf8");
const app = readFileSync(new URL("app.mjs", web), "utf8");
const startup = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const controller = app.slice(app.indexOf('const themeButton ='), app.indexOf('attachVimMode(source'));

function setup(saved, dark = false, blocked = false) {
  const dataset = {}, listeners = {}, writes = [];
  const media = { matches: dark, addEventListener: (name, fn) => { listeners.system = fn; } };
  const label = {}, button = { querySelector: () => ({}), setAttribute: (name, value) => { button[name] = value; }, addEventListener: (name, fn) => { listeners.click = fn; } };
  const storage = { getItem: () => { if (blocked) throw Error("blocked"); return saved; }, setItem: (key, value) => { if (blocked) throw Error("blocked"); writes.push(value); } };
  const context = { document: { documentElement: { dataset } }, localStorage: storage, matchMedia: () => media, $: id => id === "#theme" ? button : label };
  runInNewContext(startup, context);
  const firstPaint = dataset.theme;
  runInNewContext(controller, context);
  return { dataset, label, button, writes, listeners, media, firstPaint };
}
test("fresh launches follow the system before first paint, without persisting an implicit choice", () => {
  for (const dark of [false, true]) {
    const ui = setup(null, dark);
    assert.equal(ui.firstPaint, dark ? "dark" : "light");
    assert.equal(ui.dataset.themePreference, "system");
    assert.equal(ui.label.textContent, dark ? "Dark" : "Light");
    assert.deepEqual(ui.writes, []);
    ui.media.matches = !dark; ui.listeners.system();
    assert.equal(ui.dataset.theme, dark ? "light" : "dark");
    assert.equal(ui.label.textContent, dark ? "Light" : "Dark");
  }
});
test("saved choices are honored; only explicit changes persist and leave system-following mode", () => {
  const ui = setup("light", true);
  assert.equal(ui.firstPaint, "light");
  ui.listeners.system(); assert.equal(ui.dataset.theme, "light");
  ui.listeners.click(); assert.equal(ui.dataset.themePreference, "dark");
  ui.listeners.click(); assert.equal(ui.dataset.themePreference, "light");
  assert.deepEqual(ui.writes, ["dark", "light"]);
});
test("legacy system, invalid, or inaccessible storage still permits two-way switching", () => {
  for (const ui of [setup("system", true), setup("invalid", true), setup(null, true, true)]) {
    assert.equal(ui.dataset.themePreference, "system");
    ui.listeners.click(); assert.equal(ui.dataset.theme, "light");
    ui.listeners.click(); assert.equal(ui.dataset.theme, "dark");
    ui.listeners.click(); assert.equal(ui.label.textContent, "Light");
  }
});

test("first click always switches away from the resolved system theme, then stays explicit", () => {
  for (const dark of [false, true]) {
    const ui = setup(null, dark);
    const opposite = dark ? "light" : "dark";
    assert.equal(ui.button["aria-label"], `Switch to ${opposite} mode`);
    ui.listeners.click();
    assert.equal(ui.dataset.theme, opposite);
    assert.equal(ui.dataset.themePreference, opposite);
    assert.deepEqual(ui.writes, [opposite]);
    ui.listeners.system();
    assert.equal(ui.dataset.theme, opposite);
    ui.listeners.click();
    assert.equal(ui.dataset.theme, dark ? "dark" : "light");
    assert.equal(setup(ui.writes.at(-1), !dark).firstPaint, ui.dataset.theme);
  }
});
