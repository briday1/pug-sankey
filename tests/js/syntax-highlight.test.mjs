import test from "node:test";
import assert from "node:assert/strict";
import { tokenizeSource } from "../../src/pug_sankey/web/syntax-highlight.mjs";

function typesFor(text) {
  return tokenizeSource(text).map((token) => token.type);
}

test("tokenizes Pug node/flow keywords as structure", () => {
  const tokens = tokenizeSource(`node\n  .id a\nflow\n  .value 10\n`);
  const structure = tokens.filter((t) => t.type === "structure");
  assert.equal(structure.length, 2);
  assert.equal(structure[0].start, 0);
  assert.equal("node".length, structure[0].end - structure[0].start);
});

test("tokenizes dotted fields as attributes without leading whitespace", () => {
  const source = "node\n  .id a\n";
  const tokens = tokenizeSource(source);
  const attribute = tokens.find((t) => t.type === "attribute");
  assert.ok(attribute);
  assert.equal(source.slice(attribute.start, attribute.end), ".id");
});

test("tokenizes line comments, colors, numbers, and tuples", () => {
  const source = `// a note\nnode\n  .color #2563eb\n  .offset (12, -4)\n  .layer 2\n`;
  const types = typesFor(source);
  assert.ok(types.includes("comment"));
  assert.ok(types.includes("color"));
  assert.ok(types.includes("number"));
  assert.ok(types.includes("math"));
});

test("tokenizes CSS-shaped reusable style blocks", () => {
  const source = `@node source {\n  color: #57534e;\n}\n`;
  const tokens = tokenizeSource(source);
  assert.ok(tokens.some((t) => t.type === "structure" && source.slice(t.start, t.end) === "@node"));
  assert.ok(tokens.some((t) => t.type === "attribute" && source.slice(t.start, t.end) === "color"));
  assert.ok(tokens.some((t) => t.type === "color"));
});

test("block comments spanning multiple lines are a single token", () => {
  const source = "/* one\ntwo */\nnode\n";
  const tokens = tokenizeSource(source);
  const comment = tokens.find((t) => t.type === "comment");
  assert.ok(comment);
  assert.equal(source.slice(comment.start, comment.end), "/* one\ntwo */");
});

test("returns no tokens for empty source", () => {
  assert.deepEqual(tokenizeSource(""), []);
  assert.deepEqual(tokenizeSource(undefined), []);
});

test("does not treat digits inside identifiers as numbers", () => {
  const types = typesFor("  .id layer2\n");
  assert.ok(!types.includes("number"));
});
