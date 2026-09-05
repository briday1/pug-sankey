import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DIAGRAM_THEMES } from "../../src/pug_sankey/web/diagram-themes.mjs";
import { parseDiagram } from "../../src/pug_sankey/web/parser.mjs";
import { setDiagramSettings } from "../../src/pug_sankey/web/diagram-settings.mjs";
import { layoutFlowField } from "../../src/pug_sankey/web/flow-layout.mjs";
import { sweepChannel } from "../../src/pug_sankey/web/flow-geometry.mjs";
import { ADDITIONAL_DEMOS } from "../../src/pug_sankey/web/demo-sources.mjs";

test("themes parse at the root and in an explicit canvas; old files stay Smooth", () => {
  assert.equal(DIAGRAM_THEMES.length, 12);
  assert.equal(parseDiagram("").figure.theme, "smooth");
  for (const theme of DIAGRAM_THEMES) for (const source of [`.theme ${theme.id}\n`, `#canvas\n  .theme ${theme.id}\n`]) {
    const parsed = parseDiagram(source);
    assert.deepEqual(parsed.errors, []);
    assert.equal(parsed.figure.theme, theme.id);
  }
  for (const value of ["", "banana", "Wiggly", "wiggly extra"]) assert.ok(parseDiagram(`.theme ${value}`).errors.length);
});
test("settings round-trip theme and appearance without touching node fields", () => {
  for (const source of [".theme angular\nnode\n  .id a\n  .color red\n", "#canvas\n  .theme angular\n  node\n    .id a\n    .color red\n"]) {
    const edited = setDiagramSettings(source, { theme: "wiggly", background: "#18181f", blend: "30", "node-values": "hide" });
    const parsed = parseDiagram(edited);
    assert.deepEqual(parsed.errors, []);
    assert.equal(parsed.figure.theme, "wiggly");
    assert.equal(parsed.figure.blend, 30);
    assert.equal(parsed.figure.nodeValues, false);
    assert.equal(parsed.nodes[0].color, "red");
    assert.equal(edited.match(/\.theme /g).length, 1);
    assert.equal(parseDiagram(setDiagramSettings(edited, { theme: "" })).figure.theme, "smooth");
  }
});
test("themes produce distinct routes, preserve exact endpoints and horizontal mouths", () => {
  const paths = new Set();
  for (const { id } of DIAGRAM_THEMES) {
    const route = sweepChannel(10, 30, 214, 160, 25, id, 108);
    paths.add(route.path);
    assert.deepEqual(route.points[0], [10, 30]);
    assert.deepEqual(route.points.at(-1), [214, 160]);
    assert.ok(Math.abs(route.points[1][1] - 30) < 1e-8);
    assert.ok(Math.abs(route.points.at(-2)[1] - 160) < 1e-8);
    assert.ok(route.points.flat().every(Number.isFinite));
  }
  assert.equal(paths.size, DIAGRAM_THEMES.length);
  const wave = sweepChannel(0, 100, 204, 100, 30, "wiggly", 108);
  assert.ok(wave.points.some(p => p[1] < 95) && wave.points.some(p => p[1] > 105));
  for (let i = 3; i < wave.points.length - 1; i += 3) for (let axis = 0; axis < 2; axis++) {
    assert.ok(Math.abs((wave.points[i][axis] - wave.points[i-1][axis]) - (wave.points[i+1][axis] - wave.points[i][axis])) < 1e-8);
  }
});
test("all demos retain their quantities, positions, topology, and unclipped bounds in every theme", () => {
  for (const demo of ADDITIONAL_DEMOS) {
    const graph = parseDiagram(demo.pug), original = JSON.stringify(graph);
    const baseline = layoutFlowField(graph.nodes, graph.edges);
    for (const { id } of DIAGRAM_THEMES) {
      const layout = layoutFlowField(graph.nodes, graph.edges, { theme: id });
      assert.deepEqual(layout.nodes.map(n => [n.id,n.x,n.y,n.value]), baseline.nodes.map(n => [n.id,n.x,n.y,n.value]));
      assert.deepEqual(layout.edges.map(e => [e.from,e.to,e.value,e.thickness,e.sourceX,e.sourceY,e.targetX,e.targetY]), baseline.edges.map(e => [e.from,e.to,e.value,e.thickness,e.sourceX,e.sourceY,e.targetX,e.targetY]));
      for (const edge of layout.edges) for (const [x,y] of edge.points) {
        assert.ok(x-edge.thickness/2 >= layout.viewX-1e-8 && x+edge.thickness/2 <= layout.viewX+layout.width+1e-8);
        assert.ok(y-edge.thickness/2 >= layout.viewY-1e-8 && y+edge.thickness/2 <= layout.viewY+layout.height+1e-8);
      }
    }
    assert.equal(JSON.stringify(graph), original);
  }
});
test("empty graphs and self-loops work for every theme", () => {
  for (const { id } of DIAGRAM_THEMES) {
    assert.ok(layoutFlowField([], [], { theme: id }).width > 0);
    const layout = layoutFlowField([{ id: "a" }], [{ from: "a", to: "a", value: 20 }], { theme: id });
    assert.equal(layout.edges.length, 1);
    assert.ok(!layout.edges[0].path.includes("NaN"));
  }
  assert.throws(() => layoutFlowField([], [], { theme: "unknown" }), /Unknown diagram theme/);
});

test("added styles have their own geometric signatures", () => {
  const route = id => sweepChannel(0, 100, 240, 180, 20, id, 80);
  assert.ok(route("zigzag").path.includes(" L "));
  const stairs = route("staircase").points;
  assert.equal(stairs.slice(1).filter((p,i) => p[0] === stairs[i][0] && p[1] !== stairs[i][1]).length, 3);
  const flat = id => sweepChannel(0, 100, 240, 100, 20, id, 80).points;
  assert.ok(Math.min(...flat("sail").map(p => p[1])) < 55);
  assert.ok(Math.max(...flat("dip").map(p => p[1])) > 145);
  assert.equal(route("s-bend").points.length, 4);
});
test("Diagram settings combines shape and existing appearance controls", () => {
  const base = new URL("../../src/pug_sankey/web/", import.meta.url);
  const html = readFileSync(new URL("index.html", base), "utf8"), app = readFileSync(new URL("app.mjs", base), "utf8");
  assert.match(html, /<h2>Diagram settings<\/h2>/);
  assert.doesNotMatch(html, /Diagram labels &amp; values/);
  for (const field of ["theme","background","blend","node-labels","node-values","flow-labels","flow-values","label-color","font"]) assert.ok(html.includes(`name="${field}"`));
  assert.match(app, /"theme": "theme"/);
  assert.match(app, /diagramThemeSelect\.replaceChildren\(\.\.\.DIAGRAM_THEMES/);
});
