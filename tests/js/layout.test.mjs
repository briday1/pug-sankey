import test from "node:test";
import assert from "node:assert/strict";
import { parseDiagram } from "../../src/pug_sankey/web/parser.mjs";
import { cleanupAlignmentOffsets, cleanupGraphOffsets, DEFAULT_LAYOUT, independentMoveOffsets, inheritedFlowOffsets, layoutDiagram } from "../../src/pug_sankey/web/layout.mjs";

function makeLayout(source) {
  const graph = parseDiagram(source);
  assert.equal(graph.errors.length, 0, graph.errors.join("\n"));
  return layoutDiagram(graph.nodes, graph.edges);
}

test("assigns nodes to topological columns", () => {
  const layout = makeLayout(`node
  .id a
node
  .id b
node
  .id c
flow
  .from a
  .to b
  .value 10
flow
  .from b
  .to c
  .value 10
`);
  const col = Object.fromEntries(layout.nodes.map((node) => [node.id, node.column]));
  assert.equal(col.a, 0);
  assert.equal(col.b, 1);
  assert.equal(col.c, 2);
});

test("node heights are proportional to flow value", () => {
  const layout = makeLayout(`node
  .id a
node
  .id big
node
  .id small
flow
  .from a
  .to big
  .value 80
flow
  .from a
  .to small
  .value 20
`);
  const big = layout.nodes.find((node) => node.id === "big");
  const small = layout.nodes.find((node) => node.id === "small");
  assert.ok(big.height > small.height, "bigger value should mean a taller bar");
  // 4:1 ratio should be preserved (within min-height clamping).
  const ratio = big.height / small.height;
  assert.ok(ratio > 3, `expected ~4x height ratio, got ${ratio}`);
});

test("ribbon thickness is proportional to value", () => {
  const layout = makeLayout(`node
  .id a
node
  .id b
node
  .id c
flow
  .from a
  .to b
  .value 60
flow
  .from a
  .to c
  .value 30
`);
  const thick = layout.edges.find((edge) => edge.to === "b");
  const thin = layout.edges.find((edge) => edge.to === "c");
  assert.ok(Math.abs(thick.thickness / thin.thickness - 2) < 0.01, "thickness should follow value ratio");
});

test("merged node height is the sum of incoming flows", () => {
  const layout = makeLayout(`node
  .id a
node
  .id b
node
  .id hub
flow
  .from a
  .to hub
  .value 40
flow
  .from b
  .to hub
  .value 25
`);
  const hub = layout.nodes.find((node) => node.id === "hub");
  assert.equal(hub.value, 65);
});

test("cycles do not break the layout (feedback loop)", () => {
  const layout = makeLayout(`node
  .id a
node
  .id b
node
  .id c
flow
  .from a
  .to b
  .value 10
flow
  .from b
  .to c
  .value 10
flow
  .from c
  .to a
  .value 4
`);
  assert.ok(layout.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y) && Number.isFinite(node.height)));
});

test("empty source yields a non-crashing empty layout", () => {
  const layout = makeLayout("");
  assert.equal(layout.nodes.length, 0);
  assert.ok(layout.width > 0 && layout.height > 0);
});

test("hidden nodes are excluded from the layout", () => {
  const layout = makeLayout(`node
  .id a
node
  .id b
  .hidden
flow
  .from a
  .to b
  .value 5
`);
  assert.equal(layout.nodes.length, 1);
  assert.equal(layout.nodes[0].id, "a");
});

test("cleanupAlignmentOffsets returns an array and snaps tiny offsets", () => {
  const graph = parseDiagram(`node
  .id a
  .label A
node
  .id b
flow
  .from a
  .to b
  .value 3
`);
  const nodes = graph.nodes.map((node) => ({ ...node, offsetX: 1, offsetY: 40 }));
  const changes = cleanupAlignmentOffsets(nodes, graph.edges);
  assert.ok(Array.isArray(changes));
  const a = changes.find((change) => change.id === "a");
  assert.equal(a.offsetX, 0);
  assert.equal(a.offsetY, 40);
});

test("cleanupGraphOffsets returns an empty array (no graph frames)", () => {
  assert.deepEqual(cleanupGraphOffsets([], [], []), []);
});

test("independentMoveOffsets only moves selected nodes", () => {
  const graph = parseDiagram(`node
  .id a
node
  .id b
flow
  .from a
  .to b
  .value 3
`);
  const moved = independentMoveOffsets(graph.nodes, graph.edges, ["a"], 10, 20);
  assert.equal(moved.length, 1);
  assert.equal(moved[0].id, "a");
  assert.equal(moved[0].offsetX, 10);
  assert.equal(moved[0].offsetY, 20);
});

test("inheritedFlowOffsets returns a map keyed by node id", () => {
  const graph = parseDiagram(`node
  .id a
node
  .id b
flow
  .from a
  .to b
  .value 3
`);
  const offsets = inheritedFlowOffsets(graph.nodes, graph.edges);
  assert.ok(offsets instanceof Map);
  assert.ok(offsets.has("a") && offsets.has("b"));
});
