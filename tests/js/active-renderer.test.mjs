import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sharedTrunk } from "../../src/pug_sankey/web/flow-geometry.mjs";

test("the editor and exports use the restored pointed-destination Sankey", () => {
  const api = readFileSync(new URL("../../src/pug_sankey/web/pugflow.mjs", import.meta.url), "utf8");
  assert.match(api, /import \{ renderFlowField \} from "\.\/flowfield\.mjs"/);
  assert.match(api, /currentSvg = renderFlowField\(container, graph, options\)/);
  assert.doesNotMatch(api, /renderFingerprints|renderExchangeField|renderConnectedFlows/);
});

test("terminal arrows belong to the silhouette, without interior direction markers", () => {
  const terminal = sharedTrunk(0, 116, 50, 40, 40, true);
  assert.match(terminal, /L 116 50 L 88 70/);
  assert.doesNotMatch(sharedTrunk(0, 116, 50, 40, 40, false), /L 116 50/);
  const renderer = readFileSync(new URL("../../src/pug_sankey/web/flowfield.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(renderer, /make\("marker"|marker-mid|class: "caret"|class: "chevron"/);
  assert.doesNotMatch(renderer, /fabricStrands|fabric-strand/);
  assert.match(renderer, /class: "channel solid-flow"/);
});
