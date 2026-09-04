import test from "node:test";
import assert from "node:assert/strict";
import { appendDiagramNode, appendFlowReference, appendNodeAnnotation, indentSourceSelection, renameNodeReferences, setNodeField, setStructuralField } from "../../src/pug_sankey/web/editor-source.mjs";
import { parseDiagram } from "../../src/pug_sankey/web/parser.mjs";

test("appendDiagramNode emits a Sankey node block", () => {
  const out = appendDiagramNode("", { id: "sources", label: "Sources", color: "#2563eb" });
  assert.match(out, /node\n/);
  assert.match(out, /\.id sources/);
  assert.match(out, /\.label Sources/);
  assert.match(out, /\.color #2563eb/);
  const graph = parseDiagram(out);
  assert.equal(graph.errors.length, 0);
  assert.equal(graph.nodes[0].id, "sources");
});

test("appendFlowReference emits a flow with from/to/value at root", () => {
  const withNode = appendDiagramNode("", { id: "a", label: "A" })
    + "\n" + appendDiagramNode("", { id: "b", label: "B" });
  const out = appendFlowReference(withNode, 0, { from: "a", to: "b", value: 12, color: "#22c55e" });
  assert.match(out, /flow\n/);
  assert.match(out, /\.from a/);
  assert.match(out, /\.to b/);
  assert.match(out, /\.value 12/);
  const graph = parseDiagram(out);
  assert.equal(graph.errors.length, 0);
  assert.equal(graph.edges[0].value, 12);
});

test("renameNodeReferences updates flow endpoints", () => {
  const source = `node
  .id old
  .label Node
node
  .id other
flow
  .from old
  .to other
  .value 5
flow
  .from other
  .to old
  .value 3
`;
  const out = renameNodeReferences(source, "old", "renamed");
  assert.match(out, /\.id renamed/);
  assert.match(out, /\.from renamed/);
  assert.match(out, /\.to renamed/);
  const graph = parseDiagram(out);
  assert.equal(graph.errors.length, 0);
  assert.ok(graph.nodes.some((node) => node.id === "renamed"));
});

test("setNodeField updates a node property", () => {
  const source = `node
  .id a
  .label A
`;
  const graph = parseDiagram(source);
  const out = setNodeField(source, graph.nodes[0].lineNumber, "color", "#123456");
  assert.match(out, /\.color #123456/);
});

test("setStructuralField updates a flow value", () => {
  const source = `node
  .id a
node
  .id b
flow
  .from a
  .to b
  .value 5
`;
  const graph = parseDiagram(source);
  const out = setStructuralField(source, graph.edges[0].lineNumber, "value", "99");
  assert.match(out, /\.value 99/);
  assert.equal(parseDiagram(out).edges[0].value, 99);
});

test("indentSourceSelection indents and outdents", () => {
  const indented = indentSourceSelection("node\n  .id a", 0, 5, false);
  assert.ok(indented.value.includes("  node"));
});

test("appendNodeAnnotation adds an annotation group", () => {
  const source = `node
  .id a
  .label A
`;
  const graph = parseDiagram(source);
  const out = appendNodeAnnotation(source, graph.nodes[0].lineNumber, { position: "below", text: "Note" });
  const reparsed = parseDiagram(out);
  assert.equal(reparsed.errors.length, 0);
  assert.ok(reparsed.nodes[0].annotations.some((a) => a.position === "below" && a.text === "Note"));
});
