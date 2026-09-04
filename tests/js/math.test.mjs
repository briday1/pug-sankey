import test from "node:test";
import assert from "node:assert/strict";
import { containsMath, mathTokens } from "../../src/pugflow/web/math-render.mjs";

test("tokenizes inline and display TeX without losing surrounding text", () => {
  assert.deepEqual(mathTokens("Area $x^2 + y_1$ and $$\\frac{-b}{2a}$$"), [
    { kind: "text", text: "Area " },
    { kind: "math", text: "x^2 + y_1", display: false },
    { kind: "text", text: " and " },
    { kind: "math", text: "\\frac{-b}{2a}", display: true },
  ]);
});

test("preserves escaped dollars and unmatched delimiters as text", () => {
  assert.deepEqual(mathTokens("Cost \\$5 and $unfinished"), [{ kind: "text", text: "Cost $5 and $unfinished" }]);
  assert.equal(containsMath("plain text"), false);
  assert.equal(containsMath("$x$"), true);
});
