import test from "node:test";
import assert from "node:assert/strict";
import { parseDiagram } from "../../src/pugflow/web/parser.mjs";
import { ADDITIONAL_DEMOS } from "../../src/pugflow/web/demo-sources.mjs";
import { arrangeNodeOffsets, cleanupAlignmentOffsets, cleanupGraphOffsets, DEFAULT_LAYOUT, independentMoveOffsets, inheritedFlowOffsets, layoutDiagram } from "../../src/pugflow/web/layout.mjs";
import { connectionPath, connectionPathAvoidingNodes, constrainDragDelta, constrainResizeDelta, edgeIsVisible } from "../../src/pugflow/web/pugflow.mjs";

test("constrains modified drags to their dominant axis", () => {
  assert.deepEqual(constrainDragDelta(35, 12, true), { dx: 35, dy: 0 });
  assert.deepEqual(constrainDragDelta(8, -24, true), { dx: 0, dy: -24 });
  assert.deepEqual(constrainDragDelta(8, -24, false), { dx: 8, dy: -24 });
});

test("constrains side resize handles to their active axis", () => {
  assert.deepEqual(constrainResizeDelta(35, 12, 1, 0), { dx: 35, dy: 0 });
  assert.deepEqual(constrainResizeDelta(8, -24, 0, -1), { dx: 0, dy: -24 });
  assert.deepEqual(constrainResizeDelta(8, -24, 1, -1), { dx: 8, dy: -24 });
});

test("uses compact horizontal and vertical flow spacing", () => {
  assert.equal(DEFAULT_LAYOUT.horizontalGutter, 60);
  assert.equal(DEFAULT_LAYOUT.verticalGutter, 40);
});

test("places parallel flows and merges in successive columns", () => {
  const graph = parseDiagram([
    "#canvas",
    "  graph",
    "    .node",
    "      .id root",
    "      .label Root",
    "    .node",
    "      .id a",
    "      .label Alpha",
    "    .node",
    "      .id b",
    "      .label Beta",
    "    .node",
    "      .id c",
    "      .label Combined",
    "    .node",
    "      .id done",
    "      .label Done",
    "    .flow",
    "      .from root",
    "      .to a",
    "    .flow",
    "      .from root",
    "      .to b",
    "    .flow",
    "      .from a",
    "      .to c",
    "    .flow",
    "      .from b",
    "      .to c",
    "    .flow",
    "      .from c",
    "      .to done",
  ].join("\n"));
  const layout = layoutDiagram(graph.nodes, graph.edges);
  const nodes = new Map(layout.nodes.map((node) => [node.id, node]));

  assert.ok(nodes.get("a").x > nodes.get("root").x);
  assert.equal(nodes.get("a").x, nodes.get("b").x);
  assert.ok(nodes.get("c").x > nodes.get("a").x);
  assert.ok(nodes.get("done").x > nodes.get("c").x);
  assert.ok(layout.width > 0);
  assert.ok(layout.height > 0);
});

test("keeps feedback cycles placeable", () => {
  const nodes = [{ id: "a" }, { id: "b" }];
  const edges = [
    { from: "a", to: "b", kind: "merge" },
    { from: "b", to: "a", kind: "merge" },
  ];

  const layout = layoutDiagram(nodes, edges);
  assert.equal(layout.nodes.length, 2);
  assert.notDeepEqual(
    layout.nodes.map((node) => [node.x, node.y]),
    [[layout.nodes[0].x, layout.nodes[0].y], [layout.nodes[0].x, layout.nodes[0].y]],
  );
});

test("places multiple directional flows without collisions", () => {
  const graph = parseDiagram([
    "#canvas",
    "  graph",
    "    .node",
    "      .id root",
    "      .label Root",
    "    .node",
    "      .id east",
    "      .label East",
    "    .node",
    "      .id south",
    "      .label South",
    "    .node",
    "      .id east-two",
    "      .label East lane two",
    "    .flow",
    "      .from root",
    "      .to east",
    "      .direction right",
    "    .flow",
    "      .from root",
    "      .to south",
    "      .direction down",
    "    .flow",
    "      .from root",
    "      .to east-two",
    "      .direction right",
  ].join("\n"));
  assert.deepEqual(graph.errors, []);
  const layout = layoutDiagram(graph.nodes, graph.edges);
  const nodes = new Map(layout.nodes.map((node) => [node.id, node]));
  assert.ok(nodes.get("east").x > nodes.get("root").x);
  assert.ok(nodes.get("south").y > nodes.get("root").y);
  assert.ok(nodes.get("east-two").x > nodes.get("root").x);
  assert.notEqual(nodes.get("east").y, nodes.get("east-two").y);
});

test("keeps offset-free demo nodes from overlapping after lane compaction", () => {
  for (const demo of ADDITIONAL_DEMOS) {
    const graph = parseDiagram(demo.pug, demo.css);
    for (const group of graph.groups) {
      const nodeIds = new Set(group.nodeIds);
      const nodes = graph.nodes.filter((node) => nodeIds.has(node.id)).map((node) => {
        const width = typeof node.style.width === "number" ? node.style.width : 150;
        const height = typeof node.style.height === "number" ? node.style.height : 42;
        return { ...node, width, height, layoutHeight: height };
      });
      const edges = graph.edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
      const placed = layoutDiagram(nodes, edges, {
        horizontalGutter: group.xSpacing,
        verticalGutter: group.ySpacing,
      }).nodes;
      for (let index = 0; index < placed.length; index += 1) {
        const first = placed[index];
        for (const second of placed.slice(index + 1)) {
          const overlap = first.x < second.x + second.width
            && second.x < first.x + first.width
            && first.y < second.y + second.layoutHeight
            && second.y < first.y + first.layoutHeight;
          assert.equal(overlap, false, `${demo.name}: ${first.id} overlaps ${second.id}`);
        }
      }
    }
  }
});

test("chooses the compact axis when resolving sibling lane collisions", () => {
  const nodes = [
    { id: "root", width: 229, height: 76 },
    { id: "pivot", width: 120, height: 111 },
    { id: "left", width: 90, height: 93 },
    { id: "right", width: 75, height: 35 },
    { id: "above", width: 141, height: 90 },
  ];
  const edges = [
    { from: "root", to: "pivot", kind: "branch", layoutDirection: "up" },
    { from: "pivot", to: "left", kind: "branch", layoutDirection: "down" },
    { from: "pivot", to: "right", kind: "branch", layoutDirection: "down" },
    { from: "pivot", to: "above", kind: "branch", layoutDirection: "up" },
  ];
  const placed = new Map(layoutDiagram(nodes, edges).nodes.map((node) => [node.id, node]));
  const root = placed.get("root");

  assert.equal(placed.get("left").y - (root.y + root.layoutHeight), DEFAULT_LAYOUT.verticalGutter);
  assert.equal(placed.get("right").y - (root.y + root.layoutHeight), DEFAULT_LAYOUT.verticalGutter);
  assert.ok(placed.get("right").x + placed.get("right").width <= root.x + root.width);
});

test("centers same-direction sibling branches around their source", () => {
  const nodes = [
    { id: "payment", width: 160, height: 60 },
    { id: "retry", width: 120, height: 60 },
    { id: "approve", width: 180, height: 60 },
  ];
  const edges = [
    { from: "payment", to: "retry", kind: "branch", layoutDirection: "down", sourceDirection: "down", targetLayoutDirection: "down" },
    { from: "payment", to: "approve", kind: "branch", layoutDirection: "down", sourceDirection: "down", targetLayoutDirection: "down" },
  ];
  const placed = new Map(layoutDiagram(nodes, edges).nodes.map((node) => [node.id, node]));
  const centerX = (node) => node.x + node.width / 2;
  assert.equal(centerX(placed.get("payment")), (placed.get("retry").x + placed.get("approve").x + placed.get("approve").width) / 2);
  assert.equal(placed.get("retry").y, placed.get("approve").y);
  assert.equal(placed.get("approve").x - (placed.get("retry").x + placed.get("retry").width), DEFAULT_LAYOUT.horizontalGutter);
});

test("perpendicular sibling branches do not change existing chain spacing", () => {
  const chain = [
    { id: "client", width: 145, height: 42 },
    { id: "gateway", width: 150, height: 42 },
    { id: "identity", width: 150, height: 42 },
    { id: "policy", width: 140, height: 60 },
  ];
  const chainEdges = [
    { from: "client", to: "gateway", kind: "branch", layoutDirection: "right" },
    { from: "gateway", to: "identity", kind: "branch", layoutDirection: "right" },
    { from: "identity", to: "policy", kind: "branch", layoutDirection: "right" },
  ];
  const options = { horizontalGutter: 72, verticalGutter: 48, padding: 30 };
  const base = new Map(layoutDiagram(chain, chainEdges, options).nodes.map((node) => [node.id, node]));
  const branches = [
    { id: "node-14", width: 120, height: 42 },
    { id: "node-15", width: 180, height: 42 },
  ];
  const branchEdges = [
    { from: "identity", to: "node-14", kind: "branch", layoutDirection: "up" },
    { from: "identity", to: "node-15", kind: "branch", layoutDirection: "up" },
  ];
  const expanded = new Map(layoutDiagram([...chain, ...branches], [...chainEdges, ...branchEdges], options).nodes.map((node) => [node.id, node]));
  chain.forEach(({ id }) => assert.equal(expanded.get(id).x, base.get(id).x));
  [["client", "gateway"], ["gateway", "identity"], ["identity", "policy"]].forEach(([from, to]) => {
    assert.equal(expanded.get(to).x - (expanded.get(from).x + expanded.get(from).width), options.horizontalGutter);
  });
  assert.equal(expanded.get("node-14").y, expanded.get("node-15").y);
  assert.ok(expanded.get("node-14").y < expanded.get("identity").y);
  assert.equal(expanded.get("node-15").x - (expanded.get("node-14").x + expanded.get("node-14").width), options.horizontalGutter);
  const identityCenter = expanded.get("identity").x + expanded.get("identity").width / 2;
  assert.equal(identityCenter, (expanded.get("node-14").x + expanded.get("node-15").x + expanded.get("node-15").width) / 2);
});

test("lays out a horizontal branch and merge compactly and symmetrically", () => {
  const nodes = ["review", "revise", "accept", "publish"].map((id) => ({ id, width: 160, height: 60 }));
  const edges = [
    { from: "review", to: "revise", kind: "branch", layoutDirection: "right", sourceDirection: "right" },
    { from: "review", to: "accept", kind: "branch", layoutDirection: "right", sourceDirection: "right" },
    { from: "revise", to: "publish", kind: "merge", declarationKind: "node", layoutDirection: "right", sourceDirection: "right" },
    { from: "accept", to: "publish", kind: "merge", declarationKind: "flow", layoutDirection: "right", sourceDirection: "right" },
  ];
  const layout = layoutDiagram(nodes, edges);
  const placed = new Map(layout.nodes.map((node) => [node.id, node]));
  const centerY = (node) => node.y + node.height / 2;
  assert.equal(placed.get("revise").x - (placed.get("review").x + placed.get("review").width), 60);
  assert.equal(placed.get("publish").x - (placed.get("revise").x + placed.get("revise").width), 60);
  assert.equal(centerY(placed.get("review")), (centerY(placed.get("revise")) + centerY(placed.get("accept"))) / 2);
  assert.equal(centerY(placed.get("publish")), (centerY(placed.get("revise")) + centerY(placed.get("accept"))) / 2);
  assert.equal(placed.get("accept").y - (placed.get("revise").y + placed.get("revise").height), DEFAULT_LAYOUT.verticalGutter);
  assert.deepEqual(cleanupAlignmentOffsets(layout.nodes, layout.edges), []);
});

test("uses flow direction for layout independently of connector faces", () => {
  const nodes = ["payment", "approve"].map((id) => ({ id, width: 160, height: 60 }));
  const downwardFlowWithSideFaces = [{
    from: "payment", to: "approve", kind: "branch",
    layoutDirection: "down", sourceDirection: "right", targetLayoutDirection: "right",
  }];
  const rightwardFlowWithSideFaces = [{
    from: "payment", to: "approve", kind: "branch",
    layoutDirection: "right", sourceDirection: "right", targetLayoutDirection: "right",
  }];
  const downward = new Map(layoutDiagram(nodes, downwardFlowWithSideFaces).nodes.map((node) => [node.id, node]));
  const rightward = new Map(layoutDiagram(nodes, rightwardFlowWithSideFaces).nodes.map((node) => [node.id, node]));
  assert.ok(downward.get("approve").y > downward.get("payment").y);
  assert.equal(downward.get("approve").x, downward.get("payment").x);
  assert.ok(rightward.get("approve").x > rightward.get("payment").x);
  assert.equal(rightward.get("approve").y, rightward.get("payment").y);
});

test("places a later-declared flow source before an anchored first node", () => {
  const graph = parseDiagram([
    "graph",
    "  node",
    "    .id first",
    "    .label First",
    "  image",
    "    .id image",
    "    .source image.png",
    "  flow",
    "    .from image",
    "    .to first",
    "    .target-face left",
  ].join("\n"));
  assert.deepEqual(graph.errors, []);

  const placed = new Map(layoutDiagram(graph.nodes, graph.edges).nodes.map((node) => [node.id, node]));
  assert.ok(placed.get("image").x < placed.get("first").x);
  assert.equal(placed.get("image").y + placed.get("image").height / 2, placed.get("first").y + placed.get("first").height / 2);
});

test("routes merge connections with rounded orthogonal bends", () => {
  const source = { x: 10, y: 10, width: 100, height: 40, aboveHeight: 0 };
  const target = { x: 260, y: 100, width: 100, height: 40, aboveHeight: 0 };
  const route = connectionPath(source, target, "merge");

  assert.match(route.d, / H /);
  assert.match(route.d, / Q /);
  assert.match(route.d, / V /);
  assert.doesNotMatch(route.d, / C /);
  assert.equal(route.labelY, 30);
});

test("uses configurable connector corner roundness", () => {
  const source = { x: 0, y: 0, width: 100, height: 40, layoutHeight: 40 };
  const target = { x: 200, y: 100, width: 100, height: 40, layoutHeight: 40 };
  assert.match(connectionPath(source, target, "branch", "right", 0, 0, "right", 12).d, / Q /);
  assert.doesNotMatch(connectionPath(source, target, "branch", "right", 0, 0, "right", 0).d, / Q /);
});

test("routes vertical and leftward connections from the correct sides", () => {
  const source = { x: 200, y: 100, width: 100, height: 40, aboveHeight: 0 };
  const below = { x: 200, y: 240, width: 100, height: 40, aboveHeight: 0 };
  const left = { x: 0, y: 100, width: 100, height: 40, aboveHeight: 0 };
  assert.match(connectionPath(source, below, "branch", "down").d, /^M 250 140 V 240$/);
  assert.match(connectionPath(source, left, "merge", "left").d, /^M 200 120 H 100$/);
});

test("positions flow descendants from their parents' rendered offsets", () => {
  const nodes = [
    { id: "root", offsetX: 30, offsetY: -20 },
    { id: "child", offsetX: 5, offsetY: 7 },
    { id: "grandchild", offsetX: 0, offsetY: 0 },
    { id: "merge", offsetX: 0, offsetY: 0 },
  ];
  const offsets = inheritedFlowOffsets(nodes, [
    { kind: "branch", from: "root", to: "child" },
    { kind: "branch", from: "child", to: "grandchild" },
    { kind: "merge", from: "root", to: "merge" },
  ]);
  assert.deepEqual(offsets.get("child"), { x: 30, y: -20 });
  assert.deepEqual(offsets.get("grandchild"), { x: 35, y: -13 });
  assert.deepEqual(offsets.get("merge"), { x: 0, y: 0 });
});

test("manual node moves never alter unselected flow descendants", () => {
  const nodes = [
    { id: "root", lineNumber: 1, offsetX: 30, offsetY: -20 },
    { id: "child", lineNumber: 2, offsetX: 5, offsetY: 7 },
    { id: "grandchild", lineNumber: 3, offsetX: 0, offsetY: 0 },
  ];
  const edges = [
    { kind: "branch", from: "root", to: "child" },
    { kind: "branch", from: "child", to: "grandchild" },
  ];
  assert.deepEqual(independentMoveOffsets(nodes, edges, ["root"], 10, 4).map(({ id, offsetX, offsetY }) => ({ id, offsetX, offsetY })), [
    { id: "root", offsetX: 40, offsetY: -16 },
  ]);
  assert.deepEqual(independentMoveOffsets(nodes, edges, ["root", "child"], 10, 4).map(({ id, offsetX, offsetY }) => ({ id, offsetX, offsetY })), [
    { id: "root", offsetX: 40, offsetY: -16 },
    { id: "child", offsetX: 15, offsetY: 11 },
  ]);
});

test("moving an intermediate flow node leaves its target unchanged", () => {
  const nodes = ["collector", "metrics", "alerting", "oncall"].map((id) => ({ id, offsetX: 0, offsetY: 0 }));
  const edges = [
    { kind: "branch", from: "collector", to: "metrics" },
    { kind: "branch", from: "metrics", to: "alerting" },
    { kind: "branch", from: "alerting", to: "oncall" },
  ];
  assert.deepEqual(independentMoveOffsets(nodes, edges, ["alerting"], 20, 10).map(({ id, offsetX, offsetY }) => ({ id, offsetX, offsetY })), [
    { id: "alerting", offsetX: 20, offsetY: 10 },
  ]);
});

test("routes explicit connections through independently selected endpoint directions", () => {
  const source = { x: 100, y: 200, width: 100, height: 40, aboveHeight: 0 };
  const target = { x: 300, y: 100, width: 100, height: 40, aboveHeight: 0 };
  const route = connectionPath(source, target, "connection", "left", 0, 0, "down");
  assert.match(route.d, /^M 100 220 L 85 220 Q 76 220/);
  assert.match(route.d, /L 350 100$/);
});

test("routes connectors around unrelated nodes", () => {
  const source = { id: "source", x: 0, y: 100, width: 100, height: 40, aboveHeight: 0 };
  const obstacle = { id: "obstacle", x: 150, y: 80, width: 100, height: 80, aboveHeight: 0 };
  const target = { id: "target", x: 300, y: 100, width: 100, height: 40, aboveHeight: 0 };
  const route = connectionPathAvoidingNodes(source, target, "branch", "right", [source, obstacle, target]);
  assert.match(route.d, /Q/);
  assert.notEqual(route.d, "M 100 120 H 300");
  assert.match(route.d, /^M 100 120 L \d+ 120/);
  assert.match(route.d, /L 300 120$/);
});

test("keeps side-port approaches horizontal while detouring vertically", () => {
  const source = { id: "source", x: 0, y: 180, width: 100, height: 40, aboveHeight: 0 };
  const obstacle = { id: "obstacle", x: 150, y: 100, width: 100, height: 100, aboveHeight: 0 };
  const target = { id: "target", x: 300, y: 40, width: 100, height: 40, aboveHeight: 0 };
  const route = connectionPathAvoidingNodes(source, target, "merge", "right", [source, obstacle, target]);
  assert.match(route.d, /^M 100 200 L \d+ 200/);
  assert.match(route.d, /L 300 60$/);
});

test("centers merge targets beyond their full source set", () => {
  const nodes = ["root", "top", "middle", "bottom", "combined"].map((id) => ({ id, width: 100, height: 40 }));
  const edges = [
    { from: "root", to: "top", layoutDirection: "right", kind: "branch" },
    { from: "root", to: "middle", layoutDirection: "right", kind: "branch" },
    { from: "root", to: "bottom", layoutDirection: "right", kind: "branch" },
    { from: "top", to: "combined", layoutDirection: "right", kind: "merge" },
    { from: "middle", to: "combined", layoutDirection: "right", kind: "merge" },
    { from: "bottom", to: "combined", layoutDirection: "right", kind: "merge" },
  ];
  const placed = new Map(layoutDiagram(nodes, edges).nodes.map((node) => [node.id, node]));
  assert.ok(placed.get("combined").x > Math.max(placed.get("top").x, placed.get("middle").x, placed.get("bottom").x));
  const sourceRows = [placed.get("top").y, placed.get("middle").y, placed.get("bottom").y].sort((a, b) => a - b);
  assert.equal(placed.get("combined").y, sourceRows[1]);
});

test("centers a vertical merge target between two source columns", () => {
  const nodes = ["root", "left", "right", "combined"].map((id) => ({ id, width: 100, height: 40 }));
  const edges = [
    { from: "root", to: "left", layoutDirection: "down", kind: "branch" },
    { from: "root", to: "right", layoutDirection: "down", kind: "branch" },
    { from: "left", to: "combined", layoutDirection: "down", kind: "merge" },
    { from: "right", to: "combined", layoutDirection: "down", kind: "merge" },
  ];
  const placed = new Map(layoutDiagram(nodes, edges).nodes.map((node) => [node.id, node]));
  const centerX = (node) => node.x + node.width / 2;
  assert.equal(centerX(placed.get("combined")), (centerX(placed.get("left")) + centerX(placed.get("right"))) / 2);
  assert.ok(placed.get("combined").y > placed.get("left").y);
  assert.ok(placed.get("combined").y > placed.get("right").y);
});

test("keeps an even merge centered after one branch changes direction", () => {
  const nodes = ["root", "lower", "side", "combined"].map((id) => ({ id, width: 100, height: 40 }));
  const edges = [
    { from: "root", to: "lower", layoutDirection: "down", sourceDirection: "down", kind: "branch" },
    { from: "root", to: "side", layoutDirection: "down", sourceDirection: "right", kind: "branch" },
    { from: "lower", to: "combined", layoutDirection: "down", sourceDirection: "down", kind: "merge" },
    { from: "side", to: "combined", layoutDirection: "down", sourceDirection: "down", kind: "merge" },
  ];
  const placed = new Map(layoutDiagram(nodes, edges).nodes.map((node) => [node.id, node]));
  const centerX = (node) => node.x + node.width / 2;
  assert.equal(centerX(placed.get("combined")), (centerX(placed.get("lower")) + centerX(placed.get("side"))) / 2);
});

test("assigns ordered ports from the target node face setting", () => {
  const nodes = ["first", "second", "lower", "combined"].map((id) => ({
    id,
    width: 100,
    height: 60,
    style: { ports: { left: id === "combined" ? "distributed" : "shared" } },
  }));
  const edges = [
    { from: "first", to: "second", layoutDirection: "right", kind: "branch" },
    { from: "first", to: "lower", layoutDirection: "down", kind: "branch" },
    { from: "first", to: "combined", layoutDirection: "right", kind: "merge" },
    { from: "second", to: "combined", layoutDirection: "right", kind: "merge" },
    { from: "lower", to: "combined", layoutDirection: "right", kind: "merge" },
  ];
  const layout = layoutDiagram(nodes, edges);
  const mergeEdges = layout.edges.filter((edge) => edge.kind === "merge");
  assert.deepEqual(mergeEdges.map((edge) => edge.mergePortIndex), [0, 1, 2]);
  assert.deepEqual(mergeEdges.map((edge) => edge.targetPortFraction), [-0.25, 0, 0.25]);
});

test("pulls terminal merge sources forward without moving intermediate flow nodes", () => {
  const nodes = ["root", "early", "late", "lower", "combined"].map((id) => ({ id, width: 100, height: 40 }));
  const edges = [
    { from: "root", to: "early", layoutDirection: "right", kind: "branch" },
    { from: "early", to: "late", layoutDirection: "right", kind: "branch" },
    { from: "root", to: "lower", layoutDirection: "down", kind: "branch" },
    { from: "early", to: "combined", layoutDirection: "right", kind: "merge" },
    { from: "late", to: "combined", layoutDirection: "right", kind: "merge" },
    { from: "lower", to: "combined", layoutDirection: "right", kind: "merge" },
  ];
  const placed = new Map(layoutDiagram(nodes, edges).nodes.map((node) => [node.id, node]));
  assert.equal(placed.get("lower").rank, placed.get("late").rank);
  assert.ok(placed.get("lower").y > placed.get("late").y);
  assert.ok(placed.get("early").rank < placed.get("late").rank);
});

test("routes merge inputs to separate ports on the target face", () => {
  const source = { id: "source", x: 0, y: 100, width: 100, height: 40, aboveHeight: 0 };
  const target = { id: "target", x: 300, y: 100, width: 100, height: 60, aboveHeight: 0 };
  const upper = connectionPathAvoidingNodes(source, target, "merge", "right", [source, target], -15);
  const lower = connectionPathAvoidingNodes(source, target, "merge", "right", [source, target], 15);
  assert.match(upper.d, /H 300$/);
  assert.match(lower.d, /H 300$/);
  assert.notEqual(upper.d, lower.d);
});

test("uses one mirrored x bend for equal-span horizontal merge sources", () => {
  const upper = { id: "upper", x: 0, y: 0, width: 100, height: 40 };
  const lower = { id: "lower", x: 0, y: 100, width: 100, height: 40 };
  const target = { id: "target", x: 300, y: 50, width: 100, height: 40 };
  const nodes = [upper, lower, target];
  const upperRoute = connectionPathAvoidingNodes(upper, target, "merge", "right", nodes);
  const lowerRoute = connectionPathAvoidingNodes(lower, target, "merge", "right", nodes);
  assert.match(upperRoute.d, /Q 216 20 216 29/);
  assert.match(lowerRoute.d, /Q 216 120 216 111/);
});

test("supports shared merge ports and distributed flow source ports", () => {
  const nodes = ["root", "upper", "lower", "combined"].map((id) => ({
    id, width: 100, height: 60, style: { ports: { right: id === "root" ? "distributed" : "shared", left: "shared" } },
  }));
  const edges = [
    { from: "root", to: "upper", kind: "branch", layoutDirection: "right" },
    { from: "root", to: "lower", kind: "branch", layoutDirection: "right" },
    { from: "upper", to: "combined", kind: "merge", layoutDirection: "right" },
    { from: "lower", to: "combined", kind: "merge", layoutDirection: "right" },
  ];
  const layoutEdges = layoutDiagram(nodes, edges).edges;
  assert.deepEqual(layoutEdges.filter((edge) => edge.kind === "branch").map((edge) => Math.round(edge.sourcePortFraction * 6)), [-1, 1]);
  assert.deepEqual(layoutEdges.filter((edge) => edge.kind === "merge").map((edge) => edge.targetPortFraction), [0, 0]);
});

test("cleans up small flow kinks by updating target offsets", () => {
  const nodes = [
    { id: "a", x: 0, y: 100, width: 100, height: 40, aboveHeight: 0, offsetX: 0, offsetY: -53.4, lineNumber: 2 },
    { id: "b", x: 200, y: 100.8, width: 100, height: 40, aboveHeight: 0, offsetX: -97.8, offsetY: -52.6, lineNumber: 5 },
    { id: "c", x: 400, y: 118, width: 100, height: 40, aboveHeight: 0, offsetX: 0, offsetY: 0, lineNumber: 8 },
  ];
  const edges = [
    { from: "a", to: "b", kind: "branch", layoutDirection: "right" },
    { from: "b", to: "c", kind: "branch", layoutDirection: "right" },
  ];
  assert.deepEqual(cleanupAlignmentOffsets(nodes, edges), [
    { kind: "offset", id: "b", lineNumber: 5, offsetX: -97.8, offsetY: -53.4 },
  ]);
});

test("cleans visible kinks without treating above annotations as node geometry", () => {
  const nodes = [
    { id: "root", x: 0, y: 100, width: 220, height: 78, aboveHeight: 23, offsetX: 0, offsetY: 0, lineNumber: 2 },
    { id: "path-a", x: 300, y: 101.7, width: 190, height: 78, aboveHeight: 0, offsetX: -19.5, offsetY: 1.7, lineNumber: 8 },
  ];
  assert.deepEqual(cleanupAlignmentOffsets(nodes, [{ from: "root", to: "path-a", kind: "branch", layoutDirection: "right" }]), [
    { kind: "offset", id: "path-a", lineNumber: 8, offsetX: -19.5, offsetY: 0 },
  ]);
});

test("aligns large flow jogs by changing offsets without changing connector faces", () => {
  const nodes = [
    { id: "revise", x: 100, y: 100, width: 160, height: 60, offsetX: 0, offsetY: 0, lineNumber: 4 },
    { id: "publish", x: 382, y: 174.7, width: 160, height: 60, offsetX: -11.8, offsetY: -74.7, lineNumber: 9 },
  ];
  const edge = { from: "revise", to: "publish", kind: "merge", declarationKind: "node", layoutDirection: "right", sourceDirection: "right", targetLayoutDirection: "right" };
  assert.deepEqual(cleanupAlignmentOffsets(nodes, [edge]), [
    { kind: "offset", id: "publish", lineNumber: 9, offsetX: -11.8, offsetY: -149.4 },
  ]);
  assert.equal(edge.sourceDirection, "right");
  assert.equal(edge.targetLayoutDirection, "right");
});

test("collapses an unnecessary bend between perpendicular connector faces", () => {
  const nodes = [
    { id: "payment", x: 100, y: 100, width: 160, height: 60, offsetX: 0, offsetY: 0, lineNumber: 4 },
    { id: "approve", x: 382, y: 177.7, width: 160, height: 60, offsetX: -174.7, offsetY: -5.9, lineNumber: 9 },
  ];
  const edge = { from: "payment", to: "approve", kind: "branch", layoutDirection: "down", sourceDirection: "right", targetLayoutDirection: "down" };
  assert.deepEqual(cleanupAlignmentOffsets(nodes, [edge]), [
    { kind: "offset", id: "approve", lineNumber: 9, offsetX: -352.7, offsetY: -5.9 },
  ]);
  assert.equal(edge.sourceDirection, "right");
  assert.equal(edge.targetLayoutDirection, "down");
});

test("cleans an incoming bend without collapsing sibling branches", () => {
  const nodes = [
    { id: "cart", x: 100, y: 100, width: 160, height: 60, offsetX: 0, offsetY: 0, lineNumber: 2 },
    { id: "payment", x: 104.4, y: 224.3, width: 160, height: 60, offsetX: 4.4, offsetY: 16.3, lineNumber: 8 },
    { id: "retry", x: 119.7, y: 354, width: 160, height: 60, offsetX: 61.3, offsetY: 5.7, lineNumber: 16 },
    { id: "approve", x: 505.8, y: 353.5, width: 160, height: 60, offsetX: -52.6, offsetY: 5.2, lineNumber: 25 },
  ];
  const edges = [
    { from: "cart", to: "payment", kind: "branch", layoutDirection: "down", sourceDirection: "down", targetLayoutDirection: "down" },
    { from: "payment", to: "retry", kind: "branch", layoutDirection: "down", sourceDirection: "down", targetLayoutDirection: "down" },
    { from: "payment", to: "approve", kind: "branch", layoutDirection: "down", sourceDirection: "down", targetLayoutDirection: "down" },
  ];
  assert.deepEqual(cleanupAlignmentOffsets(nodes, edges), [
    { kind: "offset", id: "payment", lineNumber: 8, offsetX: 0, offsetY: 16.3 },
  ]);
});

test("prefers the small outgoing merge kink over a deliberate incoming bend", () => {
  const graph = parseDiagram([
    "#canvas",
    "  graph",
    "    .node",
    "      .id cart",
    "      .label Cart ready",
    "    .node",
    "      .id payment",
    "      .label Payment valid?",
    "    .node",
    "      .id retry",
    "      .label Retry payment",
    "    .node",
    "      .id approve",
    "      .offset (-244.7, 103)",
    "      .label Approve order",
    "    .node",
    "      .id receipt",
    "      .offset (0, 60.4)",
    "      .label Send receipt",
    "    .flow",
    "      .from cart",
    "      .to payment",
    "      .direction down",
    "      .source-face bottom",
    "      .target-face top",
    "    .flow",
    "      .from payment",
    "      .to retry",
    "      .direction down",
    "      .source-face bottom",
    "      .target-face top",
    "    .flow",
    "      .from payment",
    "      .to approve",
    "      .direction down",
    "      .source-face right",
    "      .target-face left",
    "    .flow",
    "      .from retry",
    "      .to receipt",
    "      .direction down",
    "      .source-face bottom",
    "      .target-face top",
    "    .flow",
    "      .from approve",
    "      .to receipt",
    "      .direction down",
    "      .source-face bottom",
    "      .target-face top",
  ].join("\n"));
  const base = layoutDiagram(graph.nodes.map((node) => ({ ...node, width: 160, height: 60, layoutHeight: 60 })), graph.edges);
  const inherited = inheritedFlowOffsets(base.nodes, graph.edges);
  const visual = base.nodes.map((node) => ({
    ...node,
    x: node.x + node.offsetX + (inherited.get(node.id)?.x ?? 0),
    y: node.y + node.offsetY + (inherited.get(node.id)?.y ?? 0),
  }));
  assert.deepEqual(graph.errors, []);
  assert.deepEqual(cleanupAlignmentOffsets(visual, base.edges), []);
});

test("preserves a centered multi-source merge during cleanup", () => {
  const nodes = [
    { id: "review", x: 0, y: 100, width: 160, height: 60, offsetX: 0, offsetY: 0, lineNumber: 2 },
    { id: "revise", x: 260, y: 100, width: 160, height: 60, offsetX: 0, offsetY: 0, lineNumber: 6 },
    { id: "accept", x: 260, y: 188, width: 160, height: 60, offsetX: 0, offsetY: 0, lineNumber: 10 },
    { id: "publish", x: 508.2, y: 174.7, width: 160, height: 60, offsetX: -11.8, offsetY: -74.7, lineNumber: 14 },
  ];
  const edges = [
    { from: "review", to: "revise", kind: "branch", declarationKind: "node", layoutDirection: "right", sourceDirection: "right" },
    { from: "review", to: "accept", kind: "branch", declarationKind: "node", layoutDirection: "right", sourceDirection: "right" },
    { from: "revise", to: "publish", kind: "merge", declarationKind: "node", layoutDirection: "right", sourceDirection: "right" },
    { from: "accept", to: "publish", kind: "merge", declarationKind: "flow", layoutDirection: "right", sourceDirection: "right", targetLayoutDirection: "right" },
  ];
  assert.deepEqual(cleanupAlignmentOffsets(nodes, edges), []);
});

test("cleans tiny offsets around branches and merges to a fixed point", () => {
  const nodes = [
    { id: "api", x: 24, y: 24, width: 150, height: 42, offsetX: 0, offsetY: 0, lineNumber: 1 },
    { id: "orders", x: 248.7, y: 24.1, width: 150, height: 42, offsetX: -1.3, offsetY: 0.1, lineNumber: 2 },
    { id: "inventory", x: 474.8, y: 24.4, width: 150, height: 42, offsetX: -1.2, offsetY: 0.4, lineNumber: 3 },
    { id: "primary-db", x: 250, y: 114, width: 150, height: 42, offsetX: 0, offsetY: 0, lineNumber: 4 },
    { id: "event-stream", x: 473.7, y: 114.2, width: 150, height: 42, offsetX: -1.3, offsetY: 0.2, lineNumber: 5 },
  ];
  const edges = [
    { from: "api", to: "orders", kind: "branch", layoutDirection: "right" },
    { from: "orders", to: "inventory", kind: "branch", layoutDirection: "right" },
    { from: "orders", to: "primary-db", kind: "merge", declarationKind: "flow", layoutDirection: "down" },
    { from: "orders", to: "event-stream", kind: "branch", layoutDirection: "down" },
    { from: "inventory", to: "primary-db", kind: "merge", declarationKind: "flow", layoutDirection: "down" },
  ];
  const changes = cleanupAlignmentOffsets(nodes, edges);
  assert.deepEqual(changes.map(({ id, offsetX, offsetY }) => ({ id, offsetX, offsetY })), [
    { id: "orders", offsetX: 0, offsetY: 0 },
    { id: "inventory", offsetX: 0, offsetY: 0 },
    { id: "event-stream", offsetX: 0, offsetY: 0 },
  ]);
  const byId = new Map(changes.map((change) => [change.id, change]));
  const cleaned = nodes.map((node) => {
    const change = byId.get(node.id);
    return change ? {
      ...node,
      x: node.x + change.offsetX - node.offsetX,
      y: node.y + change.offsetY - node.offsetY,
      offsetX: change.offsetX,
      offsetY: change.offsetY,
    } : node;
  });
  assert.deepEqual(cleanupAlignmentOffsets(cleaned, edges), []);
});

test("cleans a small cross-graph kink by moving the graph instead of its node", () => {
  const nodes = [
    { id: "source", x: 100, y: 100, width: 160, height: 60, offsetX: 0, offsetY: 0, lineNumber: 4 },
    { id: "target", x: 500, y: 120, width: 160, height: 60, offsetX: 0, offsetY: 0, lineNumber: 10 },
  ];
  const groups = [
    { id: "first", nodeIds: ["source"], offsetX: 0, offsetY: 0, sourceIndex: 0, lineNumber: 2 },
    { id: "second", nodeIds: ["target"], offsetX: 10, offsetY: 20, sourceIndex: 1, lineNumber: 8 },
  ];
  const edges = [{ from: "source", to: "target", kind: "branch", layoutDirection: "right", sourceDirection: "right", targetLayoutDirection: "right" }];
  assert.deepEqual(cleanupGraphOffsets(nodes, edges, groups), [
    { id: "second", lineNumber: 8, offsetX: 10, offsetY: 0 },
  ]);
  assert.deepEqual(cleanupAlignmentOffsets(nodes, []), []);
  assert.equal(edges[0].sourceDirection, "right");
  assert.equal(edges[0].targetLayoutDirection, "right");
});

test("preserves a deliberate bend between graphs", () => {
  const nodes = [
    { id: "source", x: 100, y: 100, width: 160, height: 60 },
    { id: "target", x: 420, y: 280, width: 160, height: 60 },
  ];
  const groups = [
    { id: "first", nodeIds: ["source"], offsetX: 0, offsetY: 0, sourceIndex: 0, lineNumber: 2 },
    { id: "second", nodeIds: ["target"], offsetX: 0, offsetY: 0, sourceIndex: 1, lineNumber: 8 },
  ];
  const edges = [{ from: "source", to: "target", kind: "branch", layoutDirection: "down", sourceDirection: "right", targetLayoutDirection: "down" }];
  assert.deepEqual(cleanupGraphOffsets(nodes, edges, groups), []);
});

test("cleans a small perpendicular kink between graphs", () => {
  const nodes = [
    { id: "source", x: 100, y: 100, width: 160, height: 60 },
    { id: "target", x: 226, y: 280, width: 160, height: 60 },
  ];
  const groups = [
    { id: "first", nodeIds: ["source"], offsetX: 0, offsetY: 0, sourceIndex: 0, lineNumber: 2 },
    { id: "second", nodeIds: ["target"], offsetX: 0, offsetY: 0, sourceIndex: 1, lineNumber: 8 },
  ];
  const edges = [{ from: "source", to: "target", kind: "branch", layoutDirection: "down", sourceDirection: "right", targetLayoutDirection: "down" }];
  assert.deepEqual(cleanupGraphOffsets(nodes, edges, groups), [
    { id: "second", lineNumber: 8, offsetX: -22, offsetY: 0 },
  ]);
});

test("distributes rendered positions while preserving existing offsets", () => {
  const nodes = [
    { id: "a", x: 10, y: 0, width: 80, height: 20, offsetX: 10, offsetY: 0 },
    { id: "b", x: 120, y: 0, width: 20, height: 20, offsetX: 23, offsetY: 0 },
    { id: "c", x: 210, y: 0, width: 60, height: 20, offsetX: 10, offsetY: 0 },
  ];
  const arranged = arrangeNodeOffsets(nodes, "horizontal");
  assert.deepEqual(arranged.map((node) => node.offsetX), [10, 43, 10]);
  const finalLeft = arranged.map((node, index) => node.x + node.offsetX - nodes[index].offsetX);
  const gaps = [finalLeft[1] - (finalLeft[0] + arranged[0].width), finalLeft[2] - (finalLeft[1] + arranged[1].width)];
  assert.equal(gaps[0], gaps[1]);
});

test("aligns differing node edges through offset deltas", () => {
  const nodes = [
    { id: "a", x: 10, y: 20, width: 80, height: 30, aboveHeight: 0, offsetX: 4, offsetY: 2 },
    { id: "b", x: 40, y: 60, width: 20, height: 10, aboveHeight: 0, offsetX: -3, offsetY: 5 },
  ];
  const right = arrangeNodeOffsets(nodes, "right");
  assert.equal(right[0].x + right[0].width + right[0].offsetX - nodes[0].offsetX, right[1].x + right[1].width + right[1].offsetX - nodes[1].offsetX);
  const bottom = arrangeNodeOffsets(nodes, "bottom");
  assert.equal(bottom[0].y + bottom[0].height + bottom[0].offsetY - nodes[0].offsetY, bottom[1].y + bottom[1].height + bottom[1].offsetY - nodes[1].offsetY);
});

test("suppresses every edge touching a hidden node", () => {
  const nodes = new Map([
    ["visible", { hidden: false }],
    ["hidden", { hidden: true }],
    ["other", { hidden: false }],
  ]);

  assert.equal(edgeIsVisible({ from: "visible", to: "hidden" }, nodes), false);
  assert.equal(edgeIsVisible({ from: "hidden", to: "other" }, nodes), false);
  assert.equal(edgeIsVisible({ from: "visible", to: "other" }, nodes), true);
  assert.equal(edgeIsVisible({ from: "visible", to: "other", hidden: true }, nodes), false);
});

test("packs a disconnected graph below without perturbing the first graph", () => {
  const originalNodes = [
    { id: "a", width: 80, height: 40, layoutHeight: 40 },
    { id: "b", width: 80, height: 40, layoutHeight: 40 },
  ];
  const edges = [{ from: "a", to: "b", kind: "branch", layoutDirection: "right" }];
  const original = layoutDiagram(originalNodes, edges);
  const expanded = layoutDiagram([...originalNodes, { id: "c", width: 260, height: 100, layoutHeight: 100 }, { id: "d", width: 80, height: 40, layoutHeight: 40 }], [...edges, { from: "c", to: "d", kind: "branch", layoutDirection: "down" }]);
  for (const id of ["a", "b"]) {
    const before = original.nodes.find((node) => node.id === id);
    const after = expanded.nodes.find((node) => node.id === id);
    assert.deepEqual({ x: after.x, y: after.y }, { x: before.x, y: before.y });
  }
});
