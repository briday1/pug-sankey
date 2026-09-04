import assert from "node:assert/strict";
import test from "node:test";

import { parseDiagram } from "../../src/pugflow/web/parser.mjs";
import { compileStyleSheet, pugDefinitionsToStyleSheet } from "../../src/pugflow/web/style-sheet.mjs";

test("compiles CSS-shaped reusable definitions", () => {
  const css = `
    @node card { shape: rounded; fill: #123456; color: white; }
    @flow warning { color: #dc2626; stroke-style: dashed; }
    @annotation note { color: #2563eb; }
  `;
  const compiled = compileStyleSheet(css);
  assert.deepEqual(compiled.errors, []);
  assert.match(compiled.source, /@node card\n  \.shape rounded/);

  const graph = parseDiagram("#canvas\n  graph\n    .card\n      .id root\n      .label Root", css);
  assert.deepEqual(graph.errors, []);
  assert.equal(graph.nodes[0].style.fill, "#123456");
  assert.equal(graph.nodes[0].lineNumber, 5);
});

test("reports malformed external style rules", () => {
  assert.match(compileStyleSheet("@node card { fill #fff; }").errors[0], /property: value/);
  assert.match(compileStyleSheet("card { fill: red; }").errors[0], /expected an @node/);
});

test("moves Pug definition preludes into active CSS rules", () => {
  const css = pugDefinitionsToStyleSheet("@node card\n  .shape rounded\n  .fill #123456\n\n@flow path\n  .color red");
  assert.match(css, /@node card \{\n  shape: rounded;\n  fill: #123456;/);
  assert.match(css, /@flow path \{\n  color: red;/);
  const graph = parseDiagram("#canvas\n  graph\n    .card\n      .label Root", css);
  assert.deepEqual(graph.errors, []);
  assert.equal(graph.nodes[0].style.fill, "#123456");
});
