// Lightweight, dependency-free syntax highlighting for the source editor.
//
// The editor is a plain contenteditable (see text-editor.mjs) so highlighting
// must not rewrite its DOM — that would fight the caret/selection logic and
// undo history. Instead this module tokenizes the plain-text source and paints
// it using the CSS Custom Highlight API (`CSS.highlights`), which draws colors
// over live Ranges without touching a single DOM node. The `sbd-*` highlight
// names are already styled in styles.css; this module is what feeds them.
//
// Works for both source formats used by the app: the Pug-like diagram syntax
// (`node`/`flow`/`stage`, dotted `.field` declarations) and the CSS-shaped
// reusable style sheet (`@node name { field: value; }`).

import { textPosition } from "./text-editor.mjs";

const HIGHLIGHT_NAMES = ["comment", "structure", "attribute", "string", "color", "number", "math"];

const TOKEN_PATTERN = new RegExp(
  [
    String.raw`(?<comment>//[^\n]*|/\*[\s\S]*?\*/)`,
    String.raw`(?<structure>^[ \t]*(?:node|flow|stage)\b|@[a-zA-Z][\w-]*)`,
    String.raw`(?<attribute>^[ \t]*\.[a-zA-Z][\w-]*|^[ \t]*[a-zA-Z][\w-]*(?=\s*:))`,
    String.raw`(?<string>"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')`,
    String.raw`(?<color>#[0-9a-fA-F]{3,8}\b)`,
    String.raw`(?<math>\([^()\n]*\))`,
    String.raw`(?<number>-?\b\d+(?:\.\d+)?\b)`,
  ].join("|"),
  "gm",
);

/** Split source text into highlight tokens: [{ type, start, end }, ...]. */
export function tokenizeSource(text) {
  const tokens = [];
  if (!text) return tokens;
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const type = Object.keys(match.groups).find((name) => match.groups[name] !== undefined);
    if (!type) continue;
    let start = match.index;
    let value = match[0];
    if (type === "structure" || type === "attribute") {
      const trimmed = value.replace(/^[ \t]+/, "");
      start += value.length - trimmed.length;
      value = trimmed;
    }
    tokens.push({ type, start, end: start + value.length });
  }
  return tokens;
}

/**
 * Paint `text` (the current value of a contenteditable `element`) using the
 * CSS Custom Highlight API. No-op when the browser doesn't support it, or
 * when the element's rendered text doesn't match `text` (e.g. mid-update).
 */
export function applyHighlights(element, text) {
  if (typeof CSS === "undefined" || !CSS.highlights) return;
  if (!element || element.textContent !== text) return;
  const ranges = new Map(HIGHLIGHT_NAMES.map((name) => [name, []]));
  for (const token of tokenizeSource(text)) {
    const list = ranges.get(token.type);
    if (!list) continue;
    const range = document.createRange();
    const from = textPosition(element, token.start);
    const to = textPosition(element, token.end);
    range.setStart(from.node, from.offset);
    range.setEnd(to.node, to.offset);
    list.push(range);
  }
  for (const [name, list] of ranges) {
    const key = `sbd-${name}`;
    if (list.length) CSS.highlights.set(key, new Highlight(...list));
    else CSS.highlights.delete(key);
  }
}
