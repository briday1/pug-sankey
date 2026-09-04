// Pug Sankey — source-first Sankey diagram editor.
//
// A single editor surface that works entirely on the canvas, entirely in
// source, or both at once. The source is the single editable representation;
// the canvas is a live rendering that can click-to-select source lines, drag
// nodes/labels to nudge them, and build new nodes/flows through dialogs.

import { createBlockDiagram, parseDiagram } from "./pugflow.mjs";
import {
  appendDiagramNode,
  appendFlowReference,
  appendNodeAnnotation,
  indentSourceSelection,
  renameNodeReferences,
  setNodeField,
  setNodeOffsetField,
  setStructuralField,
} from "./editor-source.mjs";
import { attachVimMode } from "./vim-mode.mjs";
import { attachTextEditor } from "./text-editor.mjs";
import { cleanupAlignmentOffsets, cleanupGraphOffsets } from "./layout.mjs";
import { ADDITIONAL_DEMOS } from "./demo-sources.mjs";

// ---- demo library ----------------------------------------------------------

const SHOWCASE = `// Pug Sankey showcase — edit anything and watch the preview update.
.background #f8fafc
.node-labels show
.node-values show
.flow-values show
.blend 60

node
  .id sources
  .label Sources
  .color #2e6ba7
node
  .id electricity
  .label Electricity
  .color #3fa06b
node
  .id heat
  .label Heat
  .color #e07a3f
node
  .id homes
  .label Homes
  .color #b04a8a
node
  .id industry
  .label Industry
  .color #c9a227

flow
  .from sources
  .to electricity
  .value 45
flow
  .from sources
  .to heat
  .value 30
flow
  .from electricity
  .to homes
  .value 26
flow
  .from electricity
  .to industry
  .value 19
flow
  .from heat
  .to homes
  .value 12
flow
  .from heat
  .to industry
  .value 18
`;

const DEMOS = [{ name: "Energy showcase", pug: SHOWCASE, css: "" }, ...ADDITIONAL_DEMOS];

// ---- dom -------------------------------------------------------------------

const $ = (selector) => document.querySelector(selector);
const source = attachTextEditor($("#source"));
const status = $("#status");
const lineNumbers = $("#line-numbers");
const currentLine = $("#current-line");
const editorShell = $(".editor-shell");
const canvas = $("#diagram");
const canvasShell = $(".canvas-shell");
const canvasZoom = $("#canvas-zoom");
const toast = $("#canvas-toast");
const main = document.querySelector("main");
const inspector = $("#canvas-inspector");
const inspectorContent = $("#inspector-content");
const nodeCount = $("#graph-node-count");
const flowCount = $("#graph-flow-count");
const nodesList = $("#graph-nodes-list");
const flowsList = $("#graph-flows-list");

// ---- state -----------------------------------------------------------------

const launchParams = new URLSearchParams(location.search);
const requestedDemo = Number(launchParams.get("demo"));
const selectedDemo = Number.isInteger(requestedDemo) && DEMOS[requestedDemo - 1] ? requestedDemo - 1 : (launchParams.has("demo") ? 0 : -1);

let pugSource = selectedDemo >= 0 ? (DEMOS[selectedDemo].pug ?? "") : "";
let cssSource = selectedDemo >= 0 ? (DEMOS[selectedDemo].css ?? "") : "";
let activeDocument = "pug";
let diagram = null;
let currentGraph = null;
let selections = [];
let canvasZoomPercent = 100;
const canvasUndo = [];
const canvasRedo = [];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function activeValue() { return activeDocument === "css" ? cssSource : pugSource; }
function setActiveValue(value) { if (activeDocument === "css") cssSource = value; else pugSource = value; }

// ---- editor chrome ---------------------------------------------------------

function updateEditorChrome() {
  const value = source.value;
  const total = value ? value.split("\n").length : 1;
  const caretLine = value.slice(0, source.selectionStart).split("\n").length;
  lineNumbers.replaceChildren(...Array.from({ length: total }, (_, i) => {
    const span = document.createElement("span");
    span.textContent = i + 1;
    if (i + 1 === caretLine) span.classList.add("active");
    return span;
  }));
  currentLine.style.transform = `translateY(${(caretLine - 1) * 20 + 14}px)`;
}

function selectSourceLine({ lineNumber }) {
  if (!Number.isFinite(lineNumber) || lineNumber < 1) return;
  if (activeDocument !== "pug") switchDocument("pug");
  const lines = source.value.split("\n");
  let start = 0;
  for (let i = 0; i < lineNumber - 1 && i < lines.length; i += 1) start += lines[i].length + 1;
  const end = start + (lines[lineNumber - 1]?.length ?? 0);
  source.focus();
  source.setSelectionRange(start, end);
  updateEditorChrome();
  editorShell.classList.remove("source-target");
  void editorShell.offsetWidth;
  editorShell.classList.add("source-target");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1600);
}

// ---- documents -------------------------------------------------------------

function switchDocument(name) {
  activeDocument = name;
  document.querySelectorAll("[data-source-tab]").forEach((tab) => {
    const active = tab.dataset.sourceTab === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  source.value = activeValue();
  updateEditorChrome();
}

// ---- render ----------------------------------------------------------------

function update() {
  persistWorkspace();
  const result = parseDiagram(pugSource, cssSource);
  if (result.errors.length) {
    status.textContent = result.errors[0];
    status.className = "status error";
    canvas.classList.add("preview-invalid");
    canvas.dataset.error = "Preview paused — fix the source error";
    return;
  }
  try {
    canvas.classList.remove("preview-invalid");
    delete canvas.dataset.error;
    currentGraph = result;
    renderLayersPanel();
    if (diagram) diagram.render(pugSource, cssSource);
    else diagram = createBlockDiagram(canvas, pugSource, {
      styles: cssSource,
      onNodeClick: selectSourceLine,
      onElementMove: persistElementMove,
      onElementClick: selectCanvasElement,
    });
    applyCanvasZoom();
    paintSelections();
    renderInspector();
    status.textContent = "";
    status.className = "status ready";
  } catch (error) {
    status.textContent = error.message;
    status.className = "status error";
    canvas.classList.add("preview-invalid");
    canvas.dataset.error = "Preview paused — fix the source error";
  }
}

function persistWorkspace() {
  try {
    sessionStorage.setItem("pug-sankey-workspace", JSON.stringify({ pugSource, cssSource, activeDocument }));
  } catch { /* storage may be unavailable */ }
}

function restoreWorkspace() {
  if (selectedDemo >= 0) return;
  try {
    const saved = JSON.parse(sessionStorage.getItem("pug-sankey-workspace") ?? "null");
    if (saved && typeof saved.pugSource === "string") {
      pugSource = saved.pugSource;
      cssSource = typeof saved.cssSource === "string" ? saved.cssSource : "";
      activeDocument = saved.activeDocument === "css" ? "css" : "pug";
    }
  } catch { /* ignore corrupt state */ }
}

// ---- canvas interaction ----------------------------------------------------

function persistElementMove(event) {
  if (!event || !Number.isFinite(event.lineNumber)) return;
  pushUndo();
  if (event.kind === "node" || event.kind === "node-label" || event.kind === "block-annotation") {
    pugSource = setNodeOffsetField(pugSource, event.lineNumber, "offset", event.dx, event.dy);
  } else {
    pugSource = setNodeOffsetField(pugSource, event.lineNumber, "label-offset", event.dx, event.dy);
  }
  if (activeDocument === "pug") source.value = pugSource;
  update();
}

function selectCanvasElement(selection) {
  if (!selection.additive) selections = [selection];
  else {
    const key = selection.selectionKey ?? `${selection.kind}:${selection.id ?? `${selection.from}->${selection.to}`}`;
    const existing = selections.findIndex((item) => (item.selectionKey ?? `${item.kind}:${item.id ?? `${item.from}->${item.to}`}`) === key);
    if (existing >= 0) selections.splice(existing, 1);
    else selections.push(selection);
  }
  paintSelections();
  renderInspector();
}

function paintSelections() {
  const keys = new Set(selections.map((item) => item.selectionKey ?? item.id).filter(Boolean));
  canvas.querySelectorAll(".selected-element").forEach((el) => el.classList.remove("selected-element"));
  canvas.querySelectorAll("[data-selection-key], [data-id]").forEach((el) => {
    const key = el.dataset.selectionKey ?? el.dataset.id;
    if (key && keys.has(key)) el.classList.add("selected-element");
  });
}

// ---- objects panel ---------------------------------------------------------

function renderLayersPanel() {
  const nodes = currentGraph?.nodes ?? [];
  const flows = currentGraph?.edges ?? [];
  nodeCount.textContent = nodes.length;
  flowCount.textContent = flows.length;
  nodesList.replaceChildren(...nodes.map((node) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "graph-item";
    item.innerHTML = `<strong>${escapeHtml(node.label || node.id)}</strong><small>${escapeHtml(node.id)} · value ${escapeHtml(node.value ?? "")}</small>`;
    item.addEventListener("click", () => { selections = [{ kind: "node", id: node.id, selectionKey: node.id, lineNumber: node.lineNumber }]; paintSelections(); renderInspector(); selectSourceLine({ lineNumber: node.lineNumber }); });
    return item;
  }));
  flowsList.replaceChildren(...flows.map((edge) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "graph-item";
    item.innerHTML = `<strong>${escapeHtml(edge.from)} → ${escapeHtml(edge.to)}</strong><small>value ${escapeHtml(edge.value)}</small>`;
    item.addEventListener("click", () => { selections = [{ kind: "line", from: edge.from, to: edge.to, selectionKey: `${edge.from}|${edge.to}|${edge.lineNumber}`, lineNumber: edge.lineNumber }]; paintSelections(); renderInspector(); selectSourceLine({ lineNumber: edge.lineNumber }); });
    return item;
  }));
}

// ---- inspector -------------------------------------------------------------

function selectedNode() {
  const sel = selections.find((item) => item.kind === "node");
  return sel ? (currentGraph?.nodes ?? []).find((node) => node.id === sel.id) : null;
}
function selectedEdge() {
  const sel = selections.find((item) => item.kind === "line");
  return sel ? (currentGraph?.edges ?? []).find((edge) => edge.from === sel.from && edge.to === sel.to && (!sel.lineNumber || edge.lineNumber === sel.lineNumber)) : null;
}

function renderInspector() {
  const node = selectedNode();
  const edge = selectedEdge();
  if (!node && !edge) { inspector.hidden = true; inspectorContent.replaceChildren(); return; }
  inspector.hidden = false;
  if (node) renderNodeInspector(node);
  else renderFlowInspector(edge);
}

function field(label, inner) {
  return `<label>${escapeHtml(label)}${inner}</label>`;
}

function renderNodeInspector(node) {
  inspectorContent.innerHTML = `<h3>Node</h3>`
    + field("ID", `<input data-node-field="id" value="${escapeHtml(node.explicitId ?? node.id)}" pattern="[A-Za-z][A-Za-z0-9_-]*">`)
    + field("Label", `<input data-node-field="label" value="${escapeHtml(node.label ?? "")}">`)
    + field("Color", `<input data-node-field="color" value="${escapeHtml(node.color ?? "")}" placeholder="#2e6ba7">`)
    + field("Layer", `<input data-node-field="layer" type="number" value="${escapeHtml(node.layer ?? 0)}">`)
    + `<label class="inspector-switch"><span>Hidden</span><input data-node-field="hidden" type="checkbox" ${node.hidden ? "checked" : ""}></label>`
    + `<button type="button" class="inspector-primary-action" id="insp-add-flow">Add flow from here</button>`
    + `<button type="button" id="insp-add-annotation">Add annotation</button>`;
  inspectorContent.querySelectorAll("[data-node-field]").forEach((input) => {
    input.addEventListener("change", () => applyNodeField(node, input.dataset.nodeField, input));
  });
  $("#insp-add-flow").addEventListener("click", () => openBuilder("flow", node));
  $("#insp-add-annotation").addEventListener("click", () => { pushUndo(); pugSource = appendNodeAnnotation(pugSource, node.lineNumber, {}); if (activeDocument === "pug") source.value = pugSource; update(); });
}

function applyNodeField(node, name, input) {
  pushUndo();
  let value = input.type === "checkbox" ? (input.checked ? "" : undefined) : input.value;
  if (name === "id") {
    const next = input.value.trim();
    if (next && next !== node.id && /^[A-Za-z][A-Za-z0-9_-]*$/.test(next)) pugSource = renameNodeReferences(pugSource, node.id, next);
  } else if (name === "hidden") {
    pugSource = setNodeField(pugSource, node.lineNumber, "hidden", input.checked ? "" : undefined);
  } else {
    pugSource = setNodeField(pugSource, node.lineNumber, name, value ?? "");
  }
  if (activeDocument === "pug") source.value = pugSource;
  update();
}

function renderFlowInspector(edge) {
  inspectorContent.innerHTML = `<h3>Flow</h3>`
    + `<p class="inspector-help">${escapeHtml(edge.from)} → ${escapeHtml(edge.to)}</p>`
    + field("Value", `<input data-flow-field="value" type="number" min="0" step="any" value="${escapeHtml(edge.value)}">`)
    + field("Color", `<input data-flow-field="color" value="${escapeHtml(edge.color ?? "")}" placeholder="blend">`)
    + field("Label", `<input data-flow-field="label" value="${escapeHtml(edge.label ?? "")}">`);
  inspectorContent.querySelectorAll("[data-flow-field]").forEach((input) => {
    input.addEventListener("change", () => {
      pushUndo();
      pugSource = setStructuralField(pugSource, edge.lineNumber, input.dataset.flowField, input.value);
      if (activeDocument === "pug") source.value = pugSource;
      update();
    });
  });
}

$("#close-inspector").addEventListener("click", () => { selections = []; paintSelections(); renderInspector(); });
$("#delete-selection").addEventListener("click", () => {
  const node = selectedNode();
  const edge = selectedEdge();
  pushUndo();
  if (node) pugSource = removeDeclarationSafe(node.lineNumber);
  else if (edge) pugSource = removeDeclarationSafe(edge.lineNumber);
  selections = [];
  if (activeDocument === "pug") source.value = pugSource;
  update();
});

function removeDeclarationSafe(lineNumber) {
  return import.meta ? pugSourceRemove(lineNumber) : pugSource;
}
function pugSourceRemove(lineNumber) {
  const lines = pugSource.split("\n");
  const start = lineNumber - 1;
  const indent = (lines[start]?.match(/^\s*/)?.[0] ?? "").length;
  let end = start + 1;
  while (end < lines.length && (!lines[end].trim() || (lines[end].match(/^\s*/)?.[0] ?? "").length > indent)) end += 1;
  lines.splice(start, end - start);
  return lines.join("\n");
}

// ---- builder (New node / flow) ----------------------------------------------

const builder = $("#graph-builder");
const builderTitle = $("#graph-builder-title");
const builderSubmit = $("#builder-submit");
let builderMode = "node";
let builderContextNode = null;

function openBuilder(mode, contextNode = null) {
  builderMode = mode;
  builderContextNode = contextNode;
  const isFlow = mode === "flow";
  builderTitle.textContent = isFlow ? "Add flow" : "Add node";
  builderSubmit.textContent = isFlow ? "Create flow" : "Create node";
  builder.querySelectorAll(".flow-only").forEach((el) => { el.style.display = isFlow ? "" : "none"; });
  builder.querySelectorAll(".new-target-only").forEach((el) => { el.style.display = isFlow ? "none" : ""; });
  builder.querySelectorAll(".graph-only, .diagram-only, .relationship-only, .connected-node-only, .connected-source-choice, .existing-flow-only, .existing-target-only").forEach((el) => { el.style.display = "none"; });
  $("#builder-error").textContent = "";
  if (isFlow) {
    const options = (currentGraph?.nodes ?? []).map((node) => `<option value="${escapeHtml(node.id)}">${escapeHtml(node.label || node.id)}</option>`).join("");
    $("#builder-from-id").innerHTML = options;
    $("#builder-to-id").innerHTML = options;
    if (contextNode) $("#builder-from-id").value = contextNode.id;
  }
  builder.showModal();
}

$("#builder-cancel")?.addEventListener("click", () => builder.close());
$("#graph-builder-form").addEventListener("submit", (event) => {
  event.preventDefault();
  pushUndo();
  if (builderMode === "flow") {
    const from = $("#builder-from-id").value;
    const to = $("#builder-to-id").value;
    const value = Number($("#builder-value").value) || 10;
    const color = $("#builder-color").value.trim();
    const label = $("#builder-label").value.trim();
    if (!from || !to) { $("#builder-error").textContent = "Choose both endpoints."; return; }
    pugSource = appendFlowReference(pugSource, 0, { from, to, value, color, label });
  } else {
    const id = $("#builder-id").value.trim();
    const label = $("#builder-label").value.trim();
    const color = $("#builder-color").value.trim();
    if (!id) { $("#builder-error").textContent = "Give the node an ID."; return; }
    pugSource = appendDiagramNode(pugSource, { id, label, color });
  }
  builder.close();
  if (activeDocument === "pug") source.value = pugSource;
  update();
  showToast(builderMode === "flow" ? "Flow added" : "Node added");
});

// ---- undo / redo ------------------------------------------------------------

function pushUndo() {
  canvasUndo.push(pugSource);
  if (canvasUndo.length > 200) canvasUndo.shift();
  canvasRedo.length = 0;
}
function undoCanvas() {
  if (!canvasUndo.length) return;
  canvasRedo.push(pugSource);
  pugSource = canvasUndo.pop();
  if (activeDocument === "pug") source.value = pugSource;
  update();
}
function redoCanvas() {
  if (!canvasRedo.length) return;
  canvasUndo.push(pugSource);
  pugSource = canvasRedo.pop();
  if (activeDocument === "pug") source.value = pugSource;
  update();
}
$("#undo-canvas").addEventListener("click", undoCanvas);
$("#redo-canvas").addEventListener("click", redoCanvas);

// ---- clean up ---------------------------------------------------------------

$("#cleanup-diagram").addEventListener("click", () => {
  if (!diagram?.layout) return;
  const nodeChanges = cleanupAlignmentOffsets(diagram.layout.nodes, diagram.layout.edges);
  const graphChanges = cleanupGraphOffsets(diagram.layout.nodes, diagram.layout.edges, []);
  if (!nodeChanges.length && !graphChanges.length) { showToast("Already tidy"); return; }
  pushUndo();
  [...nodeChanges].sort((a, b) => b.lineNumber - a.lineNumber).forEach((change) => {
    pugSource = setNodeOffsetField(pugSource, change.lineNumber, "offset", change.offsetX, change.offsetY);
  });
  if (activeDocument === "pug") source.value = pugSource;
  update();
  showToast("Diagram cleaned up");
});

// ---- zoom / pan --------------------------------------------------------------

function applyCanvasZoom() {
  const svg = canvas.querySelector("svg");
  if (!svg) return;
  const w = Number(svg.getAttribute("width")) || 1;
  const h = Number(svg.getAttribute("height")) || 1;
  svg.style.width = `${w * canvasZoomPercent / 100}px`;
  svg.style.height = `${h * canvasZoomPercent / 100}px`;
  svg.style.maxWidth = "none";
}
function setCanvasZoom(percent) {
  canvasZoomPercent = Math.max(25, Math.min(300, Math.round(percent / 5) * 5));
  if (![...canvasZoom.options].some((o) => Number(o.value) === canvasZoomPercent)) canvasZoom.add(new Option(`${canvasZoomPercent}%`, String(canvasZoomPercent)));
  canvasZoom.value = String(canvasZoomPercent);
  applyCanvasZoom();
}
function fitCanvasZoom() {
  const svg = canvas.querySelector("svg");
  if (!svg) return;
  const w = Number(svg.getAttribute("width")) || 1;
  const h = Number(svg.getAttribute("height")) || 1;
  setCanvasZoom(Math.min(Math.max(1, canvasShell.clientWidth - 70) / w, Math.max(1, canvasShell.clientHeight - 70) / h) * 100);
}
$("#zoom-in").addEventListener("click", () => setCanvasZoom(canvasZoomPercent + 5));
$("#zoom-out").addEventListener("click", () => setCanvasZoom(canvasZoomPercent - 5));
$("#zoom-fit").addEventListener("click", fitCanvasZoom);
canvasZoom.addEventListener("change", () => setCanvasZoom(Number(canvasZoom.value)));

let panMode = false;
function setMode(pan) {
  panMode = pan;
  $("#mode-select").classList.toggle("mode-active", !pan);
  $("#mode-select").setAttribute("aria-pressed", String(!pan));
  $("#mode-pan").classList.toggle("mode-active", pan);
  $("#mode-pan").setAttribute("aria-pressed", String(pan));
  canvasShell.classList.toggle("pan-mode", pan);
}
$("#mode-select").addEventListener("click", () => setMode(false));
$("#mode-pan").addEventListener("click", () => setMode(true));

let panning = null;
canvasShell.addEventListener("pointerdown", (event) => {
  if (!panMode) return;
  panning = { id: event.pointerId, x: event.clientX, y: event.clientY, left: canvasShell.scrollLeft, top: canvasShell.scrollTop };
  canvasShell.classList.add("panning");
  canvasShell.setPointerCapture(event.pointerId);
});
canvasShell.addEventListener("pointermove", (event) => {
  if (!panning || panning.id !== event.pointerId) return;
  canvasShell.scrollLeft = panning.left - (event.clientX - panning.x);
  canvasShell.scrollTop = panning.top - (event.clientY - panning.y);
});
["pointerup", "pointercancel"].forEach((type) => canvasShell.addEventListener(type, (event) => {
  if (panning?.id === event.pointerId) { panning = null; canvasShell.classList.remove("panning"); }
}));
canvasShell.addEventListener("wheel", (event) => {
  if (event.ctrlKey || event.metaKey) { event.preventDefault(); setCanvasZoom(canvasZoomPercent + (event.deltaY < 0 ? 5 : -5)); }
}, { passive: false });

// ---- panels / resizers -------------------------------------------------------

$("#toggle-source").addEventListener("click", () => {
  const collapsed = main.classList.toggle("source-collapsed");
  $("#toggle-source").setAttribute("aria-expanded", String(!collapsed));
});
$("#toggle-layers").addEventListener("click", () => {
  const collapsed = main.classList.toggle("layers-collapsed");
  $("#toggle-layers").setAttribute("aria-expanded", String(!collapsed));
});
document.querySelectorAll("[data-source-tab]").forEach((tab) => tab.addEventListener("click", () => switchDocument(tab.dataset.sourceTab)));

function attachResizer(handle, cssVar, invert = false) {
  if (!handle) return;
  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const start = event.clientX;
    const initial = parseFloat(getComputedStyle(main).getPropertyValue(cssVar)) || 0;
    handle.setPointerCapture(event.pointerId);
    const move = (e) => {
      const delta = (e.clientX - start) * (invert ? -1 : 1);
      main.style.setProperty(cssVar, `${Math.max(160, initial + delta)}px`);
    };
    const up = () => { handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  });
}
attachResizer($("#panel-resizer"), "--panel-width");
attachResizer($("#graph-panel-resizer"), "--layers-open-width", true);

// ---- file menu ---------------------------------------------------------------

function download(blob, filename) {
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
}
function saveSource() { download(new Blob([activeValue()], { type: "text/plain;charset=utf-8" }), activeDocument === "css" ? "diagram.css" : "diagram.pug"); }
$("#save-source").addEventListener("click", saveSource);
$("#save-source-as").addEventListener("click", saveSource);
$("#new-pug").addEventListener("click", () => { pushUndo(); pugSource = ""; if (activeDocument !== "pug") switchDocument("pug"); else { source.value = ""; } update(); });
$("#new-css").addEventListener("click", () => { pushUndo(); cssSource = ""; switchDocument("css"); update(); });

const fileInput = $("#source-file");
$("#load-source").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  for (const file of fileInput.files) {
    const text = await file.text();
    if (/\.css$/i.test(file.name)) { cssSource = text; } else { pugSource = text; }
  }
  fileInput.value = "";
  switchDocument("pug");
  update();
  showToast("Source loaded");
});

// ---- export ------------------------------------------------------------------

function exportTarget() { return "diagram"; }
async function doExport(save) {
  const format = $(save ? "#save-export-format" : "#copy-export-format").value;
  const dpi = Number($(save ? "#save-export-dpi" : "#copy-export-dpi").value) || 96;
  const scale = dpi / 96;
  if (!diagram) return;
  if (format === "svg") {
    const svg = diagram.toSVGString();
    if (save) download(new Blob([svg], { type: "image/svg+xml" }), `${exportTarget()}.svg`);
    else { await navigator.clipboard.writeText(svg); showToast("SVG copied"); }
  } else {
    const blob = await diagram.toPNGBlob(scale);
    if (save) download(blob, `${exportTarget()}.png`);
    else { await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); showToast("PNG copied"); }
  }
}
$("#open-save-export").addEventListener("click", () => $("#save-export-dialog").showModal());
$("#open-copy-export").addEventListener("click", () => $("#copy-export-dialog").showModal());
$("#save-export-form").addEventListener("submit", (e) => { e.preventDefault(); doExport(true); $("#save-export-dialog").close(); });
$("#copy-export-form").addEventListener("submit", (e) => { e.preventDefault(); doExport(false); $("#copy-export-dialog").close(); });

// ---- theme / vim ---------------------------------------------------------------

const themeButton = $("#theme");
const themeValue = $("#theme-value");
function applyTheme(mode) {
  document.documentElement.dataset.theme = mode === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : mode;
  themeValue.textContent = mode[0].toUpperCase() + mode.slice(1);
  try { localStorage.setItem("pug-sankey-theme", mode); } catch { /* ignore */ }
}
themeButton.addEventListener("click", () => {
  const order = ["system", "light", "dark"];
  const current = (localStorage.getItem("pug-sankey-theme") ?? "system");
  applyTheme(order[(order.indexOf(current) + 1) % order.length]);
});
applyTheme((() => { try { return localStorage.getItem("pug-sankey-theme") ?? "system"; } catch { return "system"; } })());
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if ((localStorage.getItem("pug-sankey-theme") ?? "system") === "system") applyTheme("system");
});

attachVimMode(source, $("#vim-mode"), $("#vim-status"));

// ---- keyboard -----------------------------------------------------------------

document.addEventListener("keydown", (event) => {
  const inEditor = source.contains(document.activeElement) || document.activeElement === source;
  const mod = event.ctrlKey || event.metaKey;
  if (mod && event.key.toLowerCase() === "z" && !inEditor) { event.preventDefault(); event.shiftKey ? redoCanvas() : undoCanvas(); }
  else if (mod && event.key.toLowerCase() === "y" && !inEditor) { event.preventDefault(); redoCanvas(); }
  else if (event.key.toLowerCase() === "v" && !inEditor && !mod) setMode(false);
  else if (event.key.toLowerCase() === "h" && !inEditor && !mod) setMode(true);
});

source.addEventListener("input", () => { setActiveValue(source.value); update(); });
source.addEventListener("keyup", updateEditorChrome);
source.addEventListener("click", updateEditorChrome);
source.addEventListener("beforeinput", () => { if (activeDocument === "pug") pushUndo(); });
source.addEventListener("scroll", () => {
  lineNumbers.style.transform = `translateY(${-source.scrollTop}px)`;
});

// Tab key indents the selection instead of moving focus.
source.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  event.preventDefault();
  const { value, selectionStart, selectionEnd } = source;
  const result = indentSourceSelection(value, selectionStart, selectionEnd, event.shiftKey);
  if (result) {
    pushUndo();
    source.value = result.value;
    source.setSelectionRange(result.selectionStart, result.selectionEnd);
    setActiveValue(source.value);
    update();
  }
});

// ---- boot ---------------------------------------------------------------------

$("#add-node").addEventListener("click", () => openBuilder("node"));
$("#add-flow").addEventListener("click", () => openBuilder("flow"));
$("#add-diagram")?.addEventListener("click", () => openBuilder("node"));
$("#add-image")?.addEventListener("click", () => openBuilder("node"));

restoreWorkspace();
switchDocument(activeDocument);
update();
