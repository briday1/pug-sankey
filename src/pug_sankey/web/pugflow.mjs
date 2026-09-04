// Sankey SVG renderer and interactive diagram factory.
//
// Renders value-proportioned Sankey ribbons between node bars. Each flow keeps
// its own color; where a flow has no explicit color it blends between its
// source and target node colors using the figure's blend percentage. Node and
// flow labels/values are shown according to the figure's annotation settings.

import { parseDiagram } from "./parser.mjs";
import { DEFAULT_LAYOUT, layoutDiagram } from "./layout.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== null && value !== undefined && value !== "") element.setAttribute(key, String(value));
  }
  return element;
}

export function constrainDragDelta(dx, dy, constrained) {
  if (!constrained) return { dx, dy };
  return Math.abs(dx) >= Math.abs(dy) ? { dx, dy: 0 } : { dx: 0, dy };
}

export function constrainResizeDelta(dx, dy, resizeX, resizeY) {
  return { dx: resizeX ? dx : 0, dy: resizeY ? dy : 0 };
}

function cssVariables(element) {
  const styles = getComputedStyle(element);
  const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
  return {
    background: read("--diagram-background", "#ffffff"),
    label: read("--diagram-label", "#111111"),
    text: read("--diagram-text", "#111111"),
    merge: read("--diagram-merge", "#111111"),
    annotation: read("--diagram-annotation", "#000000"),
    font: read("--diagram-font", "Verdana, sans-serif"),
  };
}

function figureColors(container, figure = {}) {
  const colors = cssVariables(container);
  for (const key of Object.keys(colors)) {
    if (figure[key] !== null && figure[key] !== undefined && figure[key] !== "") colors[key] = figure[key];
  }
  return colors;
}

// ---- color helpers -------------------------------------------------------

function parseColor(color) {
  if (!color) return null;
  const value = String(color).trim();
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(",").map((part) => parseFloat(part));
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) return parts.slice(0, 3);
  }
  return null;
}

function toHex([r, g, b]) {
  const channel = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** Blend two colors; t=0 → a, t=1 → b. Falls back to whichever is valid. */
function mixColors(a, b, t) {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca && !cb) return a || b || "#999999";
  if (!ca) return b;
  if (!cb) return a;
  const clamped = Math.max(0, Math.min(1, t));
  return toHex([
    ca[0] + (cb[0] - ca[0]) * clamped,
    ca[1] + (cb[1] - ca[1]) * clamped,
    ca[2] + (cb[2] - ca[2]) * clamped,
  ]);
}

// A readable default palette used to auto-assign node colors.
const PALETTE = [
  "#2e6ba7", "#e07a3f", "#3fa06b", "#b04a8a", "#c9a227",
  "#5b8def", "#d1563f", "#39a0a8", "#8a6bbf", "#7a9a3f",
  "#c25e8f", "#4f7fd1", "#d18f3f", "#3f9a7a", "#a05bc2",
];

function nodeColor(node, index) {
  return node.color ?? PALETTE[index % PALETTE.length];
}

// ---- sankey geometry -----------------------------------------------------

/** Build a smooth cubic ribbon path between the two node faces. */
function ribbonPath(edge) {
  const x0 = edge.sourceX;
  const x1 = edge.targetX;
  const top0 = edge.sourceY;
  const top1 = edge.targetY;
  const bottom0 = edge.sourceY + edge.thickness;
  const bottom1 = edge.targetY + edge.thickness;
  const mid = (x0 + x1) / 2;
  return [
    `M ${x0} ${top0}`,
    `C ${mid} ${top0} ${mid} ${top1} ${x1} ${top1}`,
    `L ${x1} ${bottom1}`,
    `C ${mid} ${bottom1} ${mid} ${bottom0} ${x0} ${bottom0}`,
    "Z",
  ].join(" ");
}

function formatValue(value) {
  if (!Number.isFinite(value)) return "";
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

// ---- rendering -----------------------------------------------------------

function addLink(svg, defs, edge, nodesById, palette, settings, colors, index) {
  const source = nodesById.get(edge.from);
  const target = nodesById.get(edge.to);
  if (!source || !target) return;
  const sourceColor = source._sankeyColor;
  const targetColor = target._sankeyColor;
  const blend = Math.max(0, Math.min(100, settings.blend ?? 60)) / 100;

  let fill;
  let fillRef = null;
  if (edge.color) {
    fill = edge.color;
  } else if (blend > 0 && sourceColor !== targetColor) {
    // Gradient blend from the source color toward the target color.
    const id = `sankey-grad-${index}`;
    const gradient = svgElement("linearGradient", {
      id, gradientUnits: "userSpaceOnUse", x1: edge.sourceX, y1: 0, x2: edge.targetX, y2: 0,
    });
    gradient.append(svgElement("stop", { offset: "0%", "stop-color": sourceColor }));
    gradient.append(svgElement("stop", { offset: "100%", "stop-color": targetColor }));
    defs.append(gradient);
    fillRef = id;
    fill = `url(#${id})`;
  } else {
    fill = mixColors(sourceColor, targetColor, blend);
  }

  const group = svgElement("g", { class: "connector sankey-link", "data-from": edge.from, "data-to": edge.to, "data-line": edge.lineNumber });
  group.append(svgElement("path", {
    d: ribbonPath(edge),
    fill,
    opacity: 0.55,
    class: "sankey-ribbon",
    "data-line": edge.labelLineNumber ?? edge.lineNumber,
    "data-drag-kind": "line",
  }));
  svg.append(group);

  // Flow label / value annotation, centered along the ribbon.
  const parts = [];
  const showLabel = settings.flowLabels && (edge.label ?? "").trim();
  const showValue = settings.flowValues;
  if (showLabel) parts.push(edge.label.trim());
  if (showValue) parts.push(formatValue(edge.value));
  if (parts.length) {
    const cx = (edge.sourceX + edge.targetX) / 2;
    const cy = (edge.sourceY + edge.targetY) / 2 + edge.thickness / 2;
    const text = svgElement("text", {
      x: cx, y: cy - 4, class: "connection-annotation sankey-flow-label",
      "text-anchor": "middle", "data-line": edge.labelLineNumber ?? edge.lineNumber,
      "data-drag-kind": "connection-label", "data-from": edge.from, "data-to": edge.to,
      "data-selection-key": `${edge.from}|${edge.to}|${edge.lineNumber}`,
    });
    text.setAttribute("style", `font: 600 11px ${colors.font}; fill: ${colors.annotation}; paint-order: stroke; stroke: ${colors.background}; stroke-width: 3px;`);
    text.textContent = parts.join("  ");
    svg.append(text);
  }
}

function addNode(svg, node, settings, colors) {
  const group = svgElement("g", {
    class: "entry sankey-node", "data-id": node.id, "data-line": node.lineNumber,
    "data-select-kind": "node", "data-selection-key": node.id,
  });
  group.append(svgElement("rect", {
    class: "label-box", x: node.x, y: node.y, width: node.width, height: node.height,
    rx: 2, fill: node._sankeyColor, "data-line": node.lineNumber, "data-drag-kind": "node", "data-id": node.id,
  }));

  // Node label + value to the side of the bar.
  const isSink = node.column === undefined ? false : node._isLastColumn;
  const lines = [];
  if (settings.nodeLabels && (node.label ?? "").trim()) lines.push(node.label.trim());
  if (settings.nodeValues) lines.push(formatValue(node.value));
  if (lines.length) {
    const text = svgElement("text", {
      class: "label sankey-node-label", "data-line": node.lineNumber, "data-drag-kind": "node-label",
      "data-id": node.id, "data-selection-key": node.id,
    });
    text.setAttribute("style", `font: 600 12px ${colors.font}; fill: ${colors.text}; paint-order: stroke; stroke: ${colors.background}; stroke-width: 3px;`);
    const centerY = node.y + node.height / 2;
    const startY = centerY - ((lines.length - 1) * 14) / 2 + 4;
    if (isSink) {
      text.setAttribute("x", node.x - 8);
      text.setAttribute("text-anchor", "end");
    } else {
      text.setAttribute("x", node.x + node.width + 8);
      text.setAttribute("text-anchor", "start");
    }
    lines.forEach((line, index) => {
      const tspan = svgElement("tspan", { x: text.getAttribute("x"), y: startY + index * 14 });
      tspan.textContent = line;
      text.append(tspan);
    });
    group.append(text);
  }

  // Block annotations above/below the bar.
  (node.annotations ?? []).filter((a) => a.text && !a.hidden).forEach((annotation, index) => {
    const above = annotation.position !== "below";
    const ax = node.x + node.width / 2 + (annotation.offsetX ?? 0);
    const ay = (above ? node.y - 8 - index * 14 : node.y + node.height + 16 + index * 14) + (annotation.offsetY ?? 0);
    const text = svgElement("text", {
      x: ax, y: ay, class: "block-annotation", "text-anchor": "middle",
      "data-line": annotation.lineNumber, "data-drag-kind": "block-annotation", "data-id": node.id,
      "data-select-kind": "annotation",
    });
    text.setAttribute("style", `font: ${annotation.fontStyle ?? "normal"} ${annotation.fontWeight ?? "normal"} ${annotation.fontSize ?? 11}px ${annotation.fontFamily ?? colors.font}; fill: ${annotation.color ?? colors.annotation};`);
    String(annotation.text).split("\n").forEach((line, lineIndex) => {
      const tspan = svgElement("tspan", { x: ax, dy: lineIndex ? 13 : 0 });
      tspan.textContent = line;
      text.append(tspan);
    });
    group.append(text);
  });

  svg.append(group);
}

function renderSvg(container, graph, options) {
  const colors = figureColors(container, graph.figure);
  // Annotation modes and blend come from figure-level canvas settings. The
  // parser emits booleans (with defaults applied); tolerate "show"/"hide"
  // strings too for forward compatibility.
  const flag = (value, fallback) => {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "boolean") return value;
    return String(value) !== "hide";
  };
  const settings = {
    nodeLabels: flag(graph.figure?.nodeLabels, true),
    nodeValues: flag(graph.figure?.nodeValues, true),
    flowLabels: flag(graph.figure?.flowLabels, false),
    flowValues: flag(graph.figure?.flowValues, true),
    blend: Number.isFinite(Number(graph.figure?.blend)) ? Number(graph.figure.blend) : 60,
  };

  const layout = layoutDiagram(graph.nodes, graph.edges, { ...DEFAULT_LAYOUT, ...options.layout });
  const maxColumn = Math.max(0, ...layout.nodes.map((node) => node.column));
  layout.nodes.forEach((node, index) => {
    node._sankeyColor = nodeColor(node, index);
    node._isLastColumn = node.column === maxColumn;
  });
  const nodesById = new Map(layout.nodes.map((node) => [node.id, node]));

  // View extents: node geometry plus modest room for side labels and the
  // above/below annotations, clamped to the layout's own padding.
  const pad = layout.options.padding;
  const extentX = layout.nodes.flatMap((node) => [node.x - 120, node.x + node.width + 120]);
  const extentY = layout.nodes.flatMap((node) => [node.y - 36, node.y + node.height + 36]);
  const viewX = extentX.length ? Math.min(...extentX, 0) : 0;
  const viewY = extentY.length ? Math.min(...extentY, 0) : 0;
  const viewRight = extentX.length ? Math.max(...extentX, layout.width) : layout.width;
  const viewBottom = extentY.length ? Math.max(...extentY, layout.height) : layout.height;
  const viewWidth = Math.max(1, viewRight - viewX);
  const viewHeight = Math.max(1, viewBottom - viewY);

  const svg = svgElement("svg", {
    xmlns: SVG_NS, viewBox: `${viewX} ${viewY} ${viewWidth} ${viewHeight}`,
    width: viewWidth, height: viewHeight, role: "img",
    "aria-label": options.accessibleLabel ?? "Sankey diagram",
  });
  svg.classList.add("pugflow-svg");
  if (!layout.nodes.length) svg.classList.add("empty-diagram");

  const style = svgElement("style");
  style.textContent = `
    .diagram-background { fill: ${colors.background}; }
    .label, .block-annotation, .connection-annotation { user-select: none; }
    .interactive [data-line] { cursor: pointer; }
    .interactive [data-drag-kind] { touch-action: none; }
    .interactive .sankey-node:hover .label-box { filter: brightness(1.08); }
    .interactive text[data-line]:hover, .interactive text[data-line]:focus { text-decoration: underline; }
    .interactive .sankey-ribbon:hover { opacity: .8; }
    .interactive .dragging { opacity: .82; }
    .interactive .drag-origin { opacity: .24; pointer-events: none; }
  `;
  svg.append(style);
  const defs = svgElement("defs");
  svg.append(defs);
  svg.append(svgElement("rect", { class: "diagram-background", x: viewX, y: viewY, width: viewWidth, height: viewHeight }));

  const linkLayer = svgElement("g", { class: "connector-layer" });
  svg.append(linkLayer);
  layout.edges.forEach((edge, index) => {
    if (edgeIsVisible(edge, nodesById)) addLink(linkLayer, defs, edge, nodesById, PALETTE, settings, colors, index);
  });
  const nodeLayer = svgElement("g", { class: "graph-node-layer ungrouped-layer", "data-layer": -1 });
  svg.append(nodeLayer);
  layout.nodes.forEach((node) => { if (!node.hidden) addNode(nodeLayer, node, settings, colors); });

  Object.defineProperty(svg, "__diagramLayout", { value: { ...layout, nodes: layout.nodes, groups: [] } });
  attachInteraction(svg, options);
  return svg;
}

export function edgeIsVisible(edge, nodesById) {
  const source = nodesById.get(edge.from);
  const target = nodesById.get(edge.to);
  return Boolean(source && target && !source.hidden && !target.hidden && !edge.hidden);
}

function attachInteraction(svg, options) {
  if (!options.onNodeClick && !options.onElementMove) return;
  svg.classList.add("interactive");
  let drag = null;
  let navigationPointer = null;
  const pointFor = (event) => {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  };
  if (options.onNodeClick) {
    svg.addEventListener("pointerdown", (event) => {
      const target = event.target.closest?.("[data-line]");
      if (!target || event.button !== 0) return;
      navigationPointer = { pointerId: event.pointerId, target, clientX: event.clientX, clientY: event.clientY, moved: false };
    });
    svg.addEventListener("pointermove", (event) => {
      if (!navigationPointer || navigationPointer.pointerId !== event.pointerId) return;
      if (Math.hypot(event.clientX - navigationPointer.clientX, event.clientY - navigationPointer.clientY) > 2) navigationPointer.moved = true;
    });
    svg.addEventListener("pointerup", (event) => {
      if (!navigationPointer || navigationPointer.pointerId !== event.pointerId) return;
      const completed = navigationPointer;
      navigationPointer = null;
      if (completed.moved) return;
      const entry = completed.target.closest?.(".entry");
      const connector = completed.target.closest?.(".connector");
      const additive = event.shiftKey || event.ctrlKey || event.metaKey;
      const selectedTarget = completed.target.closest?.("[data-select-kind]") ?? completed.target;
      const kind = selectedTarget.dataset.selectKind ?? (connector ? "line" : "node");
      options.onElementClick?.({
        kind,
        id: entry?.dataset.id ?? selectedTarget.dataset.id ?? null,
        from: connector?.dataset.from ?? selectedTarget.dataset.from ?? null,
        to: connector?.dataset.to ?? selectedTarget.dataset.to ?? null,
        lineNumber: Number(kind === "line" ? selectedTarget.dataset.offsetLine ?? selectedTarget.dataset.line : selectedTarget.dataset.line ?? completed.target.dataset.line),
        offsetLineNumber: Number(selectedTarget.dataset.offsetLine ?? selectedTarget.dataset.line),
        selectionKey: selectedTarget.dataset.selectionKey ?? connector?.dataset.selectionKey ?? entry?.dataset.selectionKey ?? null,
        additive,
      });
      if (!additive) options.onNodeClick({ id: completed.target.dataset.id ?? null, lineNumber: Number(completed.target.dataset.line) });
    });
    svg.addEventListener("pointercancel", (event) => {
      if (navigationPointer?.pointerId === event.pointerId) navigationPointer = null;
    });
  }
  if (options.onElementMove) {
    svg.addEventListener("pointerdown", (event) => {
      const target = event.target.closest?.("[data-drag-kind]");
      if (!target || event.button !== 0) return;
      event.preventDefault();
      const start = pointFor(event);
      const element = target.dataset.dragKind === "node" ? target.closest(".entry") : target;
      const ghost = element.cloneNode(true);
      ghost.classList.remove("dragging", "selected-element");
      ghost.classList.add("drag-origin");
      for (const item of [ghost, ...ghost.querySelectorAll("[data-line], [tabindex], [data-drag-kind]")]) {
        item.removeAttribute("data-line");
        item.removeAttribute("data-drag-kind");
        item.removeAttribute("tabindex");
        item.removeAttribute("role");
      }
      element.parentNode.insertBefore(ghost, element);
      drag = { pointerId: event.pointerId, target, element, ghost, start, dx: 0, dy: 0 };
      element.classList.add("dragging");
      svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener("pointermove", (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const point = pointFor(event);
      const { dx, dy } = constrainDragDelta(point.x - drag.start.x, point.y - drag.start.y, event.metaKey || event.ctrlKey || event.shiftKey);
      drag.dx = dx;
      drag.dy = dy;
      drag.element.setAttribute("transform", `translate(${dx} ${dy})`);
    });
    const finishDrag = (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const completed = drag;
      drag = null;
      completed.element.removeAttribute("transform");
      completed.element.classList.remove("dragging");
      completed.ghost.remove();
      if (Math.hypot(completed.dx, completed.dy) > 2) {
        options.onElementMove({
          kind: completed.target.dataset.dragKind,
          selectionKey: null,
          id: completed.target.dataset.id ?? null,
          lineNumber: Number(completed.target.dataset.offsetLine ?? completed.target.dataset.line),
          currentX: Number(completed.target.dataset.currentX ?? 0),
          currentY: Number(completed.target.dataset.currentY ?? 0),
          dx: completed.dx,
          dy: completed.dy,
        });
      }
    };
    svg.addEventListener("pointerup", finishDrag);
    svg.addEventListener("pointercancel", (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag.element.removeAttribute("transform");
      drag.element.classList.remove("dragging");
      drag.ghost.remove();
      drag = null;
    });
    const activateNode = (event) => {
      const target = event.target.closest?.("[data-line]");
      if (!target || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      options.onNodeClick?.({ id: target.dataset.id ?? null, lineNumber: Number(target.dataset.line) });
    };
    svg.addEventListener("keydown", activateNode);
  }
}

function serialize(svg) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg)}`;
}

function exportSvgClone(svg) {
  const clone = svg.cloneNode(true);
  clone.classList.remove("interactive");
  clone.querySelectorAll(".selected-element").forEach((element) => element.classList.remove("selected-element"));
  return clone;
}

function download(blob, filename) {
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
}

export function createBlockDiagram(container, source, options = {}) {
  if (!(container instanceof Element)) throw new TypeError("A container element is required.");
  let currentSource = source;
  let currentStyles = options.styles ?? "";
  let currentSvg = null;
  let currentLayout = null;

  function render(nextSource = currentSource, nextStyles = currentStyles) {
    currentSource = nextSource;
    currentStyles = nextStyles;
    const graph = parseDiagram(currentSource, currentStyles);
    if (graph.errors.length) throw new Error(graph.errors.join("\n"));
    currentSvg = renderSvg(container, graph, options);
    currentLayout = currentSvg.__diagramLayout;
    container.classList.add("pugflow");
    container.replaceChildren(currentSvg);
    return graph;
  }
  function exportSvg() {
    if (!currentSvg) render();
    return exportSvgClone(currentSvg);
  }
  function toSVGString() { return serialize(exportSvg()); }
  function saveSVG(filename = "diagram.svg") { download(new Blob([toSVGString()], { type: "image/svg+xml;charset=utf-8" }), filename); }
  function saveSource(filename = "diagram.pug") { download(new Blob([currentSource], { type: "text/plain;charset=utf-8" }), filename); }
  function toPNGBlob(scale = 2) {
    return new Promise((resolve, reject) => {
      const exported = exportSvg();
      const viewBox = exported.viewBox.baseVal;
      const url = URL.createObjectURL(new Blob([serialize(exported)], { type: "image/svg+xml;charset=utf-8" }));
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = viewBox.width * scale;
        canvas.height = viewBox.height * scale;
        const context = canvas.getContext("2d");
        context.scale(scale, scale);
        context.drawImage(image, 0, 0);
        canvas.toBlob((png) => {
          URL.revokeObjectURL(url);
          if (!png) return reject(new Error("The browser could not create the PNG."));
          resolve(png);
        }, "image/png");
      };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("The browser could not rasterize the SVG.")); };
      image.src = url;
    });
  }
  async function savePNG(filename = "diagram.png", scale = 2) { download(await toPNGBlob(scale), filename); }
  render();
  return {
    render, toSVGString, toPNGBlob, saveSVG, savePNG, saveSource,
    get source() { return currentSource; },
    get layout() { return currentLayout; },
  };
}

export { parseDiagram } from "./parser.mjs";
