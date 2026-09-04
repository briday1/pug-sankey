import test from "node:test";
import assert from "node:assert/strict";
import {
  appendDiagramNode,
  appendFlowAnnotation,
  appendFlowReference,
  appendGraphImage,
  appendGraphNode,
  appendNodeAnnotation,
  indentSourceSelection,
  moveDeclarationToContainer,
  moveNodeToGraph,
  removeConnectionLabel,
  removeNodeAnnotation,
  removeNodeDeclaration,
  removeNodeReferences,
  removeNodeField,
  renameNodeReferences,
  setAnnotationOffsetField,
  setAnnotationPosition,
  setAnnotationText,
  setGraphGeometry,
  setNodeAnnotationField,
  setNodeAnnotationText,
  setNodeField,
  setNodeGeometry,
  setImageGeometry,
  setNodeOffsetField,
  setNodeType,
  setStructuralField,
  setStructuralLineType,
  setStructuralOffsetField,
} from "../../src/pugflow/web/editor-source.mjs";
import { parseDiagram } from "../../src/pugflow/web/parser.mjs";

const FLAT_GRAPH = "#canvas\n  graph\n    .id main\n    node\n      .id root\n      .label Root\n    node\n      .id child\n      .label Child\n    flow\n      .from root\n      .to child\n      .label request";

test("adds a graph to blank source without emitting a canvas declaration", () => {
  const updated = appendDiagramNode("", {
    diagramId: "main", id: "root", label: "Root",
  });
  assert.equal(updated, "graph\n  .id main\n  node\n    .id root\n    .label Root");
  assert.doesNotMatch(updated, /#canvas|#diagram/);
  assert.deepEqual(parseDiagram(updated).errors, []);
});

test("adds and moves cross-graph flows at the implied canvas root", () => {
  const source = "graph\n  .id one\n  node\n    .id first\n    .label First\ngraph\n  .id two\n  node\n    .id second\n    .label Second";
  const appended = appendFlowReference(source, 0, { from: "first", to: "second" });
  assert.match(appended, /\n\nflow\n  \.from first\n  \.to second/);
  assert.deepEqual(parseDiagram(appended).errors, []);

  const nested = `${source}\n  flow\n    .from first\n    .to second`;
  const flow = parseDiagram(nested).edges[0];
  const moved = moveDeclarationToContainer(nested, flow.lineNumber, 0);
  assert.match(moved, /\n\nflow\n  \.from first\n  \.to second$/);
  assert.deepEqual(parseDiagram(moved).errors, []);
});

test("edits inspector-backed node properties", () => {
  let edited = setNodeField(FLAT_GRAPH, 6, "fill", "#123456");
  edited = setNodeOffsetField(edited, parseDiagram(edited).nodes[0].lineNumber, "offset", 12.26, -4.04);
  edited = removeNodeField(edited, parseDiagram(edited).nodes[0].lineNumber, "fill");
  edited = setNodeType(edited, parseDiagram(edited).nodes[0].lineNumber, "custom_node", ["custom_node"]);
  assert.ok(edited.includes("\n    node\n      .custom_node\n      .id root\n      .offset (12.3, -4)\n      .label Root"));
  assert.doesNotMatch(edited, /\.fill #123456/);
  const cleared = setNodeType(edited, parseDiagram(edited).nodes[0].lineNumber, "node", ["custom_node"]);
  assert.ok(cleared.includes("\n    node\n      .id root"));
  assert.doesNotMatch(cleared, /\.custom_node/);
});

test("renames node IDs in explicit flow endpoints", () => {
  const renamed = renameNodeReferences(FLAT_GRAPH, "root", "start");
  assert.match(renamed, /\.from start/);
  assert.doesNotMatch(renamed, /\.from root/);
});

test("writes direct flow fields and label offsets", () => {
  let updated = setStructuralField(FLAT_GRAPH, 10, "width", "3");
  updated = setStructuralOffsetField(updated, 10, 5, 6);
  assert.match(updated, /    flow\n      \.label-offset \(5, 6\)\n      \.width 3\n      \.from root/);
  assert.deepEqual(parseDiagram(updated).errors, []);
});

test("switches reusable flow types while clearing local appearance overrides", () => {
  const source = "@flow warning\n  .color red\n@flow success\n  .color green\n" + FLAT_GRAPH.replace("      .from root", "      .warning\n      .color blue\n      .outline white\n      .outline-width 2\n      .roundness 4\n      .arrow-height 12\n      .arrow-head-width 20\n      .shadow-color black\n      .font-size 15\n      .from root");
  const parsed = parseDiagram(source);
  assert.deepEqual(parsed.errors, []);
  const updated = setStructuralLineType(source, parsed.edges[0].lineNumber, "success", ["warning", "success"]);
  assert.match(updated, /    flow\n      \.success\n      \.from root/);
  assert.doesNotMatch(updated, /      \.warning|      \.color blue|      \.outline |      \.outline-width|      \.roundness|      \.arrow-height|      \.arrow-head-width|      \.shadow-color|      \.font-size/);
});

test("removes a direct flow label", () => {
  const parsed = parseDiagram(FLAT_GRAPH);
  const updated = removeConnectionLabel(FLAT_GRAPH, parsed.edges[0].lineNumber);
  assert.doesNotMatch(updated, /\.label request/);
  assert.equal(parseDiagram(updated).edges[0].label, "");
});

test("adds independent nodes and explicit flows to a graph", () => {
  const graphLine = 2;
  const withNode = appendGraphNode(FLAT_GRAPH, graphLine, { nodeType: "node", id: "third", label: "Third" });
  const withFlow = appendFlowReference(withNode, graphLine, { from: "child", to: "third", direction: "down", lineType: "warning" });
  assert.match(withFlow, /    node\n      \.id third\n      \.label Third\n    flow\n      \.from child\n      \.to third\n      \.from-direction down\n      \.to-direction down\n      \.warning/);
});

test("adds a standalone sibling graph", () => {
  const updated = appendDiagramNode(FLAT_GRAPH, {
    diagramId: "second", diagramPlacement: "right", diagramRelativeTo: "main", id: "other", label: "Other",
  });

  test("moves nodes and flow declarations between graph scopes", () => {
    const source = `${FLAT_GRAPH}\n  graph\n    .id second\n    node\n      .id other\n      .label Other`;
    const parsed = parseDiagram(source);
    const child = parsed.nodes.find((node) => node.id === "child");
    const second = parsed.groups.find((group) => group.id === "second");
    const withMovedNode = moveNodeToGraph(source, child.lineNumber, second.lineNumber);
    const moved = parseDiagram(withMovedNode);
    assert.ok(moved.groups.find((group) => group.id === "second").nodeIds.includes("child"));
    const flow = moved.edges.find((edge) => edge.from === "root" && edge.to === "child");
    const canvasLine = withMovedNode.split("\n").findIndex((line) => line.trim() === "#canvas") + 1;
    const withMovedFlow = moveDeclarationToContainer(withMovedNode, flow.lineNumber, canvasLine);
    const final = parseDiagram(withMovedFlow);
    assert.deepEqual(final.errors, []);
    assert.equal(final.edges[0].graphId, null);
  });
  const parsed = parseDiagram(updated);
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.groups.map((group) => group.id), ["main", "second"]);
  assert.deepEqual([parsed.groups[1].placement, parsed.groups[1].relativeTo], ["right", "main"]);
  assert.match(updated, /  graph\n    \.id second\n    \.placement right\n    \.relative-to main/);
});

test("removes every flow touching a deleted node", () => {
  const withoutReferences = removeNodeReferences(FLAT_GRAPH, "child");
  const child = parseDiagram(withoutReferences).nodes.find((node) => node.id === "child");
  const updated = removeNodeDeclaration(withoutReferences, child.lineNumber);
  const parsed = parseDiagram(updated);
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.nodes.map((node) => node.id), ["root"]);
  assert.equal(parsed.edges.length, 0);
});

test("edits repeated node annotations independently", () => {
  const first = appendNodeAnnotation(FLAT_GRAPH, 6, { position: "above", text: "First" });
  const node = parseDiagram(first).nodes.find((item) => item.id === "root");
  const second = appendNodeAnnotation(first, node.lineNumber, { position: "above", text: "Second" });
  const annotations = parseDiagram(second).nodes.find((item) => item.id === "root").annotations;
  let updated = setAnnotationText(second, annotations[1].lineNumber, "Changed");
  updated = setAnnotationPosition(updated, parseDiagram(updated).nodes[0].annotations[1].lineNumber, "below");
  updated = setAnnotationOffsetField(updated, parseDiagram(updated).nodes[0].annotations[1].lineNumber, 3, -2);
  const result = parseDiagram(updated).nodes[0].annotations;
  assert.deepEqual(result.map(({ position, text }) => ({ position, text })), [
    { position: "above", text: "First" },
    { position: "below", text: "Changed" },
  ]);
  assert.deepEqual([result[1].offsetX, result[1].offsetY], [3, -2]);
  const removed = removeNodeAnnotation(updated, result[0].lineNumber);
  assert.deepEqual(parseDiagram(removed).nodes[0].annotations.map((item) => item.text), ["Changed"]);
});

test("adds and edits repeated direct flow annotations", () => {
  const flow = parseDiagram(FLAT_GRAPH).edges[0];
  let updated = appendFlowAnnotation(FLAT_GRAPH, flow.lineNumber, { text: "First", fontStyle: "italic" });
  updated = appendFlowAnnotation(updated, parseDiagram(updated).edges[0].lineNumber, { text: "Second" });
  let annotations = parseDiagram(updated).edges[0].annotations.filter((annotation) => !annotation.legacy);
  assert.deepEqual(annotations.map((annotation) => annotation.text), ["First", "Second"]);
  assert.equal(annotations[0].fontStyle, "italic");
  updated = setAnnotationText(updated, annotations[1].lineNumber, "Changed");
  annotations = parseDiagram(updated).edges[0].annotations.filter((annotation) => !annotation.legacy);
  assert.deepEqual(annotations.map((annotation) => annotation.text), ["First", "Changed"]);
});

test("creates missing annotation text and style fields", () => {
  let updated = setNodeAnnotationText(FLAT_GRAPH, 6, "above", "New note");
  updated = setNodeAnnotationField(updated, parseDiagram(updated).nodes[0].lineNumber, "above", "font-style", "italic");
  const annotation = parseDiagram(updated).nodes[0].annotations[0];
  assert.equal(annotation.text, "New note");
  assert.equal(annotation.fontStyle, "italic");
});

test("creates node annotations with editable text borders", () => {
  const updated = appendNodeAnnotation(FLAT_GRAPH, 6, {
    position: "below", text: "Outlined", textOutline: "rebeccapurple", textOutlineWidth: "1.5",
  });
  const annotation = parseDiagram(updated).nodes[0].annotations[0];
  assert.equal(annotation.textOutline, "rebeccapurple");
  assert.equal(annotation.textOutlineWidth, 1.5);
});

test("adds and updates standalone image geometry", () => {
  const source = appendGraphImage(FLAT_GRAPH, 2, { id: "photo", source: "photo.png", width: 40, height: 40 });
  const image = parseDiagram(source).nodes.find((node) => node.id === "photo");
  const updated = setImageGeometry(source, image.lineNumber, 72, 55, 8.25, -4.04);
  assert.match(updated, /\.width 72/);
  assert.match(updated, /\.height 55/);
  assert.match(updated, /\.offset \(8\.3, -4\)/);
  assert.equal(parseDiagram(updated).nodes.find((node) => node.id === "photo").kind, "image");
});

test("writes dragged image offsets inside the image declaration", () => {
  const source = appendGraphImage(FLAT_GRAPH, 2, { id: "photo", source: "photo.png", width: 40, height: 40 });
  const image = parseDiagram(source).nodes.find((node) => node.id === "photo");
  const updated = setNodeOffsetField(source, image.lineNumber, "offset", 12.26, -4.04);
  assert.match(updated, /\n    image\n      \.offset \(12\.3, -4\)\n/);
  assert.doesNotMatch(updated, /\n    node\.offset /);
  assert.deepEqual(
    [parseDiagram(updated).nodes.find((node) => node.id === "photo").offsetX, parseDiagram(updated).nodes.find((node) => node.id === "photo").offsetY],
    [12.3, -4],
  );
});

test("updates node and graph geometry", () => {
  const node = parseDiagram(FLAT_GRAPH).nodes[0];
  const resizedNode = setNodeGeometry(FLAT_GRAPH, node.lineNumber, 180, 72, 5, -3);
  const parsedNode = parseDiagram(resizedNode).nodes[0];
  assert.deepEqual([parsedNode.style.width, parsedNode.style.height, parsedNode.offsetX, parsedNode.offsetY], [180, 72, 5, -3]);

  const graph = parseDiagram(resizedNode).groups[0];
  const resizedGraph = setGraphGeometry(resizedNode, graph.lineNumber, 420, 260, 12, -8);
  const parsedGraph = parseDiagram(resizedGraph).groups[0];
  assert.deepEqual(
    [parsedGraph.width, parsedGraph.height, parsedGraph.frameOffsetX, parsedGraph.frameOffsetY],
    [420, 260, 12, -8],
  );
});

test("indents and outdents selected source lines", () => {
  const indented = indentSourceSelection("one\ntwo", 0, 7);
  assert.equal(indented.value, "  one\n  two");
  assert.equal(indentSourceSelection(indented.value, 0, indented.value.length, true).value, "one\ntwo");
});
