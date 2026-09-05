// Pug Sankey — source-first Sankey diagram editor.
//
// A single editor surface that works entirely on the canvas, entirely in
// source, or both at once. The source is the single editable representation;
// the canvas renders one diagram, selects source lines, and lets you add or
// edit its nodes and flows through dialogs.

import { createBlockDiagram, parseDiagram } from "./pugflow.mjs";
import {
  appendDiagramNode,
  appendFlowReference,
  appendNodeAnnotation,
  indentSourceSelection,
  removeNodeField,
  renameNodeReferences,
  setNodeField,
  setNodeOffsetField,
  setStructuralField,
} from "./editor-source.mjs";
import { attachVimMode } from "./vim-mode.mjs";
import { attachTextEditor } from "./text-editor.mjs";
import { applyHighlights } from "./syntax-highlight.mjs";
import { ADDITIONAL_DEMOS } from "./demo-sources.mjs";
import { setDiagramSettings } from "./diagram-settings.mjs";
import { DIAGRAM_THEMES } from "./diagram-themes.mjs";

// ---- demo library ----------------------------------------------------------

const SHOWCASE = `// Pug Sankey showcase — edit anything and watch the preview update.
.background #18181f
.node-labels show
.node-values show
.flow-values show
.blend 60

node
  .id sources
  .label Sources
  .color #4cc9f0
node
  .id electricity
  .label Electricity
  .color #72efb1
node
  .id heat
  .label Heat
  .color #ff9f68
node
  .id homes
  .label Homes
  .color #d98cff
node
  .id industry
  .label Industry
  .color #f9dc5c

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

const DEMOS = [{ name: "Energy showcase", pug: SHOWCASE }, ...ADDITIONAL_DEMOS];

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
const nodeCount = $("#node-count");
const flowCount = $("#flow-count");
const nodesList = $("#nodes-list");
const flowsList = $("#flows-list");

// ---- state -----------------------------------------------------------------

const launchParams = new URLSearchParams(location.search);
const requestedDemo = Number(launchParams.get("demo"));
const selectedDemo = Number.isInteger(requestedDemo) && DEMOS[requestedDemo - 1] ? requestedDemo - 1 : (launchParams.has("demo") ? 0 : -1);
// A project file passed on the command line (pug-sankey file.pug [--gui]) is
// served by the backend and takes precedence over demos and saved workspace.
const wantsProject = launchParams.get("project") === "1";

let pugSource = selectedDemo >= 0 && !wantsProject ? (DEMOS[selectedDemo].pug ?? "") : "";
const cssSource = "";
let diagram = null;
let currentGraph = null;
let selections = [];

async function loadProjectIfRequested() {
  if (!wantsProject) return;
  try {
    pugSource = await fetch("/__project.pug").then((response) => (response.ok ? response.text() : ""));
  } catch { /* no project served — fall through to blank */ }
}
let canvasZoomPercent = 100;
const canvasUndo = [];
const canvasRedo = [];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function activeValue() { return pugSource; }
function setActiveValue(value) { pugSource = value; }

// ---- editor chrome ---------------------------------------------------------

function updateEditorChrome() {
  const value = source.value;
  applyHighlights(source, value);
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

function showSource() { source.value = pugSource; updateEditorChrome(); }

// ---- render ----------------------------------------------------------------

function update() {
  updateEditorChrome();
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
    sessionStorage.setItem("pug-sankey-workspace", JSON.stringify({ pugSource }));
  } catch { /* storage may be unavailable */ }
}

function restoreWorkspace() {
  if (selectedDemo >= 0 || wantsProject) return;
  try {
    const saved = JSON.parse(sessionStorage.getItem("pug-sankey-workspace") ?? "null");
    if (saved && typeof saved.pugSource === "string") {
      pugSource = saved.pugSource;
    }
  } catch { /* ignore corrupt state */ }
}

// ---- canvas interaction ----------------------------------------------------

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
    item.className = "object-item";
    item.innerHTML = `<strong>${escapeHtml(node.label || node.id)}</strong><small>${escapeHtml(node.id)} · value ${escapeHtml(node.hasDeclaredValue ? node.declaredValue : "auto")}</small>`;
    item.addEventListener("click", () => { selections = [{ kind: "node", id: node.id, selectionKey: node.id, lineNumber: node.lineNumber }]; paintSelections(); renderInspector(); selectSourceLine({ lineNumber: node.lineNumber }); });
    return item;
  }));
  flowsList.replaceChildren(...flows.map((edge) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "object-item";
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
    + field("Value", `<input data-node-field="value" type="number" min="0" step="any" value="${escapeHtml(node.hasDeclaredValue ? node.declaredValue : "")}" placeholder="auto (from flows)">`)
    + field("Color", `<input data-node-field="color" value="${escapeHtml(node.color ?? "")}" placeholder="#2e6ba7">`)
    + field("Layer", `<input data-node-field="layer" type="number" value="${escapeHtml(node.layer ?? 0)}">`)
    + `<label class="inspector-switch"><span>Hidden</span><input data-node-field="hidden" type="checkbox" ${node.hidden ? "checked" : ""}></label>`
    + `<button type="button" class="inspector-primary-action" id="insp-add-flow">Add flow from here</button>`
    + `<button type="button" id="insp-add-annotation">Add annotation</button>`;
  inspectorContent.querySelectorAll("[data-node-field]").forEach((input) => {
    input.addEventListener("change", () => applyNodeField(node, input.dataset.nodeField, input));
  });
  $("#insp-add-flow").addEventListener("click", () => openBuilder("flow", node));
  $("#insp-add-annotation").addEventListener("click", () => { pushUndo(); pugSource = appendNodeAnnotation(pugSource, node.lineNumber, {}); source.value = pugSource; update(); });
}

function applyNodeField(node, name, input) {
  pushUndo();
  let value = input.type === "checkbox" ? (input.checked ? "" : undefined) : input.value;
  if (name === "id") {
    const next = input.value.trim();
    if (next && next !== node.id && /^[A-Za-z][A-Za-z0-9_-]*$/.test(next)) pugSource = renameNodeReferences(pugSource, node.id, next);
  } else if (name === "hidden") {
    pugSource = setNodeField(pugSource, node.lineNumber, "hidden", input.checked ? "" : undefined);
  } else if (name === "value" && input.value.trim() === "") {
    pugSource = removeNodeField(pugSource, node.lineNumber, "value");
  } else {
    pugSource = setNodeField(pugSource, node.lineNumber, name, value ?? "");
  }
  source.value = pugSource;
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
      source.value = pugSource;
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
  source.value = pugSource;
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

const builder = $("#element-builder");
const builderTitle = $("#element-builder-title");
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
  builder.querySelectorAll(".node-only").forEach((el) => { el.style.display = isFlow ? "none" : ""; });
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
$("#element-builder-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (builderMode === "flow") {
    const from = $("#builder-from-id").value;
    const to = $("#builder-to-id").value;
    const value = Number($("#builder-value").value) || 10;
    const color = $("#builder-color").value.trim();
    const label = $("#builder-flow-label").value.trim();
    if (!from || !to) { $("#builder-error").textContent = "Choose both endpoints."; return; }
    if (from === to) { $("#builder-error").textContent = "Choose two different endpoints."; return; }
    pushUndo();
    pugSource = appendFlowReference(pugSource, 0, { from, to, value, color, label });
  } else {
    const id = $("#builder-id").value.trim();
    const label = $("#builder-label").value.trim();
    const color = $("#builder-color").value.trim();
    if (!id) { $("#builder-error").textContent = "Give the node an ID."; return; }
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id)) { $("#builder-error").textContent = "IDs start with a letter and use letters, numbers, underscores, or hyphens."; return; }
    pushUndo();
    pugSource = appendDiagramNode(pugSource, { id, label, color });
  }
  builder.close();
  source.value = pugSource;
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
  source.value = pugSource;
  update();
}
function redoCanvas() {
  if (!canvasRedo.length) return;
  canvasUndo.push(pugSource);
  pugSource = canvasRedo.pop();
  source.value = pugSource;
  update();
}
$("#undo-canvas").addEventListener("click", undoCanvas);
$("#redo-canvas").addEventListener("click", redoCanvas);

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
function saveSource() { download(new Blob([pugSource], { type: "text/plain;charset=utf-8" }), "diagram.pug"); }
$("#save-source").addEventListener("click", saveSource);
$("#save-source-as").addEventListener("click", saveSource);
$("#new-pug").addEventListener("click", () => { pushUndo(); pugSource = ""; source.value = ""; update(); });

const fileInput = $("#source-file");
$("#load-source").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (file) pugSource = await file.text();
  fileInput.value = "";
  showSource();
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

const appearance = $("#diagram-appearance");
const appearanceForm = $("#diagram-appearance-form");
const appearanceFields = {
  "theme": "theme", "background": "background", "blend": "blend",
  "node-labels": "nodeLabels", "node-values": "nodeValues",
  "flow-labels": "flowLabels", "flow-values": "flowValues",
  "label-color": "labelColor", "node-value-color": "nodeValueColor", "flow-value-color": "flowValueColor",
  "font": "font", "label-font-size": "labelFontSize", "value-font-size": "valueFontSize",
};
const diagramThemeSelect = appearanceForm.elements.namedItem("theme");
diagramThemeSelect.replaceChildren(...DIAGRAM_THEMES.map(theme => {
  const option = document.createElement("option"); option.value = theme.id; option.textContent = theme.label; return option;
}));
function updateDiagramThemeHelp() {
  $("#diagram-theme-help").textContent = DIAGRAM_THEMES.find(theme => theme.id === diagramThemeSelect.value)?.description || "";
}
diagramThemeSelect.addEventListener("change", updateDiagramThemeHelp);
$("#open-diagram-appearance").addEventListener("click", () => {
  const figure = currentGraph?.figure ?? parseDiagram(pugSource).figure;
  for (const [name,key] of Object.entries(appearanceFields)) {
    const value = figure[key];
    appearanceForm.elements.namedItem(name).value = typeof value === "boolean" ? (value ? "show" : "hide") : (value ?? "");
  }
  $("#appearance-error").textContent = "";
  updateDiagramThemeHelp();
  appearance.showModal();
});
$("#appearance-cancel").addEventListener("click", () => appearance.close());
appearanceForm.addEventListener("submit", event => {
  event.preventDefault();
  const settings = Object.fromEntries(Object.keys(appearanceFields).map(name => [name,appearanceForm.elements.namedItem(name).value.trim()]));
  for (const [name,value] of Object.entries(settings)) {
    if ((name.endsWith("-color") || name === "background") && value && !CSS.supports("color",value)) {
      $("#appearance-error").textContent = "Enter a valid color: a hex code, RGB value, or color name.";
      return;
    }
  }
  const next = setDiagramSettings(pugSource, settings);
  const parsed = parseDiagram(next);
  if (parsed.errors.length) { $("#appearance-error").textContent = parsed.errors[0]; return; }
  pushUndo(); pugSource = next; source.value = next; update(); appearance.close();
});

const themeButton = $("#theme");
const themeValue = $("#theme-value");
themeButton.querySelector("span:last-of-type").textContent = "Editor theme";
const themeStorageKey = "pug-sankey-theme-v2";
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
let editorThemeMode = document.documentElement.dataset.themePreference || "system";
function applyTheme(mode, persist = false) {
  editorThemeMode = mode;
  document.documentElement.dataset.themePreference = mode;
  document.documentElement.dataset.theme = mode === "system" ? (systemTheme.matches ? "dark" : "light") : mode;
  const resolved = document.documentElement.dataset.theme;
  themeValue.textContent = resolved === "dark" ? "Dark" : "Light";
  themeButton.title = `Switch to ${resolved === "dark" ? "light" : "dark"} mode`;
  themeButton.setAttribute("aria-label", themeButton.title);
  if (persist) try { localStorage.setItem(themeStorageKey, mode); } catch { /* ignore */ }
}
themeButton.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
});
applyTheme(editorThemeMode);
systemTheme.addEventListener("change", () => {
  if (editorThemeMode === "system") applyTheme("system");
});

attachVimMode(source, $("#vim-mode"), $("#vim-status"));
// Honor `pug-sankey --vim` by enabling Vim mode on launch.
if (launchParams.get("vim") === "1") {
  const vimToggle = $("#vim-mode");
  vimToggle.checked = true;
  vimToggle.dispatchEvent(new Event("change"));
}

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
source.addEventListener("beforeinput", pushUndo);
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

async function boot() {
  await loadProjectIfRequested();
  restoreWorkspace();
  showSource();
  update();
}
boot();
