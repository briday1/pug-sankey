import { parseDiagram } from "./src/pug_sankey/web/parser.mjs";

let failures = 0;
function check(name, condition, detail = "") {
  if (condition) console.log(`PASS ${name}`);
  else { failures++; console.log(`FAIL ${name} ${detail}`); }
}

// 1. Small 2-stage Sankey: 3 nodes, 2 flows, values/colors/ids
const source = `.background #fff
node
  .id sources
  .label Sources
  .color #2563eb
  .layer 0
node
  .id electricity
  .label Electricity
  .layer 1
node
  .id heat
  .label Heat
  .layer 1
flow
  .from sources
  .to electricity
  .value 45
  .color #22c55e
  .label Grid mix
flow
  .from sources
  .to heat
  .value 30
`;
const r1 = parseDiagram(source);
check("basic: no errors", r1.errors.length === 0, JSON.stringify(r1.errors));
check("basic: 3 nodes", r1.nodes.length === 3, JSON.stringify(r1.nodes.map((n) => n.id)));
check("basic: 2 flows", r1.edges.length === 2);
check("basic: groups empty", Array.isArray(r1.groups) && r1.groups.length === 0);
check("basic: format pug", r1.format === "pug");
const f1 = r1.edges[0];
check("flow1 from/to", f1.from === "sources" && f1.to === "electricity");
check("flow1 value", f1.value === 45, String(f1.value));
check("flow1 color", f1.color === "#22c55e", f1.color);
check("flow1 label", f1.label === "Grid mix");
check("flow1 kind", f1.kind === "flow" && f1.declarationKind === "flow" && f1.explicitFlow === true);
check("flow1 lineNumber", f1.lineNumber === 15, String(f1.lineNumber));
check("flow1 labelLineNumber", f1.labelLineNumber === 20, String(f1.labelLineNumber));
const n1 = r1.nodes[0];
check("node1 id/label/color/layer", n1.id === "sources" && n1.explicitId === "sources" && n1.label === "Sources" && n1.color === "#2563eb" && n1.layer === 0);
check("node1 lineNumber", n1.lineNumber === 4, String(n1.lineNumber));
check("figure background", r1.figure.background === "#fff");
check("figure defaults", r1.figure.nodeLabels === true && r1.figure.nodeValues === true && r1.figure.flowLabels === false && r1.figure.flowValues === true && r1.figure.blend === 60);

// auto-id from label
const rAuto = parseDiagram("node\n  .label Cooling Water\n");
check("auto id", rAuto.nodes[0]?.id === "cooling-water", rAuto.nodes[0]?.id);

// 2. missing .value -> error
const r2 = parseDiagram("node\n  .id a\nflow\n  .from a\n  .to a\n");
check("missing value error", r2.errors.some((e) => /every flow needs a \.value/.test(e)), JSON.stringify(r2.errors));
check("missing value: no edge", r2.edges.length === 0);

// 3. unknown .to -> error
const r3 = parseDiagram("node\n  .id a\nflow\n  .from a\n  .to missing\n  .value 5\n");
check("unknown target error", r3.errors.some((e) => e === 'Line 5: flow target "missing" is not defined.'), JSON.stringify(r3.errors));
check("unknown target: no edge", r3.edges.length === 0);

// non-positive value
const r3b = parseDiagram("node\n  .id a\nflow\n  .from a\n  .to a\n  .value -3\n");
check("non-positive value error", r3b.errors.some((e) => /flow value must be a positive number/.test(e)), JSON.stringify(r3b.errors));

// 4. canvas settings land on figure
const r4 = parseDiagram(".node-labels hide\n.node-values hide\n.flow-labels show\n.flow-values hide\n.blend 25\nnode\n  .id a\n");
check("settings on figure", r4.figure.nodeLabels === false && r4.figure.nodeValues === false && r4.figure.flowLabels === true && r4.figure.flowValues === false && r4.figure.blend === 25, JSON.stringify(r4.figure));

// 5. reusable @flow style applies color via nesting
const r5 = parseDiagram(`@flow my_flow
  .color #ef4444
node
  .id a
node
  .id b
flow
  .my_flow
  .from a
  .to b
  .value 10
`);
check("@flow style applied", r5.edges[0]?.color === "#ef4444", JSON.stringify([r5.errors, r5.edges[0]?.color]));

// @node style + @annotation style
const r6 = parseDiagram(`@node my_node
  .color #245886
@annotation my_note
  .color #f59e0b
node
  .my_node
  .id a
  .label A
  .annotation
    .my_note
    .above
      | Note text
`);
check("@node style applied", r6.nodes[0]?.color === "#245886", JSON.stringify([r6.errors, r6.nodes[0]?.color]));
check("@annotation style applied", r6.nodes[0]?.annotations[0]?.color === "#f59e0b" && r6.nodes[0].annotations[0].text === "Note text" && r6.nodes[0].annotations[0].position === "above", JSON.stringify(r6.nodes[0]?.annotations));

// stage pass-through container
const r7 = parseDiagram(`stage
  node
    .id a
    .label A
  node
    .id b
    .label B
flow
  .from a
  .to b
  .value 7
`);
check("stage collects nodes", r7.nodes.length === 2 && r7.groups.length === 0 && r7.edges.length === 1, JSON.stringify(r7.errors));

// graph rejected with helpful error
const r8 = parseDiagram("graph\n  node\n    .id a\n");
check("graph rejected", r8.errors.some((e) => /"graph" is not supported in Sankey diagrams/.test(e)), JSON.stringify(r8.errors));

// CSS style sheet path (@flow via styleSource)
const r9 = parseDiagram(`node
  .id a
node
  .id b
flow
  .hot
  .from a
  .to b
  .value 3
`, `@flow hot { color: #123456; }`);
check("styleSource @flow applied", r9.edges[0]?.color === "#123456", JSON.stringify([r9.errors, r9.edges[0]?.color]));
check("styleSource line numbers unshifted", r9.edges[0]?.lineNumber === 5, String(r9.edges[0]?.lineNumber));

// duplicate id error
const r10 = parseDiagram("node\n  .id a\nnode\n  .id a\n");
check("duplicate id error", r10.errors.some((e) => /already in use/.test(e)), JSON.stringify(r10.errors));

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL CHECKS PASSED");
process.exit(failures ? 1 : 0);
