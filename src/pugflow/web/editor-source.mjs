function offsetNumber(value) {
  const rounded = Math.round(value * 10) / 10;
  return Math.abs(rounded) < 0.05 ? "0" : String(rounded);
}

function indentationWidth(line) {
  const whitespace = line.match(/^\s*/)?.[0] ?? "";
  return [...whitespace].reduce((width, character) => width + (character === "\t" ? 2 : 1), 0);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function offsetTuple(x, y) {
  return "(" + offsetNumber(x) + ", " + offsetNumber(y) + ")";
}

export function indentSourceSelection(value, selectionStart, selectionEnd, outdent = false) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const lastCharacter = selectionEnd > selectionStart && value[selectionEnd - 1] === "\n" ? selectionEnd - 1 : selectionEnd;
  const newline = value.indexOf("\n", lastCharacter);
  const lineEnd = newline < 0 ? value.length : newline;
  const original = value.slice(lineStart, lineEnd);
  const lines = original.split("\n");
  const transformed = lines.map((line) => outdent ? line.replace(/^(?:  |\t)/, "") : `  ${line}`).join("\n");
  const nextValue = value.slice(0, lineStart) + transformed + value.slice(lineEnd);
  if (selectionStart === selectionEnd) {
    const firstDelta = transformed.split("\n")[0].length - lines[0].length;
    const caret = Math.max(lineStart, selectionStart + firstDelta);
    return { value: nextValue, start: caret, end: caret };
  }
  return { value: nextValue, start: lineStart, end: lineStart + transformed.length };
}

export function setNodeOffsetField(value, labelLineNumber, prefix, x, y) {
  const lines = value.split("\n");
  const labelIndex = labelLineNumber - 1;
  if (/^\s*image(?:\s|$)/.test(lines[labelIndex] ?? "")) {
    return setChildOffsetField(value, labelLineNumber, `.${prefix}`, x, y);
  }
  const indentation = lines[labelIndex]?.match(/^\s*/)?.[0] ?? "";
  if (lines[labelIndex]?.trim().match(/^\.label(?:\s|$)/)) {
    const propertyIndent = indentationWidth(lines[labelIndex]);
    let nodeIndex = labelIndex - 1;
    while (nodeIndex >= 0 && indentationWidth(lines[nodeIndex]) >= propertyIndent) nodeIndex -= 1;
    const nodeType = lines[nodeIndex]?.trim() ?? "node";
    if (/^\.[a-zA-Z][\w-]*$/.test(nodeType) || /^[a-zA-Z][\w-]*$/.test(nodeType)) {
      let end = nodeIndex + 1;
      while (end < lines.length && indentationWidth(lines[end]) > indentationWidth(lines[nodeIndex])) end += 1;
      const pattern = new RegExp("^" + escapeRegExp(indentation) + "\\." + escapeRegExp(prefix) + "(?:\\s|$)");
      const existing = lines.findIndex((line, index) => index > nodeIndex && index < end && pattern.test(line));
      const field = indentation + "." + prefix + " " + offsetTuple(x, y);
      if (existing >= 0) lines[existing] = field;
      else lines.splice(labelIndex, 0, field);
      return lines.join("\n");
    }
  }
  const tag = lines[labelIndex]?.trim().match(/^([a-zA-Z][\w-]*)\.label(?:\s|$)/)?.[1] ?? "node";
  const indentWidth = indentationWidth(lines[labelIndex] ?? "");
  let start = labelIndex;
  while (start > 0 && indentationWidth(lines[start - 1]) >= indentWidth) start -= 1;
  let end = labelIndex + 1;
  while (end < lines.length && indentationWidth(lines[end]) >= indentWidth) end += 1;
  const pattern = new RegExp("^" + escapeRegExp(indentation) + "[a-zA-Z][\\w-]*\\." + escapeRegExp(prefix) + "(?:\\s|$)");
  const existing = lines.findIndex((line, index) => index >= start && index < end && pattern.test(line));
  const field = indentation + tag + "." + prefix + " " + offsetTuple(x, y);
  if (existing >= 0) lines[existing] = field;
  else lines.splice(labelIndex, 0, field);
  return lines.join("\n");
}

function setChildOffsetField(value, declarationLineNumber, fieldName, x, y) {
  const lines = value.split("\n");
  const declarationIndex = declarationLineNumber - 1;
  const declarationIndent = indentationWidth(lines[declarationIndex] ?? "");
  const indentation = (lines[declarationIndex]?.match(/^\s*/)?.[0] ?? "") + "  ";
  let end = declarationIndex + 1;
  while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > declarationIndent)) end += 1;
  const pattern = new RegExp("^" + escapeRegExp(indentation) + escapeRegExp(fieldName) + "(?:\\s|$)");
  const existing = lines.findIndex((line, index) => index > declarationIndex && index < end && pattern.test(line));
  const field = indentation + fieldName + " " + offsetTuple(x, y);
  if (existing >= 0) lines[existing] = field;
  else lines.splice(declarationIndex + 1, 0, field);
  return lines.join("\n");
}

export function setStructuralOffsetField(value, declarationLineNumber, x, y) {
  const lines = value.split("\n");
  const declarationIndex = declarationLineNumber - 1;
  const parentIndent = indentationWidth(lines[declarationIndex] ?? "");
  const childWhitespace = (lines[declarationIndex]?.match(/^\s*/)?.[0] ?? "") + "  ";
  let end = declarationIndex + 1;
  while (end < lines.length && indentationWidth(lines[end]) > parentIndent) end += 1;
  const field = childWhitespace + ".label-offset " + offsetTuple(x, y);
  const directExisting = lines.findIndex((line, index) => index > declarationIndex && index < end
    && indentationWidth(line) === parentIndent + 2 && line.trim().match(/^\.label-offset(?:\s|$)/));
  if (directExisting >= 0) {
    lines[directExisting] = field;
    return lines.join("\n");
  }
  const compactLegacy = lines.findIndex((line, index) => index > declarationIndex && index < end
    && indentationWidth(line) === parentIndent + 2 && line.trim().match(/^\.line\.label-offset(?:\s|$)/));
  if (compactLegacy >= 0) {
    lines[compactLegacy] = field;
    return lines.join("\n");
  }
  const lineGroup = lines.findIndex((line, index) => index > declarationIndex && index < end
    && indentationWidth(line) === parentIndent + 2 && line.trim() === ".line");
  if (lineGroup >= 0) {
    let lineEnd = lineGroup + 1;
    while (lineEnd < end && indentationWidth(lines[lineEnd]) > parentIndent + 2) lineEnd += 1;
    const nestedLegacy = lines.findIndex((line, index) => index > lineGroup && index < lineEnd
      && indentationWidth(line) === parentIndent + 4 && line.trim().match(/^\.label-offset(?:\s|$)/));
    if (nestedLegacy >= 0) lines.splice(nestedLegacy, 1);
  }
  lines.splice(declarationIndex + 1, 0, field);
  return lines.join("\n");
}

export function setStructuralField(value, declarationLineNumber, field, fieldValue) {
  const lines = value.split("\n");
  const index = declarationLineNumber - 1;
  const indent = indentationWidth(lines[index] ?? "");
  const whitespace = (lines[index]?.match(/^\s*/)?.[0] ?? "") + "  ";
  let end = index + 1;
  while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > indent)) end += 1;
  const pattern = new RegExp("^" + escapeRegExp(whitespace) + "\\." + escapeRegExp(field) + "(?:\\s|$)");
  const existing = lines.findIndex((line, candidate) => candidate > index && candidate < end && pattern.test(line));
  const replacement = whitespace + "." + field + " " + fieldValue;
  if (existing >= 0) lines[existing] = replacement;
  else lines.splice(index + 1, 0, replacement);
  return lines.join("\n");
}

function setReusableLine(value, start, end, fieldIndent, type, knownTypes) {
  const lines = value.split("\n");
  const names = new Set(knownTypes);
  const existing = lines.findIndex((line, index) => index > start && index < end
    && indentationWidth(line) === indentationWidth(fieldIndent)
    && names.has(line.trim().slice(1))
    && /^\.[a-zA-Z][\w-]*$/.test(line.trim()));
  const replacement = fieldIndent + "." + type;
  if (existing >= 0) lines[existing] = replacement;
  else lines.splice(start + 1, 0, replacement);
  const baseIndent = indentationWidth(fieldIndent);
  const appearance = new Set([
    "color", "outline", "outline-width", "width", "roundness", "stroke-style", "arrow-style", "arrow-shape",
    "arrow-height", "arrow-head-width", "label-position", "shadow-color", "shadow-offset-x", "shadow-offset-y",
    "shadow-blur", "shadow-opacity", "font-family", "font-size", "font-weight", "font-style", "text-decoration",
    "text-outline", "text-outline-width",
  ]);
  const appearancePattern = [...appearance].join("|");
  for (let index = lines.length - 1; index > start; index -= 1) {
    if (index >= end + (existing < 0 ? 1 : 0)) continue;
    const indent = indentationWidth(lines[index]);
    const text = lines[index].trim();
    if (indent === baseIndent && appearance.has(text.match(/^\.([\w-]+)/)?.[1])) {
      lines.splice(index, 1);
      continue;
    }
    if (indent === baseIndent && new RegExp(`^\\.line\\.(${appearancePattern})(?:\\s|$)`).test(text)) {
      lines.splice(index, 1);
      continue;
    }
    if (indent === baseIndent + 2 && appearance.has(text.match(/^\.([\w-]+)/)?.[1])) {
      let parent = index - 1;
      while (parent > start && indentationWidth(lines[parent]) >= indent) parent -= 1;
      const parentName = lines[parent]?.trim().slice(1);
      if (lines[parent]?.trim() === ".line" || names.has(parentName) || parentName === type) lines.splice(index, 1);
    }
  }
  for (let index = lines.length - 1; index > start; index -= 1) {
    if (indentationWidth(lines[index]) === baseIndent && lines[index].trim() === ".line") {
      const next = lines[index + 1];
      if (!next || indentationWidth(next) <= baseIndent) lines.splice(index, 1);
    }
  }
  return lines.join("\n");
}

export function setStructuralLineType(value, declarationLineNumber, type, knownTypes) {
  const lines = value.split("\n");
  const start = declarationLineNumber - 1;
  const indent = indentationWidth(lines[start] ?? "");
  let end = start + 1;
  while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > indent)) end += 1;
  const fieldIndent = (lines[start]?.match(/^\s*/)?.[0] ?? "") + "  ";
  return setReusableLine(value, start, end, fieldIndent, type, knownTypes);
}

export function setAnnotationOffsetField(value, declarationLineNumber, x, y) {
  return setChildOffsetField(value, declarationLineNumber, ".offset", x, y);
}

export function setAnnotationText(value, declarationLineNumber, text) {
  const lines = value.split("\n");
  const index = declarationLineNumber - 1;
  const declaration = lines[index] ?? "";
  const match = declaration.match(/^(\s*)\.(above|below|annotation)(?:\s.*)?$/);
  if (!match) return value;
  const indent = indentationWidth(declaration);
  const childIndent = indent + 2;
  let end = index + 1;
  while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > indent)) end += 1;
  for (let line = end - 1; line > index; line -= 1) {
    if (indentationWidth(lines[line]) === childIndent && /^\|(?:\s|$)/.test(lines[line].trim())) lines.splice(line, 1);
  }
  const values = String(text).replace(/\r/g, "").split("\n");
  if (values.length === 1) lines[index] = `${match[1]}.${match[2]}${values[0] ? ` ${values[0]}` : ""}`;
  else {
    lines[index] = `${match[1]}.${match[2]}`;
    lines.splice(index + 1, 0, ...values.map((line) => `${match[1]}  |${line ? ` ${line}` : ""}`));
  }
  return lines.join("\n");
}

export function setAnnotationPosition(value, declarationLineNumber, position) {
  if (!new Set(["above", "below"]).has(position)) return value;
  const lines = value.split("\n");
  const index = declarationLineNumber - 1;
  lines[index] = (lines[index] ?? "").replace(/^(\s*)\.(?:above|below)(?=\s|$)/, `$1.${position}`);
  return lines.join("\n");
}

function ensureNodeAnnotation(value, labelLineNumber, position) {
  const lines = value.split("\n");
  const range = nodeRange(lines, labelLineNumber);
  const annotationIndent = indentationWidth(range.fieldIndent);
  let group = lines.findIndex((line, index) => index > range.start && index < range.end
    && indentationWidth(line) === annotationIndent && line.trim() === ".annotation");
  if (group < 0) {
    lines.splice(range.start + 1, 0, `${range.fieldIndent}.annotation`, `${range.fieldIndent}  .${position}`);
    return { value: lines.join("\n"), lineNumber: range.start + 3 };
  }
  let groupEnd = group + 1;
  while (groupEnd < lines.length && indentationWidth(lines[groupEnd]) > annotationIndent) groupEnd += 1;
  const entryIndent = annotationIndent + 2;
  const existing = lines.findIndex((line, index) => index > group && index < groupEnd
    && indentationWidth(line) === entryIndent && new RegExp(`^\\.${position}(?:\\s|$)`).test(line.trim()));
  if (existing >= 0) return { value, lineNumber: existing + 1 };
  lines.splice(groupEnd, 0, `${range.fieldIndent}  .${position}`);
  return { value: lines.join("\n"), lineNumber: groupEnd + 1 };
}

export function setNodeAnnotationText(value, labelLineNumber, position, text) {
  const annotation = ensureNodeAnnotation(value, labelLineNumber, position);
  return setAnnotationText(annotation.value, annotation.lineNumber, text);
}

export function setNodeAnnotationField(value, labelLineNumber, position, field, fieldValue) {
  const annotation = ensureNodeAnnotation(value, labelLineNumber, position);
  return setStructuralField(annotation.value, annotation.lineNumber, field, fieldValue);
}

export function appendNodeAnnotation(value, labelLineNumber, { position = "above", text = "Annotation", type = "", color = "", fontSize = "", fontFamily = "", fontWeight = "", fontStyle = "", textDecoration = "", textOutline = "", textOutlineWidth = "" } = {}) {
  const lines = value.split("\n");
  const range = nodeRange(lines, labelLineNumber);
  const annotationIndent = indentationWidth(range.fieldIndent);
  const annotationLines = [
    `${range.fieldIndent}  .${position} ${text}`,
    ...(type ? [`${range.fieldIndent}    .${type}`] : []),
    ...(color ? [`${range.fieldIndent}    .color ${color}`] : []),
    ...(fontSize ? [`${range.fieldIndent}    .font-size ${fontSize}`] : []),
    ...(fontFamily ? [`${range.fieldIndent}    .font-family ${fontFamily}`] : []),
    ...(fontWeight ? [`${range.fieldIndent}    .font-weight ${fontWeight}`] : []),
    ...(fontStyle ? [`${range.fieldIndent}    .font-style ${fontStyle}`] : []),
    ...(textDecoration ? [`${range.fieldIndent}    .text-decoration ${textDecoration}`] : []),
    ...(textOutline ? [`${range.fieldIndent}    .text-outline ${textOutline}`] : []),
    ...(textOutlineWidth ? [`${range.fieldIndent}    .text-outline-width ${textOutlineWidth}`] : []),
  ];
  let group = lines.findIndex((line, index) => index > range.start && index < range.end
    && indentationWidth(line) === annotationIndent && line.trim() === ".annotation");
  if (group < 0) {
    lines.splice(range.start + 1, 0, `${range.fieldIndent}.annotation`, ...annotationLines);
    return lines.join("\n");
  }
  let groupEnd = group + 1;
  while (groupEnd < lines.length && (!lines[groupEnd].trim() || indentationWidth(lines[groupEnd]) > annotationIndent)) groupEnd += 1;
  lines.splice(groupEnd, 0, ...annotationLines);
  return lines.join("\n");
}

/** Append an independently styled annotation directly inside a flow. */
export function appendFlowAnnotation(value, flowLineNumber, { text = "Annotation", type = "", color = "", fontSize = "", fontFamily = "", fontWeight = "", fontStyle = "", textDecoration = "", textOutline = "", textOutlineWidth = "" } = {}) {
  const lines = value.split("\n");
  const flowIndex = flowLineNumber - 1;
  const flowIndent = indentationWidth(lines[flowIndex] ?? "");
  const indentation = (lines[flowIndex]?.match(/^\s*/)?.[0] ?? "") + "  ";
  let end = flowIndex + 1;
  while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > flowIndent)) end += 1;
  const annotation = [
    `${indentation}.annotation ${text}`,
    ...(type ? [`${indentation}  .${type}`] : []),
    ...(color ? [`${indentation}  .color ${color}`] : []),
    ...(fontSize ? [`${indentation}  .font-size ${fontSize}`] : []),
    ...(fontFamily ? [`${indentation}  .font-family ${fontFamily}`] : []),
    ...(fontWeight ? [`${indentation}  .font-weight ${fontWeight}`] : []),
    ...(fontStyle ? [`${indentation}  .font-style ${fontStyle}`] : []),
    ...(textDecoration ? [`${indentation}  .text-decoration ${textDecoration}`] : []),
    ...(textOutline ? [`${indentation}  .text-outline ${textOutline}`] : []),
    ...(textOutlineWidth ? [`${indentation}  .text-outline-width ${textOutlineWidth}`] : []),
  ];
  lines.splice(end, 0, ...annotation);
  return lines.join("\n");
}

export function removeNodeAnnotation(value, declarationLineNumber) {
  const lines = removeDeclaration(value, declarationLineNumber).split("\n");
  const removedIndex = declarationLineNumber - 1;
  for (let index = Math.min(removedIndex - 1, lines.length - 1); index >= 0; index -= 1) {
    if (lines[index].trim() !== ".annotation") continue;
    const indent = indentationWidth(lines[index]);
    let end = index + 1;
    while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > indent)) end += 1;
    const hasAnnotations = lines.slice(index + 1, end).some((line) => /^\.(?:above|below)(?:\s|$)/.test(line.trim()) && indentationWidth(line) === indent + 2);
    if (!hasAnnotations) lines.splice(index, 1);
    break;
  }
  return lines.join("\n");
}

export function setDeclarationOffsetField(value, declarationLineNumber, x, y) {
  return setChildOffsetField(value, declarationLineNumber, ".offset", x, y);
}

function nodeRange(lines, labelLineNumber) {
  const labelIndex = labelLineNumber - 1;
  if (/^\s*image(?:\s|$)/.test(lines[labelIndex] ?? "")) {
    const indent = indentationWidth(lines[labelIndex]);
    let end = labelIndex + 1;
    while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > indent)) end += 1;
    return { start: labelIndex, end, fieldIndent: (lines[labelIndex].match(/^\s*/)?.[0] ?? "") + "  " };
  }
  const propertyIndent = indentationWidth(lines[labelIndex] ?? "");
  let start = labelIndex - 1;
  while (start >= 0 && indentationWidth(lines[start]) >= propertyIndent) start -= 1;
  if (start < 0) start = labelIndex;
  const indent = indentationWidth(lines[start]);
  let end = start + 1;
  while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > indent)) end += 1;
  return { start, end, fieldIndent: (lines[start].match(/^\s*/)?.[0] ?? "") + "  " };
}

export function setNodeField(value, labelLineNumber, field, fieldValue) {
  const lines = value.split("\n");
  const range = nodeRange(lines, labelLineNumber);
  const pattern = new RegExp("^" + escapeRegExp(range.fieldIndent) + "\\." + escapeRegExp(field) + "(?:\\s|$)");
  const existing = lines.findIndex((line, index) => index > range.start && index < range.end && pattern.test(line));
  const replacement = range.fieldIndent + "." + field + (fieldValue === "" ? "" : " " + fieldValue);
  if (existing >= 0) {
    let removeTo = existing + 1;
    while (removeTo < lines.length && indentationWidth(lines[removeTo]) > indentationWidth(lines[existing])) removeTo += 1;
    lines.splice(existing, removeTo - existing, replacement);
  } else if (field.startsWith("line.")) {
    const lineIndex = lines.findIndex((line, index) => index > range.start && index < range.end
      && indentationWidth(line) === indentationWidth(range.fieldIndent) && line.trim() === ".line");
    if (lineIndex >= 0) {
      const nestedIndent = range.fieldIndent + "  ";
      const nestedField = field.slice(5);
      const nestedPattern = new RegExp("^" + escapeRegExp(nestedIndent) + "\\." + escapeRegExp(nestedField) + "(?:\\s|$)");
      let lineEnd = lineIndex + 1;
      while (lineEnd < range.end && indentationWidth(lines[lineEnd]) > indentationWidth(range.fieldIndent)) lineEnd += 1;
      const nestedExisting = lines.findIndex((line, index) => index > lineIndex && index < lineEnd && nestedPattern.test(line));
      const nestedReplacement = nestedIndent + "." + nestedField + (fieldValue === "" ? "" : " " + fieldValue);
      if (nestedExisting >= 0) lines[nestedExisting] = nestedReplacement;
      else lines.splice(lineIndex + 1, 0, nestedReplacement);
    } else lines.splice(range.start + 1, 0, replacement);
  } else lines.splice(range.start + 1, 0, replacement);
  return lines.join("\n");
}


export function setNodeGeometry(value, declarationLineNumber, width, height, offsetX, offsetY) {
  let next = setNodeField(value, declarationLineNumber, "width", offsetNumber(width));
  next = setNodeField(next, declarationLineNumber, "height", offsetNumber(height));
  return setNodeField(next, declarationLineNumber, "offset", offsetTuple(offsetX, offsetY));
}

export const setImageGeometry = setNodeGeometry;

export function setGraphGeometry(value, declarationLineNumber, width, height, offsetX = 0, offsetY = 0) {
  let next = setStructuralField(value, declarationLineNumber, "width", offsetNumber(width));
  next = setStructuralField(next, declarationLineNumber, "height", offsetNumber(height));
  return setStructuralField(next, declarationLineNumber, "frame-offset", offsetTuple(offsetX, offsetY));
}

export function removeNodeField(value, labelLineNumber, field) {
  const lines = value.split("\n");
  const range = nodeRange(lines, labelLineNumber);
  const pattern = new RegExp("^" + escapeRegExp(range.fieldIndent) + "\\." + escapeRegExp(field) + "(?:\\s|$)");
  const existing = lines.findIndex((line, index) => index > range.start && index < range.end && pattern.test(line));
  if (existing >= 0) lines.splice(existing, 1);
  return lines.join("\n");
}

/** Node field and group names that can never be a reusable `@node` class reference. */
const NODE_RESERVED_NAMES = new Set([
  "node", "flow", "line", "annotation", "branch", "merge", "graph", "defaults", "above", "below",
  "id", "label", "layer", "hidden", "offset", "label-offset", "from", "to",
  "shape", "fill", "color", "outline", "outline-style", "outline-width", "width", "height", "align",
  "top-ports", "right-ports", "bottom-ports", "left-ports",
  "shadow-color", "shadow-offset-x", "shadow-offset-y", "shadow-blur", "shadow-opacity",
  "font-family", "font-size", "font-weight", "font-style", "text-decoration", "text-outline", "text-outline-width",
]);

/** A bare `.name` child line that applies a reusable node class. */
function nodePresetName(line, knownTypes) {
  const name = line.trim().match(/^\.([A-Za-z][\w-]*)$/)?.[1];
  if (!name) return null;
  if (knownTypes.has(name)) return name;
  return NODE_RESERVED_NAMES.has(name) ? null : name;
}

/**
 * Apply (or clear) a reusable `@node` class. Declarations are normalized to the
 * `node` keyword with the class nested inside, mirroring `flow`.
 */
export function setNodeType(value, labelLineNumber, type, knownTypes = []) {
  const lines = value.split("\n");
  const range = nodeRange(lines, labelLineNumber);
  const indentation = lines[range.start].match(/^\s*/)?.[0] ?? "";
  const names = new Set(knownTypes.map((name) => String(name).replace(/^\./, "")));
  lines[range.start] = indentation + "node";
  let end = range.end;
  const styleFields = new Set([
    "shape", "fill", "color", "outline", "outline-style", "outline-width", "width", "height", "align",
    "shadow-color", "shadow-offset-x", "shadow-offset-y", "shadow-blur", "shadow-opacity",
  ]);
  for (let index = end - 1; index > range.start; index -= 1) {
    if (indentationWidth(lines[index]) !== indentationWidth(range.fieldIndent)) continue;
    const presetName = nodePresetName(lines[index], names);
    const field = lines[index].trim().match(/^\.([\w-]+)(?:\s|$)/)?.[1];
    if (!presetName && !styleFields.has(field)) continue;
    let removeTo = index + 1;
    while (removeTo < lines.length && indentationWidth(lines[removeTo]) > indentationWidth(lines[index])) removeTo += 1;
    lines.splice(index, removeTo - index);
    end -= removeTo - index;
  }
  const nextType = String(type ?? "").replace(/^\./, "");
  if (nextType && nextType !== "node") lines.splice(range.start + 1, 0, range.fieldIndent + "." + nextType);
  return lines.join("\n");
}

/** Apply (or clear) a reusable @graph class on a graph declaration. */
export function setGraphType(value, graphLineNumber, type, knownTypes = []) {
  const lines = value.split("\n");
  const start = graphLineNumber - 1;
  if (!lines[start]) return value;
  const indent = indentationWidth(lines[start]);
  const fieldIndent = (lines[start].match(/^\s*/)?.[0] ?? "") + "  ";
  let end = start + 1;
  while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > indent)) end += 1;
  const names = new Set(knownTypes);
  const existing = lines.findIndex((line, index) => index > start && index < end
    && indentationWidth(line) === indentationWidth(fieldIndent)
    && /^\.[a-zA-Z][\w-]*$/.test(line.trim())
    && names.has(line.trim().slice(1)));
  if (!type) {
    if (existing >= 0) lines.splice(existing, 1);
    return lines.join("\n");
  }
  const replacement = fieldIndent + "." + type.replace(/^\./, "");
  if (existing >= 0) lines[existing] = replacement;
  else lines.splice(start + 1, 0, replacement);
  return lines.join("\n");
}

function nodeDeclaration(type, indentation, id, label) {
  const nodeType = String(type ?? "node").replace(/^\./, "");
  return [
    `${indentation}node`,
    ...(nodeType && nodeType !== "node" ? [`${indentation}  .${nodeType}`] : []),
    ...(id ? [`${indentation}  .id ${id}`] : []),
    `${indentation}  .label${label ? ` ${label}` : ""}`,
  ];
}

export function ensureGraphComponents(value) {
  const lines = value.split("\n");
  const rootIndex = lines.findIndex((line) => /^#(?:canvas|diagram)(?:\(|$)/.test(line.trim()));
  if (rootIndex < 0) return value;
  const rootIndent = indentationWidth(lines[rootIndex]);
  let end = rootIndex + 1;
  while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > rootIndent)) end += 1;
  const childWidth = rootIndent + 2;
  if (lines.some((line, index) => index > rootIndex && index < end && indentationWidth(line) === childWidth && line.trim() === "graph")) return value;
  const settings = new Set([".background", ".font", ".annotation", ".defaults"]);
  const firstGraphChild = lines.findIndex((line, index) => index > rootIndex && index < end
    && indentationWidth(line) === childWidth && !settings.has(line.trim().split(/\s/)[0]));
  if (firstGraphChild < 0) return value;
  const indentation = (lines[rootIndex].match(/^\s*/)?.[0] ?? "") + "  ";
  const graphBlock = lines.slice(firstGraphChild, end).map((line) => "  " + line);
  lines.splice(firstGraphChild, end - firstGraphChild, `${indentation}graph`, ...graphBlock);
  return lines.join("\n");
}

function appendToContainer(lines, containerLineNumber, declarations) {
  if (containerLineNumber <= 0) {
    while (lines.length && !lines.at(-1).trim()) lines.pop();
    if (lines.length) lines.push("");
    lines.push(...declarations(""));
    return;
  }
  const start = containerLineNumber - 1;
  const indentation = (lines[start]?.match(/^\s*/)?.[0] ?? "") + "  ";
  const containerIndent = indentationWidth(lines[start] ?? "");
  let end = start + 1;
  while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > containerIndent)) end += 1;
  lines.splice(end, 0, ...declarations(indentation));
}

function flowDeclaration(indentation, { from = "", to = "", direction = "right", fromDirection = direction, toDirection = fromDirection, lineType = "" } = {}) {
  const fieldIndent = indentation + "  ";
  return [
    `${indentation}flow`,
    `${fieldIndent}.from ${from}`,
    `${fieldIndent}.to ${to}`,
    `${fieldIndent}.from-direction ${fromDirection}`,
    `${fieldIndent}.to-direction ${toDirection}`,
    ...(lineType ? [`${fieldIndent}.${lineType.replace(/^\./, "")}`] : []),
  ];
}

export function appendGraphNode(value, graphLineNumber, { nodeType = "node", id = "", label = "" } = {}) {
  const lines = value.split("\n");
  appendToContainer(lines, graphLineNumber, (indentation) => nodeDeclaration(nodeType, indentation, id, label));
  return lines.join("\n");
}

export function appendGraphImage(value, graphLineNumber, { id = "", source = "", width = 64, height = 64 } = {}) {
  const lines = value.split("\n");
  appendToContainer(lines, graphLineNumber, (indentation) => [
    `${indentation}image`,
    `${indentation}  .id ${id}`,
    `${indentation}  .source ${source}`,
    `${indentation}  .width ${width}`,
    `${indentation}  .height ${height}`,
  ]);
  return lines.join("\n");
}

export function appendFlowReference(value, scopeLineNumber, options = {}) {
  const lines = value ? value.split("\n") : [];
  appendToContainer(lines, scopeLineNumber, (indentation) => flowDeclaration(indentation, options));
  return lines.join("\n");
}

export function moveDeclarationToContainer(value, declarationLineNumber, containerLineNumber) {
  const lines = value.split("\n");
  const start = declarationLineNumber - 1;
  const originalIndent = lines[start]?.match(/^\s*/)?.[0] ?? "";
  const indent = indentationWidth(lines[start] ?? "");
  let end = start + 1;
  while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > indent)) end += 1;
  const block = lines.slice(start, end);
  lines.splice(start, end - start);
  if (containerLineNumber <= 0) {
    while (lines.length && !lines.at(-1).trim()) lines.pop();
    if (lines.length) lines.push("");
    lines.push(...block.map((line) => line.slice(originalIndent.length)));
    return lines.join("\n");
  }
  let containerIndex = containerLineNumber - 1;
  if (start < containerIndex) containerIndex -= block.length;
  const containerIndent = indentationWidth(lines[containerIndex] ?? "");
  let containerEnd = containerIndex + 1;
  while (containerEnd < lines.length && (!lines[containerEnd].trim() || indentationWidth(lines[containerEnd]) > containerIndent)) containerEnd += 1;
  const targetIndent = (lines[containerIndex]?.match(/^\s*/)?.[0] ?? "") + "  ";
  lines.splice(containerEnd, 0, ...block.map((line) => targetIndent + line.slice(originalIndent.length)));
  return lines.join("\n");
}

export function moveNodeToGraph(value, labelLineNumber, graphLineNumber) {
  const lines = value.split("\n");
  const node = nodeRange(lines, labelLineNumber);
  const originalIndent = lines[node.start]?.match(/^\s*/)?.[0] ?? "";
  const block = lines.slice(node.start, node.end);
  lines.splice(node.start, node.end - node.start);
  let graphIndex = graphLineNumber - 1;
  if (node.start < graphIndex) graphIndex -= block.length;
  const graphIndent = indentationWidth(lines[graphIndex] ?? "");
  let graphEnd = graphIndex + 1;
  while (graphEnd < lines.length && (!lines[graphEnd].trim() || indentationWidth(lines[graphEnd]) > graphIndent)) graphEnd += 1;
  const targetIndent = (lines[graphIndex]?.match(/^\s*/)?.[0] ?? "") + "  ";
  lines.splice(graphEnd, 0, ...block.map((line) => targetIndent + line.slice(originalIndent.length)));
  return lines.join("\n");
}

export function appendDiagramNode(value, { nodeType = "node", id = "", label = "", diagramId = "", diagramLabel = "", diagramPlacement = "", diagramRelativeTo = "", diagramFill = "", diagramOutline = "" } = {}) {
  let lines = ensureGraphComponents(value).split("\n");
  const rootIndex = lines.findIndex((line) => /^#(?:canvas|diagram)(?:\(|$)/.test(line.trim()));
  if (rootIndex < 0) {
    if (lines.length === 1 && !lines[0]) lines = [];
    while (lines.length && !lines.at(-1).trim()) lines.pop();
    if (lines.length) lines.push("");
    lines.push("graph",
      ...(diagramId ? [`  .id ${diagramId}`] : []),
      ...(diagramLabel ? [`  .label ${diagramLabel}`] : []),
      ...(diagramRelativeTo ? [`  .placement ${diagramPlacement || "below"}`, `  .relative-to ${diagramRelativeTo}`] : []),
      ...(diagramFill ? [`  .fill ${diagramFill}`] : []),
      ...(diagramOutline ? [`  .outline ${diagramOutline}`] : []),
      ...nodeDeclaration(nodeType, "  ", id, label));
    return lines.join("\n");
  }
  const rootIndent = indentationWidth(lines[rootIndex]);
  let end = rootIndex + 1;
  while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > rootIndent)) end += 1;
  const indentation = (lines[rootIndex].match(/^\s*/)?.[0] ?? "") + "  ";
  const fieldIndent = indentation + "  ";
  const childWidth = rootIndent + 2;
  const alreadyComponentized = lines.some((line, index) => index > rootIndex && index < end
    && indentationWidth(line) === childWidth && line.trim() === "graph");
  if (!alreadyComponentized) {
    const settings = new Set([".background", ".font", ".annotation", ".defaults"]);
    const firstGraphChild = lines.findIndex((line, index) => index > rootIndex && index < end
      && indentationWidth(line) === childWidth && !settings.has(line.trim().split(/\s/)[0]));
    if (firstGraphChild >= 0) {
      const graphBlock = lines.slice(firstGraphChild, end).map((line) => "  " + line);
      lines.splice(firstGraphChild, end - firstGraphChild, `${indentation}graph`, ...graphBlock);
      end = firstGraphChild + graphBlock.length + 1;
    }
  }
  lines.splice(end, 0, `${indentation}graph`,
    ...(diagramId ? [`${fieldIndent}.id ${diagramId}`] : []),
    ...(diagramLabel ? [`${fieldIndent}.label ${diagramLabel}`] : []),
    ...(diagramRelativeTo ? [`${fieldIndent}.placement ${diagramPlacement || "below"}`, `${fieldIndent}.relative-to ${diagramRelativeTo}`] : []),
    ...(diagramFill ? [`${fieldIndent}.fill ${diagramFill}`] : []),
    ...(diagramOutline ? [`${fieldIndent}.outline ${diagramOutline}`] : []),
    ...nodeDeclaration(nodeType, fieldIndent, id, label));
  return lines.join("\n");
}

export function removeDeclaration(value, declarationLineNumber) {
  const lines = value.split("\n");
  const start = declarationLineNumber - 1;
  const indent = indentationWidth(lines[start] ?? "");
  let end = start + 1;
  while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > indent)) end += 1;
  lines.splice(start, end - start);
  return lines.join("\n");
}

export function removeDeclarationField(value, declarationLineNumber, field) {
  const lines = value.split("\n");
  const start = declarationLineNumber - 1;
  const indent = indentationWidth(lines[start] ?? "");
  let end = start + 1;
  while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > indent)) end += 1;
  const fieldIndent = indent + 2;
  const pattern = new RegExp(`^\\.${escapeRegExp(field)}(?:\\s|$)`);
  for (let index = end - 1; index > start; index -= 1) {
    if (indentationWidth(lines[index]) === fieldIndent && pattern.test(lines[index].trim())) lines.splice(index, 1);
  }
  return lines.join("\n");
}

export function removeNodeDeclaration(value, labelLineNumber) {
  const lines = value.split("\n");
  const range = nodeRange(lines, labelLineNumber);
  lines.splice(range.start, range.end - range.start);
  return lines.join("\n");
}

export function removeNodeFields(value, labelLineNumber, fields) {
  const lines = value.split("\n");
  const range = nodeRange(lines, labelLineNumber);
  const names = new Set(fields);
  for (let index = range.end - 1; index > range.start; index -= 1) {
    if (indentationWidth(lines[index]) !== indentationWidth(range.fieldIndent)) continue;
    const field = lines[index].trim().match(/^\.([\w-]+)(?:\s|$)/)?.[1];
    if (names.has(field)) lines.splice(index, 1);
  }
  return lines.join("\n");
}

export function removeConnectionLabel(value, declarationLineNumber) {
  const lines = value.split("\n");
  let start = declarationLineNumber - 1;
  let end;
  if (/^\.label(?:\s|$)/.test(lines[start]?.trim() ?? "")) {
    const range = nodeRange(lines, declarationLineNumber);
    start = range.start;
    end = range.end;
  } else {
    const base = indentationWidth(lines[start] ?? "");
    end = start + 1;
    while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > base)) end += 1;
  }
  const baseIndent = indentationWidth(lines[start] ?? "");
  for (let index = end - 1; index > start; index -= 1) {
    const text = lines[index].trim();
    const indentation = indentationWidth(lines[index]);
    if ((indentation === baseIndent + 2 && /^\.(?:line\.)?label(?:\s|$)/.test(text))
      || (indentation === baseIndent + 4 && /^\.label(?:\s|$)/.test(text))) lines.splice(index, 1);
  }
  return lines.join("\n");
}

export function removeAncestorDeclaration(value, lineNumber, type) {
  const lines = value.split("\n");
  let index = lineNumber - 1;
  const initialIndent = indentationWidth(lines[index] ?? "");
  while (index >= 0) {
    if (lines[index].trim() === `.${type}` && indentationWidth(lines[index]) < initialIndent) return removeDeclaration(value, index + 1);
    index -= 1;
  }
  return value;
}

export function removeNodeReferences(value, id) {
  let result = value;
  const escapedId = escapeRegExp(id);
  while (true) {
    const lines = result.split("\n");
    const refIndex = lines.findIndex((line) => new RegExp(`^\\s*\\.ref\\s+${escapedId}\\s*$`).test(line));
    if (refIndex < 0) break;
    let sourceIndex = refIndex - 1;
    while (sourceIndex >= 0 && !(lines[sourceIndex].trim() === ".source" && indentationWidth(lines[sourceIndex]) < indentationWidth(lines[refIndex]))) sourceIndex -= 1;
    let mergeIndex = sourceIndex - 1;
    while (mergeIndex >= 0 && !(lines[mergeIndex].trim() === ".merge" && indentationWidth(lines[mergeIndex]) < indentationWidth(lines[sourceIndex]))) mergeIndex -= 1;
    if (sourceIndex < 0 || mergeIndex < 0) break;
    const mergeIndent = indentationWidth(lines[mergeIndex]);
    let mergeEnd = mergeIndex + 1;
    while (mergeEnd < lines.length && (!lines[mergeEnd].trim() || indentationWidth(lines[mergeEnd]) > mergeIndent)) mergeEnd += 1;
    const sourceCount = lines.slice(mergeIndex + 1, mergeEnd).filter((line) => indentationWidth(line) === mergeIndent + 2 && line.trim() === ".source").length;
    if (sourceCount > 2) result = removeDeclaration(result, sourceIndex + 1);
    else {
      const targetLabel = lines.findIndex((line, index) => index > mergeIndex && index < mergeEnd && indentationWidth(line) === mergeIndent + 4 && /^\.label(?:\s|$)/.test(line.trim()));
      if (targetLabel >= 0) result = moveNodeToDiagram(result, targetLabel + 1);
      result = removeDeclaration(result, mergeIndex + 1);
    }
  }
  while (true) {
    const lines = result.split("\n");
    const endpoint = lines.findIndex((line) => new RegExp(`^\\s*\\.(?:from|to)\\s+${escapedId}\\s*$`).test(line));
    if (endpoint < 0) break;
    let relationship = endpoint - 1;
    while (relationship >= 0 && !([".connect", ".flow", "flow"].includes(lines[relationship].trim()) && indentationWidth(lines[relationship]) < indentationWidth(lines[endpoint]))) relationship -= 1;
    if (relationship < 0) break;
    result = removeDeclaration(result, relationship + 1);
  }
  while (true) {
    const lines = result.split("\n");
    const memberIndex = lines.findIndex((line) => {
      const match = line.match(/^\s*\.members\s+(.*)$/);
      return match?.[1].split(/[\s,]+/).includes(id);
    });
    if (memberIndex < 0) break;
    const prefix = lines[memberIndex].match(/^(\s*\.members\s+)/)?.[1] ?? "";
    const remaining = lines[memberIndex].slice(prefix.length).split(/[\s,]+/).filter((member) => member && member !== id);
    if (remaining.length) {
      lines[memberIndex] = prefix + remaining.join(" ");
      result = lines.join("\n");
      continue;
    }
    let graphIndex = memberIndex - 1;
    while (graphIndex >= 0 && !(lines[graphIndex].trim() === "graph" && indentationWidth(lines[graphIndex]) < indentationWidth(lines[memberIndex]))) graphIndex -= 1;
    result = graphIndex >= 0 ? removeDeclaration(result, graphIndex + 1) : lines.filter((_, index) => index !== memberIndex).join("\n");
  }
  return result;
}

export function renameNodeReferences(value, oldId, newId) {
  if (!oldId || !newId || oldId === newId) return value;
  const escapedId = escapeRegExp(oldId);
  return value.split("\n").map((line) => {
    const endpoint = line.replace(new RegExp(`^(\\s*\\.(?:ref|from|to)\\s+)${escapedId}(\\s*)$`), `$1${newId}$2`);
    const members = endpoint.match(/^(\s*\.members\s+)(.*)$/);
    if (!members) return endpoint;
    return members[1] + members[2].split(/([\s,]+)/).map((token) => token === oldId ? newId : token).join("");
  }).join("\n");
}

export function renameGraphReferences(value, oldId, newId) {
  if (!oldId || !newId || oldId === newId) return value;
  const escapedId = escapeRegExp(oldId);
  return value.split("\n").map((line) => line.replace(
    new RegExp(`^(\\s*\\.relative-to\\s+)${escapedId}(\\s*)$`),
    `$1${newId}$2`,
  )).join("\n");
}

export function removeMergeEdge(value, sourceLineNumber) {
  const lines = value.split("\n");
  const sourceIndex = sourceLineNumber - 1;
  let mergeIndex = sourceIndex - 1;
  while (mergeIndex >= 0 && !(lines[mergeIndex].trim() === ".merge" && indentationWidth(lines[mergeIndex]) < indentationWidth(lines[sourceIndex]))) mergeIndex -= 1;
  if (mergeIndex < 0) return value;
  const mergeIndent = indentationWidth(lines[mergeIndex]);
  let mergeEnd = mergeIndex + 1;
  while (mergeEnd < lines.length && (!lines[mergeEnd].trim() || indentationWidth(lines[mergeEnd]) > mergeIndent)) mergeEnd += 1;
  const sources = lines.map((line, index) => ({ line, index })).filter(({ line, index }) => index > mergeIndex && index < mergeEnd && indentationWidth(line) === mergeIndent + 2 && line.trim() === ".source");
  if (sources.length > 2) return removeDeclaration(value, sourceLineNumber);
  const targetLabel = lines.findIndex((line, index) => index > mergeIndex && index < mergeEnd && indentationWidth(line) === mergeIndent + 4 && /^\.label(?:\s|$)/.test(line.trim()));
  let result = targetLabel >= 0 ? moveNodeToDiagram(value, targetLabel + 1) : value;
  return removeDeclaration(result, mergeIndex + 1);
}

export function moveNodeToDiagram(value, labelLineNumber) {
  let lines = value.split("\n");
  const node = nodeRange(lines, labelLineNumber);
  const originalIndent = lines[node.start].match(/^\s*/)?.[0] ?? "";
  const block = lines.slice(node.start, node.end);
  lines.splice(node.start, node.end - node.start);
  const rootIndex = lines.findIndex((line) => /^#(?:canvas|diagram)(?:\(|$)/.test(line.trim()));
  if (rootIndex < 0) {
    while (lines.length && !lines.at(-1).trim()) lines.pop();
    if (lines.length) lines.push("");
    lines.push("graph", ...block.map((line) => `  ${line.slice(originalIndent.length)}`));
    return lines.join("\n");
  }
  const rootIndent = indentationWidth(lines[rootIndex] ?? "");
  let end = rootIndex + 1;
  while (end < lines.length && (!lines[end].trim() || indentationWidth(lines[end]) > rootIndent)) end += 1;
  const diagramIndent = (lines[rootIndex]?.match(/^\s*/)?.[0] ?? "") + "  ";
  const targetIndent = diagramIndent + "  ";
  const moved = block.map((line) => targetIndent + line.slice(originalIndent.length));
  lines.splice(end, 0, `${diagramIndent}graph`, ...moved);
  return lines.join("\n");
}
