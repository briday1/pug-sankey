import test from "node:test";
import assert from "node:assert/strict";
import { appendReusableStyle, reusableStyleDeclarations } from "../../src/pugflow/web/reusable-style.mjs";
import { parseDiagram } from "../../src/pugflow/web/parser.mjs";

test("captures supported node, flow, and annotation appearance fields", () => {
  assert.deepEqual(reusableStyleDeclarations("node", {
    shape: "pill", fill: "#fff", outlineWidth: 3, fontSize: 18, image: null,
  }), [
    ["shape", "pill"], ["fill", "#fff"], ["outline-width", "3"], ["font-size", "18"],
  ]);
  assert.deepEqual(reusableStyleDeclarations("flow", {
    color: "#123456", outline: "white", outlineWidth: 1.5, width: 4, roundness: 0, style: "dashed", direction: "both",
  }), [
    ["color", "#123456"], ["outline", "white"], ["outline-width", "1.5"], ["width", "4"], ["roundness", "0"],
    ["stroke-style", "dashed"], ["arrow-style", "both"],
  ]);
  assert.deepEqual(reusableStyleDeclarations("annotation", {
    color: "tomato", fontWeight: "bold", offsetX: 8, offsetY: -2,
  }), [
    ["color", "tomato"], ["font-weight", "bold"], ["offset", "(8, -2)"],
  ]);
});

test("appends a valid reusable CSS rule", () => {
  const css = appendReusableStyle("@node old {\n  shape: round;\n}\n", "flow", "strong_link", [
    ["color", "#2563eb"], ["width", "4"], ["roundness", "0"],
    ["stroke-style", "dotted"], ["arrow-style", "both"],
  ]);
  assert.match(css, /@flow strong_link \{/);
  assert.deepEqual(parseDiagram("#canvas", css).errors, []);
});

test("rejects invalid and duplicate reusable style names", () => {
  assert.throws(() => appendReusableStyle("", "node", "2bad", []), /Type name/);
  assert.throws(() => appendReusableStyle("@node card {\n}\n", "node", "card", []), /already exists/);
  assert.throws(() => appendReusableStyle("@node card {\n}\n", "flow", "card", []), /already exists/);
});
