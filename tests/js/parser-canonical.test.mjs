import test from "node:test";
import assert from "node:assert/strict";
import { parseDiagram } from "../../src/pugflow/web/parser.mjs";

test("accepts bare structural declarations and legacy dotted declarations", () => {
  const canonical = parseDiagram("graph\n  node\n    .id first\n    .label First\n  node\n    .id second\n    .label Second\n  flow\n    .from first\n    .to second");
  const legacy = parseDiagram("graph\n  .node\n    .id first\n    .label First\n  .node\n    .id second\n    .label Second\n  .flow\n    .from first\n    .to second");
  assert.deepEqual(canonical.errors, []);
  assert.deepEqual(legacy.errors, []);
  assert.deepEqual(canonical.nodes.map((node) => node.id), ["first", "second"]);
  assert.deepEqual(canonical.edges.map((edge) => [edge.from, edge.to]), [["first", "second"]]);
});

const SOURCE = [
  "@node service",
  "  .shape pill",
  "  .fill #245886",
  "@flow warning",
  "  .color #ef4444",
  "  .stroke-style dashed",
  "@annotation note",
  "  .color #f59e0b",
  "#canvas",
  "  .background #ffffff",
  "  .defaults",
  "    .node",
  "      .outline #111111",
  "    .flow",
  "      .width 2",
  "    .annotation",
  "      .font-style italic",
  "  graph",
  "    .id main",
  "    .layer 2",
  "    .service",
  "      .id root",
  "      .label Root",
  "      .right-ports distributed",
  "      .annotation",
  "        .above Note",
  "          .note",
  "    .node",
  "      .id left",
  "      .label Left",
  "    .node",
  "      .id right",
  "      .label Right",
  "    .node",
  "      .id result",
  "      .label Result",
  "    .flow",
  "      .from root",
  "      .to left",
  "      .warning",
  "      .label request",
  "      .from-direction down",
  "      .to-direction down",
  "    .flow",
  "      .from root",
  "      .to right",
  "    .flow",
  "      .from left",
  "      .to result",
  "    .flow",
  "      .from right",
  "      .to result",
].join("\n");

test("treats a blank document as an empty implied canvas", () => {
  const result = parseDiagram("");
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.nodes, []);
  assert.deepEqual(result.edges, []);
  assert.deepEqual(result.groups, []);
});

test("gives default nodes a black outline", () => {
  const result = parseDiagram("graph\n  node\n    .label Default");
  assert.deepEqual(result.errors, []);
  assert.equal(result.nodes[0].style.outline, "#000000");
});

test("parses canvas settings and graphs directly at the source root", () => {
  const result = parseDiagram(".background #f8fafc\n.defaults\n  .node\n    .font-size 14\ngraph\n  .id main\n  .node\n    .id first\n    .label First");
  assert.deepEqual(result.errors, []);
  assert.equal(result.figure.background, "#f8fafc");
  assert.equal(result.nodes[0].style.fontSize, 14);
  assert.equal(result.groups[0].id, "main");
  assert.equal(result.nodes[0].lineNumber, 9);
});

test("supports root-level cross-graph flows without a canvas declaration", () => {
  const result = parseDiagram("graph\n  .id first-graph\n  .node\n    .id first\n    .label First\ngraph\n  .id second-graph\n  .node\n    .id second\n    .label Second\n.flow\n  .from first\n  .to second");
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.edges.map(({ from, to, graphId }) => [from, to, graphId]), [["first", "second", null]]);
});

test("continues to parse explicit legacy canvas roots", () => {
  const result = parseDiagram("#canvas\n  graph\n    .node\n      .label Legacy");
  assert.deepEqual(result.errors, []);
  assert.equal(result.nodes[0].label, "Legacy");
  const diagram = parseDiagram("#diagram\n  graph\n    .node\n      .label Older");
  assert.deepEqual(diagram.errors, []);
  assert.equal(diagram.nodes[0].label, "Older");
});

test("parses canonical flat graphs, direct nodes, and explicit flows", () => {
  const result = parseDiagram(SOURCE);
  assert.deepEqual(result.errors, []);
  assert.equal(result.nodes.length, 4);
  assert.deepEqual(result.edges.map(({ from, to }) => [from, to]), [
    ["root", "left"], ["root", "right"], ["left", "result"], ["right", "result"],
  ]);
  assert.equal(result.nodes.find((node) => node.id === "result")?.kind, "merge");
  assert.equal(result.edges.filter((edge) => edge.to === "result").every((edge) => edge.kind === "merge"), true);
  assert.deepEqual(result.groups[0].nodeIds, ["root", "left", "right", "result"]);
  assert.equal(result.groups[0].layer, 2);
});

test("parses standalone images with annotations and flow endpoints", () => {
  const result = parseDiagram("graph\n  image\n    .id logo\n    .source https://example.com/logo.png\n    .width 80\n    .height 48\n    .annotation\n      .below Remote logo\n  node\n    .id done\n    .label Done\n  flow\n    .from logo\n    .to done");
  assert.deepEqual(result.errors, []);
  const image = result.nodes.find((node) => node.id === "logo");
  assert.equal(image.kind, "image");
  assert.equal(image.label, "");
  assert.equal(image.style.source, "https://example.com/logo.png");
  assert.deepEqual([image.width, image.height], [undefined, undefined]);
  assert.deepEqual([image.style.padding, image.style.outline, image.style.fill], [0, "transparent", "transparent"]);
  assert.equal(image.annotations[0].text, "Remote logo");
  assert.deepEqual(result.edges.map(({ from, to }) => [from, to]), [["logo", "done"]]);
});

test("parses explicit graph dimensions", () => {
  const result = parseDiagram("graph\n  .width 420\n  .height 260\n  node\n    .label Sized");
  assert.deepEqual(result.errors, []);
  assert.deepEqual([result.groups[0].width, result.groups[0].height], [420, 260]);
});

test("rejects image properties on nodes", () => {
  const result = parseDiagram("graph\n  node\n    .id profile\n    .label Profile\n    .image photo.png");
  assert.match(result.errors.join("\n"), /image is a group|images must also be declared directly in graph/);
});

test("applies @node, @flow, @annotation, and .defaults > .flow styles", () => {
  const result = parseDiagram(SOURCE);
  assert.deepEqual(result.errors, []);
  const root = result.nodes.find((node) => node.id === "root");
  const warning = result.edges.find((edge) => edge.from === "root" && edge.to === "left");
  assert.equal(root.style.shape, "pill");
  assert.equal(root.style.outline, "#111111");
  assert.equal(root.annotations[0].color, "#f59e0b");
  assert.equal(root.annotations[0].fontStyle, "italic");
  assert.equal(warning.color, "#ef4444");
  assert.equal(warning.style, "dashed");
  assert.equal(warning.width, 2);
  assert.equal(warning.label, "request");
  assert.equal(root.style.ports.right, "distributed");
});

test("allows nodes to disable inherited shadows", () => {
  const result = parseDiagram("@node raised\n  .shadow-color #000000\n#canvas\n  graph\n    .raised\n      .label Shadow\n    .raised\n      .shadow-color transparent\n      .label Flat");
  assert.deepEqual(result.errors, []);
  assert.equal(result.nodes[0].style.shadowColor, "#000000");
  assert.equal(result.nodes[1].style.shadowColor, null);
});

test("applies reusable node classes nested inside .node", () => {
  const definitions = "@node cli_card\n  .shape pill\n  .fill #123456\n";
  const nested = parseDiagram(`${definitions}#canvas\n  graph\n    .node\n      .cli_card\n      .id new\n      .label New\n`);
  assert.deepEqual(nested.errors, []);
  assert.equal(nested.nodes[0].nodeType, "cli_card");
  assert.equal(nested.nodes[0].style.fill, "#123456");
  assert.equal(nested.nodes[0].style.shape, "pill");

  const legacy = parseDiagram(`${definitions}#canvas\n  graph\n    .cli_card\n      .id old\n      .label Old\n`);
  assert.deepEqual(legacy.errors, []);
  assert.equal(legacy.nodes[0].nodeType, "cli_card");
  assert.equal(legacy.nodes[0].style.fill, "#123456");

  const overridden = parseDiagram(`${definitions}#canvas\n  graph\n    .node\n      .cli_card\n        .fill #ff0000\n      .id over\n      .label Over\n`);
  assert.deepEqual(overridden.errors, []);
  assert.equal(overridden.nodes[0].style.fill, "#ff0000");
  assert.equal(overridden.nodes[0].style.shape, "pill");
});

test("validates per-face node ports and rejects flow-level ports", () => {
  const invalidNode = parseDiagram("#canvas\n  graph\n    .node\n      .top-ports staggered\n      .label Invalid");
  assert.match(invalidNode.errors.join("\n"), /top-ports must be shared or distributed/);
  const flowPorts = parseDiagram("#canvas\n  graph\n    .node\n      .id a\n      .label A\n    .node\n      .id b\n      .label B\n    .flow\n      .from a\n      .to b\n      .ports distributed");
  assert.match(flowPorts.errors.join("\n"), /\.ports.*not valid inside \.flow/);
});

test("parses vertical node label alignment", () => {
  const result = parseDiagram("#canvas\n  graph\n    .node\n      .label Aligned\n      .align right\n      .vertical-align bottom");
  assert.deepEqual(result.errors, []);
  assert.equal(result.nodes[0].style.align, "right");
  assert.equal(result.nodes[0].style.verticalAlign, "bottom");
});

test("places graph labels top-center inside by default and accepts placement and offsets", () => {
  const defaults = parseDiagram("#canvas\n  graph\n    .label Default\n    .node\n      .label Node");
  assert.deepEqual(defaults.errors, []);
  assert.deepEqual([defaults.groups[0].labelPosition, defaults.groups[0].align, defaults.groups[0].verticalAlign], ["inside", "center", "top"]);
  const placed = parseDiagram("#canvas\n  graph\n    .label Placed\n    .label-position outside\n    .label-offset (12.5, -8)\n    .align right\n    .vertical-align bottom\n    .node\n      .label Node");
  assert.deepEqual(placed.errors, []);
  assert.deepEqual([placed.groups[0].labelPosition, placed.groups[0].align, placed.groups[0].verticalAlign], ["outside", "right", "bottom"]);
  assert.deepEqual([placed.groups[0].labelOffsetX, placed.groups[0].labelOffsetY], [12.5, -8]);
  assert.match(parseDiagram("#canvas\n  graph\n    .vertical-align sideways").errors.join("\n"), /graph\.vertical-align must be top, middle, or bottom/);
  assert.match(parseDiagram("#canvas\n  graph\n    .label-offset wrong").errors.join("\n"), /graph\.label-offset must be a tuple/);
});

test("parses and validates optional flow IDs", () => {
  const result = parseDiagram("#canvas\n  graph\n    .node\n      .id a\n      .label A\n    .node\n      .id b\n      .label B\n    .flow\n      .id delivery\n      .from a\n      .to b");
  assert.deepEqual(result.errors, []);
  assert.equal(result.edges[0].id, "delivery");
});

test("parses chunky arrow dimensions", () => {
  const result = parseDiagram("#canvas\n  graph\n    .node\n      .id a\n      .label A\n    .node\n      .id b\n      .label B\n    .flow\n      .from a\n      .to b\n      .arrow-shape chunky\n      .arrow-height 14\n      .arrow-head-width 24");
  assert.deepEqual(result.errors, []);
  assert.deepEqual([result.edges[0].arrowHeight, result.edges[0].arrowHeadWidth], [14, 24]);
});

test("accepts repeated direct flow annotations and preserves legacy below placement", () => {
  const result = parseDiagram("#canvas\n  graph\n    .node\n      .id a\n      .label A\n    .node\n      .id b\n      .label B\n    .flow\n      .from a\n      .to b\n      .annotation\n        | First\n      .annotation\n        | Second\n      .annotation-below Legacy");
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.edges[0].annotations.map(({ text, position }) => ({ text, position })), [
    { text: "Legacy", position: "below" },
    { text: "First", position: "above" },
    { text: "Second", position: "above" },
  ]);
});

test("exposes effective flow annotation colors and editable text borders", () => {
  const result = parseDiagram("@flow incident\n  .color #f59e0b\n#canvas\n  .background #f8fafc\n  graph\n    .node\n      .id alerting\n      .label Alerting\n    .node\n      .id oncall\n      .label On-call\n    .flow\n      .from alerting\n      .to oncall\n      .label page\n      .incident\n      .annotation-above-color #ffffff\n      .annotation-above-text-outline #172554\n      .annotation-above-text-outline-width 2");
  assert.deepEqual(result.errors, []);
  const edge = result.edges[0];
  assert.equal(edge.annotationAbove, "page");
  assert.deepEqual(edge.annotationAboveStyle, {
    color: "#ffffff",
    fontFamily: null,
    fontSize: 12,
    fontWeight: "normal",
    fontStyle: "normal",
    textDecoration: "none",
    textOutline: "#172554",
    textOutlineWidth: 2,
  });
  assert.equal(edge.annotationBelowStyle.textOutline, "transparent");
  assert.equal(edge.annotationBelowStyle.textOutlineWidth, 0);
});

test("defaults every text border to transparent and zero width", () => {
  const result = parseDiagram("#canvas\n  graph\n    .label Main\n    .node\n      .id first\n      .label First\n      .annotation\n        .above Note\n    .node\n      .id second\n      .label Second\n    .flow\n      .from first\n      .to second\n      .label Flow note");
  assert.deepEqual(result.errors, []);
  assert.deepEqual([result.groups[0].textOutline, result.groups[0].textOutlineWidth], ["transparent", 0]);
  assert.deepEqual([result.nodes[0].style.textOutline, result.nodes[0].style.textOutlineWidth], ["transparent", 0]);
  assert.deepEqual([result.nodes[0].annotations[0].textOutline, result.nodes[0].annotations[0].textOutlineWidth], ["transparent", 0]);
  assert.deepEqual([result.edges[0].textOutline, result.edges[0].textOutlineWidth], ["transparent", 0]);
  assert.deepEqual([result.edges[0].annotationAboveStyle.textOutline, result.edges[0].annotationAboveStyle.textOutlineWidth], ["transparent", 0]);
});

test("resolves flow endpoints declared after the flow", () => {
  const result = parseDiagram("#canvas\n  graph\n    .flow\n      .from first\n      .to second\n    .node\n      .id first\n      .label First\n    .node\n      .id second\n      .label Second");
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.edges.map(({ from, to }) => [from, to]), [["first", "second"]]);
});

test("supports canvas-level cross-graph flows", () => {
  const result = parseDiagram("#canvas\n  graph\n    .id first-graph\n    .node\n      .id first\n      .label First\n  graph\n    .id second-graph\n    .node\n      .id second\n      .label Second\n  .flow\n    .from first\n    .to second\n    .source-face bottom\n    .target-face left\n    .arrow-style both\n    .outline white\n    .outline-width 1.5\n    .roundness 0");
  assert.deepEqual(result.errors, []);
  assert.equal(result.edges[0].sourceFace, "bottom");
  assert.equal(result.edges[0].targetFace, "left");
  assert.equal(result.edges[0].direction, "both");
  assert.equal(result.edges[0].outline, "white");
  assert.equal(result.edges[0].outlineWidth, 1.5);
  assert.equal(result.edges[0].roundness, 0);
});

test("parses directional graph placement and validates references", () => {
  const valid = parseDiagram("#canvas\n  graph\n    .id first\n    .node\n      .id a\n      .label A\n  graph\n    .id second\n    .placement right\n    .relative-to first\n    .node\n      .id b\n      .label B");
  assert.deepEqual(valid.errors, []);
  assert.deepEqual(valid.groups.map(({ placement, relativeTo }) => [placement, relativeTo]), [["below", null], ["right", "first"]]);
  assert.match(parseDiagram("#canvas\n  graph\n    .id first\n    .placement diagonal").errors.join("\n"), /graph\.placement must be above, below, left, or right/);
  assert.match(parseDiagram("#canvas\n  graph\n    .id first\n    .relative-to missing").errors.join("\n"), /references unknown graph "missing"/);
  assert.match(parseDiagram("#canvas\n  graph\n    .id first\n    .relative-to first").errors.join("\n"), /cannot be positioned relative to itself/);
  const cycle = parseDiagram("#canvas\n  graph\n    .id first\n    .relative-to second\n  graph\n    .id second\n    .relative-to first");
  assert.match(cycle.errors.join("\n"), /placement references form a cycle/);
});

test("allows an intentionally empty graph", () => {
  const result = parseDiagram("#canvas\n  graph\n    .id empty\n    .label Empty graph");
  assert.deepEqual(result.errors, []);
  assert.equal(result.nodes.length, 0);
  assert.deepEqual(result.groups[0].nodeIds, []);
});

test("retains offsets, annotations, visibility, and empty labels", () => {
  const result = parseDiagram("#canvas\n  graph\n    .hidden\n    .node\n      .id root\n      .offset (12.5, -8)\n      .label-offset (3, 4)\n      .label\n      .annotation\n        .above Note\n          .offset (-4, 6)");
  assert.deepEqual(result.errors, []);
  assert.equal(result.nodes[0].label, "");
  assert.deepEqual([result.nodes[0].offsetX, result.nodes[0].offsetY], [12.5, -8]);
  assert.deepEqual([result.nodes[0].labelOffsetX, result.nodes[0].labelOffsetY], [3, 4]);
  assert.deepEqual([result.nodes[0].annotations[0].offsetX, result.nodes[0].annotations[0].offsetY], [-4, 6]);
  assert.equal(result.nodes[0].hidden, true);
});

test("parses integer node layers and retains source order for layer ties", () => {
  const result = parseDiagram("#canvas\n  graph\n    .node\n      .id back\n      .layer -1\n      .label Back\n    .node\n      .id front\n      .layer 3\n      .label Front");
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.nodes.map(({ id, layer, sourceIndex }) => [id, layer, sourceIndex]), [
    ["back", -1, 0],
    ["front", 3, 1],
  ]);
});

test("infers initial node layers from declaration order without requiring source fields", () => {
  const source = "#canvas\n  graph\n    .node\n      .id back\n      .label Back\n    .node\n      .id middle\n      .label Middle\n    .node\n      .id front\n      .label Front";
  const result = parseDiagram(source);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.nodes.map(({ id, layer, explicitLayer }) => [id, layer, explicitLayer]), [
    ["back", 0, false],
    ["middle", 1, false],
    ["front", 2, false],
  ]);
  assert.doesNotMatch(source, /\.layer/);
});

test("rejects non-integer node layers", () => {
  const result = parseDiagram("#canvas\n  graph\n    .node\n      .layer 1.5\n      .label Invalid");
  assert.match(result.errors.join("\n"), /node\.layer must be an integer/);
});

test("rejects removed legacy structure with actionable errors", () => {
  const cases = [
    ["#canvas\n  graph\n    .node\n      .label Parent\n      .node\n        .label Child", /nodes cannot contain nodes or flows/],
    ["#canvas\n  graph\n    .node\n      .label Root\n    .merge", /\.merge has been removed/],
    ["#canvas\n  graph\n    .members one two", /\.members has been removed/],
    ["#canvas\n  graph\n    .node\n      .id a\n      .label A\n    .node\n      .id b\n      .label B\n    .flow\n      .from a\n      .to b\n      .line\n        .color red", /not valid inside \.flow/],
  ];
  for (const [source, expected] of cases) assert.match(parseDiagram(source).errors.join("\n"), expected);
});

test("enforces flow scope and validates malformed fields", () => {
  const crossGraph = parseDiagram("#canvas\n  graph\n    .id one\n    .node\n      .id a\n      .label A\n  graph\n    .id two\n    .node\n      .id b\n      .label B\n    .flow\n      .from a\n      .to b");
  assert.match(crossGraph.errors.join("\n"), /place cross-graph flows directly at the source root/);
  const missing = parseDiagram("#canvas\n  graph\n    .node\n      .id a\n      .label A\n    .flow\n      .from a\n      .to missing");
  assert.match(missing.errors.join("\n"), /flow target "missing" is not defined/);
  const offset = parseDiagram("#canvas\n  graph\n    .node\n      .offset 12, -8\n      .label Root");
  assert.match(offset.errors.join("\n"), /must be a tuple/);
});
