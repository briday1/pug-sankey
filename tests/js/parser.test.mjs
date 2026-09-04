import test from "node:test";
import assert from "node:assert/strict";
import { parseDiagram } from "../../src/pug_sankey/web/parser.mjs";

const BASIC = `node
  .id sources
  .label Sources
  .color #2563eb
node
  .id electricity
  .label Electricity
flow
  .from sources
  .to electricity
  .value 45
`;

test("parses nodes and flows with values", () => {
  const graph = parseDiagram(BASIC);
  assert.equal(graph.errors.length, 0);
  assert.equal(graph.nodes.length, 2);
  assert.equal(graph.edges.length, 1);
  assert.equal(graph.nodes[0].id, "sources");
  assert.equal(graph.nodes[0].color, "#2563eb");
  assert.equal(graph.edges[0].from, "sources");
  assert.equal(graph.edges[0].to, "electricity");
  assert.equal(graph.edges[0].value, 45);
});

test("returns an empty (not crashing) diagram for empty source", () => {
  const graph = parseDiagram("");
  assert.equal(graph.errors.length, 0);
  assert.equal(graph.nodes.length, 0);
  assert.equal(graph.edges.length, 0);
});

test("flow value is required and must be positive", () => {
  const missing = parseDiagram(`node
  .id a
node
  .id b
flow
  .from a
  .to b
`);
  assert.ok(missing.errors.some((error) => /value/i.test(error)));

  const negative = parseDiagram(`node
  .id a
node
  .id b
flow
  .from a
  .to b
  .value -4
`);
  assert.ok(negative.errors.some((error) => /value/i.test(error)));
});

test("flow endpoints must reference defined nodes", () => {
  const graph = parseDiagram(`node
  .id a
flow
  .from a
  .to missing
  .value 5
`);
  assert.ok(graph.errors.some((error) => /not defined/.test(error)));
});

test("supports arbitrary branching and merging", () => {
  const graph = parseDiagram(`node
  .id in1
node
  .id in2
node
  .id mid
node
  .id out1
node
  .id out2
flow
  .from in1
  .to mid
  .value 10
flow
  .from in2
  .to mid
  .value 5
flow
  .from mid
  .to out1
  .value 9
flow
  .from mid
  .to out2
  .value 6
`);
  assert.equal(graph.errors.length, 0);
  assert.equal(graph.edges.length, 4);
});

test("annotation modes and blend land on figure", () => {
  const graph = parseDiagram(`.node-labels hide
.node-values hide
.flow-labels show
.flow-values hide
.blend 80
node
  .id a
node
  .id b
flow
  .from a
  .to b
  .value 3
`);
  assert.equal(graph.errors.length, 0);
  assert.equal(graph.figure.nodeLabels, false);
  assert.equal(graph.figure.nodeValues, false);
  assert.equal(graph.figure.flowLabels, true);
  assert.equal(graph.figure.flowValues, false);
  assert.equal(graph.figure.blend, 80);
});

test("annotation defaults are sensible", () => {
  const graph = parseDiagram(BASIC);
  assert.equal(graph.figure.nodeLabels, true);
  assert.equal(graph.figure.nodeValues, true);
  assert.equal(graph.figure.flowLabels, false);
  assert.equal(graph.figure.flowValues, true);
  assert.equal(graph.figure.blend, 60);
});

test("per-flow color and label are captured", () => {
  const graph = parseDiagram(`node
  .id a
node
  .id b
flow
  .from a
  .to b
  .value 7
  .color #22c55e
  .label Grid mix
`);
  assert.equal(graph.errors.length, 0);
  assert.equal(graph.edges[0].color, "#22c55e");
  assert.equal(graph.edges[0].label, "Grid mix");
});

test("reusable @flow style applies its color", () => {
  const graph = parseDiagram(`@flow warn
  .color #ef4444
node
  .id a
node
  .id b
flow
  .warn
  .from a
  .to b
  .value 7
`);
  assert.equal(graph.errors.length, 0);
  assert.equal(graph.edges[0].color, "#ef4444");
});

test("node annotations parse above and below", () => {
  const graph = parseDiagram(`node
  .id a
  .label A
  .annotation
    .above
      | Top note
  .annotation
    .below
      | Bottom note
`);
  assert.equal(graph.errors.length, 0);
  const texts = graph.nodes[0].annotations.map((a) => `${a.position}:${a.text}`);
  assert.ok(texts.some((t) => t.startsWith("above:") && t.includes("Top note")));
  assert.ok(texts.some((t) => t.startsWith("below:") && t.includes("Bottom note")));
});

test("nodes and flows carry source line numbers for click-to-select", () => {
  const graph = parseDiagram(BASIC);
  assert.ok(graph.nodes[0].lineNumber > 0);
  assert.ok(graph.edges[0].lineNumber > 0);
  assert.ok(Number.isFinite(graph.edges[0].labelLineNumber));
});

test("stage containers collect nodes without creating groups", () => {
  const graph = parseDiagram(`stage
  node
    .id a
    .label A
  node
    .id b
    .label B
flow
  .from a
  .to b
  .value 4
`);
  assert.equal(graph.errors.length, 0);
  assert.equal(graph.nodes.length, 2);
  assert.equal(graph.groups.length, 0);
});

test("graph keyword is rejected with a helpful error", () => {
  const graph = parseDiagram(`graph
  node
    .id a
`);
  assert.ok(graph.errors.length > 0);
});

test("a node may declare its own .value, used when it agrees with its flows", () => {
  const graph = parseDiagram(`node
  .id a
node
  .id b
  .value 10
flow
  .from a
  .to b
  .value 10
`);
  assert.equal(graph.errors.length, 0);
  const b = graph.nodes.find((node) => node.id === "b");
  assert.equal(b.declaredValue, 10);
  assert.equal(b.hasDeclaredValue, true);
});

test("a node value that conflicts with its flow total is a clear error", () => {
  const graph = parseDiagram(`node
  .id a
node
  .id b
  .value 99
flow
  .from a
  .to b
  .value 10
`);
  assert.ok(graph.errors.some((error) => /value.*does not match/i.test(error)));
});

test("a node value is required to be a positive number", () => {
  const graph = parseDiagram(`node
  .id a
  .value -5
`);
  assert.ok(graph.errors.some((error) => /node value must be a positive number/i.test(error)));
});

test("an isolated node may declare its own value with no flows at all", () => {
  const graph = parseDiagram(`node
  .id a
  .value 25
`);
  assert.equal(graph.errors.length, 0);
  assert.equal(graph.nodes[0].declaredValue, 25);
});
