import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { parseDiagram } from "../../src/pug_sankey/web/parser.mjs";
import { layoutDiagram } from "../../src/pug_sankey/web/layout.mjs";
import { ADDITIONAL_DEMOS } from "../../src/pug_sankey/web/demo-sources.mjs";

const EXAMPLES_DIR = new URL("../../examples/", import.meta.url);

test("every shipped example parses and lays out cleanly", () => {
  const files = readdirSync(EXAMPLES_DIR).filter((name) => name.endsWith(".pug"));
  assert.ok(files.length >= 3, "expected several .pug examples");
  for (const name of files) {
    const source = readFileSync(new URL(name, EXAMPLES_DIR), "utf8");
    const graph = parseDiagram(source);
    assert.equal(graph.errors.length, 0, `${name}: ${graph.errors.join("; ")}`);
    assert.ok(graph.nodes.length > 0, `${name} should define nodes`);
    assert.ok(graph.edges.length > 0, `${name} should define flows`);
    const layout = layoutDiagram(graph.nodes, graph.edges);
    assert.ok(layout.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.height)), `${name} layout should be finite`);
  }
});

test("all demos parse, lay out, and have values", () => {
  assert.equal(ADDITIONAL_DEMOS.length, 8, "expected 8 additional demos");
  for (const demo of ADDITIONAL_DEMOS) {
    assert.ok(demo.name, "demo needs a name");
    const graph = parseDiagram(demo.pug, demo.css ?? "");
    assert.equal(graph.errors.length, 0, `${demo.name}: ${graph.errors.join("; ")}`);
    assert.ok(graph.edges.length > 0, `${demo.name} should have flows`);
    assert.ok(graph.edges.every((edge) => edge.value > 0), `${demo.name} flows must carry values`);
    const layout = layoutDiagram(graph.nodes, graph.edges);
    assert.ok(layout.width > 0 && layout.height > 0, `${demo.name} should lay out`);
  }
});

test("at least one demo exercises flow labels and feedback", () => {
  const all = ADDITIONAL_DEMOS.map((demo) => demo.pug).join("\n\n");
  assert.match(all, /\.flow-labels show/, "expected a demo that shows flow labels");
});

test("showcase docs page exists", () => {
  const docs = readFileSync(new URL("../../src/pug_sankey/web/docs.html", import.meta.url), "utf8");
  assert.match(docs, /^<!doctype html>/i);
});
