import { createBlockDiagram, parseDiagram } from "./pugflow.mjs";
import { appendDiagramNode, appendFlowAnnotation, appendFlowReference, appendGraphImage, appendGraphNode, appendNodeAnnotation, indentSourceSelection, moveDeclarationToContainer, moveNodeToGraph, removeConnectionLabel, removeDeclaration, removeDeclarationField, removeNodeAnnotation, removeNodeDeclaration, removeNodeReferences, removeNodeField, removeNodeFields, renameGraphReferences, renameNodeReferences, setAnnotationOffsetField, setAnnotationPosition, setAnnotationText, setDeclarationOffsetField, setGraphGeometry, setGraphType, setNodeField, setNodeGeometry, setNodeOffsetField, setNodeType, setStructuralField, setStructuralLineType, setStructuralOffsetField } from "./editor-source.mjs";
import { attachVimMode } from "./vim-mode.mjs";
import { attachTextEditor } from "./text-editor.mjs";
import { arrangeNodeOffsets, cleanupAlignmentOffsets, cleanupGraphOffsets, independentMoveOffsets } from "./layout.mjs";
import { pugDefinitionsToStyleSheet } from "./style-sheet.mjs";
import { appendReusableStyle, reusableStyleDeclarations } from "./reusable-style.mjs";
import { ADDITIONAL_DEMOS } from "./demo-sources.mjs";

const EXAMPLE_DEFINITIONS = `// Production delivery architecture — layered graphs and cross-graph flows
@node edge-service
  .shape rounded
  .fill #2563eb
  .color #ffffff
  .outline #ffffff
  .outline-width 1.5
  .font-family SFMono-Regular, Menlo, Consolas, monospace
  .width 150

@node edge-decision
  .shape diamond
  .fill #2563eb
  .color #ffffff
  .outline #ffffff
  .outline-style dotted
  .font-family SFMono-Regular, Menlo, Consolas, monospace
  .width 140

@node edge-external
  .shape pill
  .fill #1d4ed8
  .color #ffffff
  .outline #ffffff
  .outline-style dashed
  .font-family SFMono-Regular, Menlo, Consolas, monospace
  .width 145

@node application-service
  .shape square
  .fill #172554
  .color #fef3c7
  .outline #fde68a
  .outline-width 2
  .shadow-color #0f172a
  .shadow-offset-x 5
  .shadow-offset-y 5
  .shadow-blur 0
  .shadow-opacity 0.35
  .width 150

@node application-datastore
  .shape square
  .fill #fef3c7
  .color #172554
  .outline #172554
  .outline-style dotted
  .outline-width 2
  .shadow-color #0f172a
  .shadow-offset-x 5
  .shadow-offset-y 5
  .shadow-blur 0
  .shadow-opacity 0.25
  .width 150

@node operations-service
  .shape hexagon
  .fill #050505
  .color #00f5ff
  .outline #ff2bd6
  .outline-width 2
  .font-family Avenir Next Condensed, Arial Narrow, sans-serif
  .font-weight 600
  .width 150

@node operations-datastore
  .shape pill
  .fill #111111
  .color #fff200
  .outline #00f5ff
  .outline-style dotted
  .outline-width 2
  .font-family Avenir Next Condensed, Arial Narrow, sans-serif
  .font-weight 600
  .width 150

@node operations-external
  .shape diamond
  .fill #050505
  .color #fff200
  .outline #ff2bd6
  .outline-width 2
  .font-family Avenir Next Condensed, Arial Narrow, sans-serif
  .font-weight 600
  .width 145

@flow edge-flow
  .color #ffffff
  .width 1.5
  .stroke-style dashed

@flow application-flow
  .color #172554
  .width 2
  .roundness 0

@flow asynchronous
  .color #172554
  .width 2
  .roundness 0
  .stroke-style dashed

@flow telemetry
  .color #00f5ff
  .width 2
  .roundness 0
  .stroke-style dotted

@flow incident
  .color #ff2bd6
  .width 3
  .roundness 0

@flow edge-to-application
  .color #000000
  .outline #ffffff
  .outline-width 1.5
  .width 2
  .annotation-above-color #000000
  .annotation-above-text-outline #ffffff
  .annotation-above-text-outline-width 3

@flow application-to-operations
  .color #000000
  .outline #ffffff
  .outline-width 1.5
  .width 2
  .stroke-style dashed
  .annotation-above-color #000000
  .annotation-above-text-outline #ffffff
  .annotation-above-text-outline-width 3

@annotation context
  .color #ffffff
  .font-family SFMono-Regular, Menlo, Consolas, monospace
  .font-style italic
`;

const EXAMPLE_CANVAS = `
  .background #f8fafc
  .defaults
    node
      .font-family Inter, sans-serif
      .font-size 14
    flow
      .color #475569
      .width 1.5
      .roundness 8
      .arrow-style forward
    .annotation
      .color #64748b
      .font-size 11

  graph
    .id edge
    .label Edge and identity
    .label-position inside
    .align center
    .layer 2
    .fill #3b82f6e8
    .color #ffffff
    .outline #ffffff
    .outline-style dotted
    .outline-width 1.5
    .font-family SFMono-Regular, Menlo, Consolas, monospace
    .font-weight 600
    .padding 30
    .x-spacing 72
    .y-spacing 48
    node
      .edge-external
      .id client
      .label Client application
      .annotation
        .above
          .context
          | Public entry point

    node
      .edge-service
      .id gateway
      .label API gateway
      .layer 2

    image
      .id github-mark
      .source https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png
      .width 72
      .height 72
      .annotation
        .above URL image

    node
      .edge-service
      .id identity
      .label Identity provider
      .layer 1

    node
      .edge-decision
      .id policy
      .label Access policy
      .layer 0

    flow
      .from client
      .to gateway
      .label HTTPS
      .edge-flow

    flow
      .from gateway
      .to identity
      .label validate token
      .edge-flow

    flow
      .from gateway
      .to github-mark
      .direction down
      .edge-flow

    flow
      .from identity
      .to policy
      .label claims
      .edge-flow

  graph
    .id application
    .label Application services
    .label-position inside
    .align center
    .layer 1
    .fill #fef3c750
    .color #172554
    .outline #172554
    .outline-width 2
    .padding 30
    .x-spacing 76
    .y-spacing 48
    node
      .application-service
      .id api
      .label Application API

    node
      .application-service
      .id orders
      .label Order service

    node
      .application-service
      .id inventory
      .label Inventory service

    node
      .application-datastore
      .id primary-db
      .label Primary database

    node
      .application-datastore
      .id event-stream
      .label Event stream

    flow
      .from api
      .to orders
      .direction right
      .application-flow

    flow
      .from orders
      .to inventory
      .direction right
      .application-flow

    flow
      .from orders
      .to primary-db
      .direction down
      .application-flow

    flow
      .from orders
      .to event-stream
      .direction down
      .asynchronous

    flow
      .from inventory
      .to primary-db
      .direction down
      .application-flow

  graph
    .id operations
    .label Operations plane
    .label-position inside
    .align center
    .layer 0
    .fill #050505f5
    .color #fff200
    .outline #ff2bd6
    .outline-width 2
    .font-family Avenir Next Condensed, Arial Narrow, sans-serif
    .font-weight 600
    .padding 30
    .x-spacing 72
    node
      .operations-service
      .id collector
      .label Telemetry collector

    node
      .operations-datastore
      .id metrics
      .label Metrics store

    node
      .operations-service
      .id alerting
      .label Alert manager

    node
      .operations-external
      .id oncall
      .label On-call engineer

    flow
      .from collector
      .to metrics
      .telemetry

    flow
      .from metrics
      .to alerting
      .telemetry

    flow
      .from alerting
      .to oncall
      .label page
      .incident

  flow
    .from policy
    .to api
    .label authorized request
    .direction down
    .source-face bottom
    .target-face top
    .edge-to-application

  flow
    .from event-stream
    .to collector
    .label delivery metrics
    .direction down
    .application-to-operations
`;
  const EXAMPLE_CANVAS_SOURCE = EXAMPLE_CANVAS.trim().split("\n").map((line) => line.startsWith("  ") ? line.slice(2) : line).join("\n");
  const EXAMPLE = `// Pugflow showcase — edit anything and watch the preview update\n${EXAMPLE_CANVAS_SOURCE}`;
  const EXAMPLE_STYLES = pugDefinitionsToStyleSheet(EXAMPLE_DEFINITIONS);
  const DEMOS = [
    { name: "Production architecture", pug: EXAMPLE, css: EXAMPLE_STYLES },
    ...ADDITIONAL_DEMOS,
  ];

const source = attachTextEditor(document.querySelector("#source"));
const editorShell = document.querySelector(".editor-shell");
const lineNumbers = document.querySelector("#line-numbers");
const colorPickerPopup = document.querySelector("#color-picker-popup");
const colorPickerSaturation = document.querySelector("#color-picker-saturation");
const colorPickerMarker = document.querySelector("#color-picker-marker");
const colorPickerHue = document.querySelector("#color-picker-hue");
const colorPickerAlpha = document.querySelector("#color-picker-alpha");
const colorPickerAlphaValue = document.querySelector("#color-picker-alpha-value");
const colorPickerValue = document.querySelector("#color-picker-value");
const colorPickerH = document.querySelector("#color-picker-h");
const colorPickerS = document.querySelector("#color-picker-s");
const colorPickerV = document.querySelector("#color-picker-v");
const colorPickerPreview = document.querySelector("#color-picker-preview");
const colorPickerSummary = document.querySelector("#color-picker-summary");
const currentLine = document.querySelector("#current-line");
const vimBlockCursor = document.querySelector("#vim-block-cursor");
const completionMenu = document.querySelector("#completion-menu");
const canvas = document.querySelector("#diagram");
const canvasShell = document.querySelector(".canvas-shell");
const canvasZoom = document.querySelector("#canvas-zoom");
const canvasToast = document.querySelector("#canvas-toast");
let canvasToastTimer = null;

function showCanvasToast(message) {
  canvasToast.textContent = message;
  canvasToast.classList.add("show");
  clearTimeout(canvasToastTimer);
  canvasToastTimer = setTimeout(() => canvasToast.classList.remove("show"), 2200);
}

function renderImagePanel(image) {
  const graph = graphForNode(image.id);
  const graphOptions = currentGraph.groups.map((group) => `<option value="${escapeHtml(group.id)}"${group.id === graph?.id ? " selected" : ""}>${escapeHtml(group.label || group.id)}</option>`).join("");
  inspectorContent.innerHTML = `<div class="inspector-heading"><div class="inspector-heading-text"><strong>Image</strong></div><label class="inspector-switch inspector-switch-heading"><span>Hidden</span><input data-node-hidden type="checkbox"${image.hidden ? " checked" : ""}></label></div>`
    + `<label class="inspector-id-field">ID (optional)<input data-node-field="id" value="${escapeHtml(image.explicitId)}" placeholder="${escapeHtml(image.id)}" pattern="[A-Za-z][A-Za-z0-9_-]*"></label>`
    + imagePreviewMarkup(image)
    + `<div class="inspector-grid"><label>Graph<select data-node-graph>${graphOptions}</select></label><label>Layer (${image.layer ?? 0})<select data-node-layer-order><option value="">Choose…</option><option value="up">Move Up</option><option value="down">Move Down</option><option value="top">Send to Top</option><option value="bottom">Send to Bottom</option></select></label></div>`
    + nodeConnectionsSection(image);
  setReusableStyleAction();
}
const inspector = document.querySelector("#canvas-inspector");
const inspectorContent = document.querySelector("#inspector-content");
const saveReusableStyle = document.querySelector("#save-reusable-style");
const status = document.querySelector("#status");
const sourceFile = document.querySelector("#source-file");
const nodeImageFile = document.querySelector("#node-image-file");
const themeToggle = document.querySelector("#theme");
const themeValue = document.querySelector("#theme-value");
const main = document.querySelector("main");
const sourcePanel = document.querySelector("#source-panel");
const panelResizer = document.querySelector("#panel-resizer");
const layersPanel = document.querySelector("#layers-panel");
const graphPanelResizer = document.querySelector("#graph-panel-resizer");
const layersList = document.querySelector("#layers-list");
const graphBrowserSelect = document.querySelector("#graph-browser-select");
const graphNodesList = document.querySelector("#graph-nodes-list");
const graphFlowsList = document.querySelector("#graph-flows-list");
const graphCount = document.querySelector("#graph-count");
const graphNodeCount = document.querySelector("#graph-node-count");
const graphFlowCount = document.querySelector("#graph-flow-count");
const layersToggle = document.querySelector("#toggle-layers");
const vimToggle = document.querySelector("#vim-mode");
const vimStatus = document.querySelector("#vim-status");
const graphBuilder = document.querySelector("#graph-builder");
const graphBuilderForm = document.querySelector("#graph-builder-form");
const annotationBuilder = document.querySelector("#annotation-builder");
const annotationBuilderForm = document.querySelector("#annotation-builder-form");
const builderSources = document.querySelector("#builder-sources");
const builderTargets = document.querySelector("#builder-targets");
const builderFromGraph = document.querySelector("#builder-from-graph");
const builderToGraph = document.querySelector("#builder-to-graph");
const builderFromDirection = document.querySelector("#builder-from-direction");
const builderToDirection = document.querySelector("#builder-to-direction");
const builderConnectedNode = document.querySelector("#builder-connected-node");
const builderFlowDirection = document.querySelector("#builder-flow-direction");
const builderConnectedFace = document.querySelector("#builder-connected-face");
const builderNewNodeGraph = document.querySelector("#builder-new-node-graph");
const builderNodeType = document.querySelector("#builder-node-type");
const builderLineType = document.querySelector("#builder-line-type");
const builderId = document.querySelector("#builder-id");
const builderLabel = document.querySelector("#builder-label");
const builderDiagramId = document.querySelector("#builder-diagram-id");
const builderDiagramLabel = document.querySelector("#builder-diagram-label");
const builderDiagramPlacement = document.querySelector("#builder-diagram-placement");
const builderDiagramRelativeTo = document.querySelector("#builder-diagram-relative-to");
const builderError = document.querySelector("#builder-error");
const styleBuilder = document.querySelector("#style-builder");
const styleBuilderForm = document.querySelector("#style-builder-form");
const styleBuilderKind = document.querySelector("#style-builder-kind");
const styleBuilderName = document.querySelector("#style-builder-name");
const styleBuilderPreview = document.querySelector("#style-builder-preview");
const styleBuilderError = document.querySelector("#style-builder-error");
const PANEL_WIDTH_KEY = "pugflow-panel-width-v1";
const PANEL_COLLAPSED_KEY = "pugflow-panel-collapsed-v1";
const LAYERS_COLLAPSED_KEY = "pugflow-layers-collapsed-v1";
const LAYERS_WIDTH_KEY = "pugflow-layers-width-v1";
const THEME_KEY = "pugflow-theme-v1";
const WORKSPACE_KEY = "pugflow-workspace-v1";
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
let diagram;
let currentGraph;
let selections = [];
let browsedGraphId = "";
let canvasUndo = [];
let canvasRedo = [];
let canvasMode = "select";
let colorPickerActive = false;
let colorPickerSourceAnchor = null;
const launchParams = new URLSearchParams(location.search);
const requestedDemo = Number(launchParams.get("demo"));
const selectedDemo = Number.isInteger(requestedDemo) && requestedDemo >= 1 && requestedDemo <= DEMOS.length
  ? DEMOS[requestedDemo - 1]
  : null;
const workspacePersistenceEnabled = !selectedDemo && launchParams.get("project") !== "1";
let restoredWorkspace = null;
if (workspacePersistenceEnabled) {
  try {
    const value = JSON.parse(localStorage.getItem(WORKSPACE_KEY));
    if (value && typeof value === "object") restoredWorkspace = value;
  } catch {
    restoredWorkspace = null;
  }
}
let activeDocument = restoredWorkspace?.activeDocument === "css" ? "css" : "pug";
let pugSource = typeof restoredWorkspace?.pugSource === "string" ? restoredWorkspace.pugSource : (selectedDemo?.pug ?? "");
let cssSource = typeof restoredWorkspace?.cssSource === "string" ? restoredWorkspace.cssSource : (selectedDemo?.css ?? "");
let pugFileName = typeof restoredWorkspace?.pugFileName === "string" ? restoredWorkspace.pugFileName : (launchParams.get("pug_name") ?? (selectedDemo ? `demo${requestedDemo}.pug` : ""));
let cssFileName = typeof restoredWorkspace?.cssFileName === "string" ? restoredWorkspace.cssFileName : (launchParams.get("css_name") ?? (selectedDemo ? `demo${requestedDemo}.css` : ""));
let pugFileHandle = null;
let cssFileHandle = null;
let hasCssDocument = Boolean(restoredWorkspace?.hasCssDocument || cssFileName || cssSource || activeDocument === "css");
let canvasZoomPercent = 100;
let pendingReusableStyle = null;
if (launchParams.get("project") === "1") {
  [pugSource, cssSource] = await Promise.all([
    fetch("/__project.pug").then((response) => response.ok ? response.text() : ""),
    fetch("/__project.css").then((response) => response.ok ? response.text() : ""),
  ]);
}

function updateSourceFileNames() {
  const pugTab = document.querySelector('[data-source-tab="pug"]');
  const cssTab = document.querySelector('[data-source-tab="css"]');
  pugTab.textContent = pugFileName || "PUG";
  cssTab.textContent = cssFileName || "CSS";
  pugTab.title = pugFileName || "Unsaved PUG document";
  cssTab.title = cssFileName || (hasCssDocument ? "Unsaved CSS document" : "No CSS file loaded");
}

function storeActiveDocument() {
  if (activeDocument === "pug") pugSource = source.value;
  else {
    cssSource = source.value;
    if (cssSource) hasCssDocument = true;
  }
}

function persistWorkspace() {
  if (!workspacePersistenceEnabled) return;
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify({
      pugSource,
      cssSource,
      pugFileName,
      cssFileName,
      hasCssDocument,
      activeDocument,
    }));
  } catch {
    // Browser storage may be unavailable or full; editing should continue normally.
  }
}

function activateDocument(kind, force = false) {
  if (kind === activeDocument && !force) return;
  if (!force) storeActiveDocument();
  activeDocument = kind;
  source.value = kind === "pug" ? pugSource : cssSource;
  document.querySelectorAll("[data-source-tab]").forEach((tab) => {
    const selected = tab.dataset.sourceTab === kind;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  highlightSource();
  syncHighlightScroll();
  update();
}

function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character])); }
let applyPopupColor = null;
let popupHue = 0;
let popupSaturation = 0;
let popupBrightness = 0;
let popupAlpha = 1;
function rgbToHsv(hex) {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let hue = 0;
  if (delta) hue = max === r ? 60 * (((g - b) / delta) % 6) : max === g ? 60 * ((b - r) / delta + 2) : 60 * ((r - g) / delta + 4);
  return { h: (hue + 360) % 360, s: max ? delta / max : 0, v: max };
}
function hsvToHex(h, s, v) {
  const chroma = v * s, segment = h / 60, x = chroma * (1 - Math.abs(segment % 2 - 1));
  const [r, g, b] = segment < 1 ? [chroma, x, 0] : segment < 2 ? [x, chroma, 0] : segment < 3 ? [0, chroma, x] : segment < 4 ? [0, x, chroma] : segment < 5 ? [x, 0, chroma] : [chroma, 0, x];
  const match = v - chroma;
  return `#${[r, g, b].map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0")).join("")}`;
}
function colorToHsva(value) {
  let normalized = String(value).trim();
  if (!/^#/.test(normalized) && CSS.supports("color", normalized)) {
    const probe = document.createElement("span");
    probe.style.color = normalized;
    document.body.append(probe);
    const channels = getComputedStyle(probe).color.match(/[\d.]+/g)?.map(Number) ?? [];
    probe.remove();
    if (channels.length >= 3) normalized = `#${channels.slice(0, 3).map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}${channels.length > 3 ? Math.round(channels[3] * 255).toString(16).padStart(2, "0") : ""}`;
  }
  const match = normalized.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!match) return null;
  const expanded = match[1].length <= 4 ? [...match[1]].map((digit) => digit + digit).join("") : match[1];
  return { ...rgbToHsv(`#${expanded.slice(0, 6)}`), a: expanded.length === 8 ? parseInt(expanded.slice(6), 16) / 255 : 1 };
}
function pickerColor() {
  const opaque = hsvToHex(popupHue, popupSaturation, popupBrightness);
  return popupAlpha >= 0.999 ? opaque : `${opaque}${Math.round(popupAlpha * 255).toString(16).padStart(2, "0")}`;
}
function paintColorSurface() {
  const context = colorPickerSaturation.getContext("2d");
  context.fillStyle = `hsl(${popupHue} 100% 50%)`;
  context.fillRect(0, 0, colorPickerSaturation.width, colorPickerSaturation.height);
  const white = context.createLinearGradient(0, 0, colorPickerSaturation.width, 0);
  white.addColorStop(0, "#fff"); white.addColorStop(1, "transparent");
  context.fillStyle = white; context.fillRect(0, 0, colorPickerSaturation.width, colorPickerSaturation.height);
  const black = context.createLinearGradient(0, 0, 0, colorPickerSaturation.height);
  black.addColorStop(0, "transparent"); black.addColorStop(1, "#000");
  context.fillStyle = black; context.fillRect(0, 0, colorPickerSaturation.width, colorPickerSaturation.height);
}
function syncColorPicker({ apply = false, repaint = false } = {}) {
  const opaqueColor = hsvToHex(popupHue, popupSaturation, popupBrightness);
  const color = pickerColor();
  colorPickerHue.value = String(Math.round(popupHue));
  colorPickerH.value = String(Math.round(popupHue));
  colorPickerS.value = String(Math.round(popupSaturation * 100));
  colorPickerV.value = String(Math.round(popupBrightness * 100));
  colorPickerAlpha.value = String(Math.round(popupAlpha * 100));
  colorPickerAlphaValue.value = `${Math.round(popupAlpha * 100)}%`;
  colorPickerValue.value = color;
  colorPickerValue.setAttribute("aria-invalid", "false");
  colorPickerPreview.style.setProperty("--preview-color", color);
  colorPickerAlpha.style.setProperty("--alpha-color", opaqueColor);
  colorPickerSummary.value = `H ${Math.round(popupHue)}° · S ${Math.round(popupSaturation * 100)}% · V ${Math.round(popupBrightness * 100)}% · A ${Math.round(popupAlpha * 100)}%`;
  colorPickerMarker.style.left = `${popupSaturation * 100}%`;
  colorPickerMarker.style.top = `${(1 - popupBrightness) * 100}%`;
  colorPickerMarker.style.setProperty("--marker-color", popupBrightness > 0.55 ? "#111" : "#fff");
  colorPickerSaturation.setAttribute("aria-valuetext", `Saturation ${Math.round(popupSaturation * 100)}%, value ${Math.round(popupBrightness * 100)}%`);
  if (repaint) paintColorSurface();
  if (apply) applyPopupColor?.(color);
}
function hideColorPicker() {
  if (colorPickerPopup.hidden) return;
  colorPickerPopup.hidden = true;
  if (colorPickerActive && colorPickerSourceAnchor !== null && pugSource !== colorPickerSourceAnchor) {
    canvasUndo.push(colorPickerSourceAnchor);
    canvasRedo = [];
  }
  colorPickerActive = false;
  colorPickerSourceAnchor = null;
}
function openColorPickerPopup(trigger, value, apply) {
  colorPickerSourceAnchor = pugSource;
  colorPickerActive = true;
  const hsva = colorToHsva(value);
  if (hsva) {
    popupHue = hsva.h;
    popupSaturation = hsva.s;
    popupBrightness = hsva.v;
    popupAlpha = hsva.a;
  } else {
    popupAlpha = ["none", "transparent"].includes(String(value).toLowerCase()) ? 0 : 1;
  }
  applyPopupColor = apply;
  colorPickerPopup.hidden = false;
  syncColorPicker({ repaint: true });
  const bounds = trigger.getBoundingClientRect();
  const popup = colorPickerPopup.getBoundingClientRect();
  colorPickerPopup.style.left = `${Math.max(8, Math.min(window.innerWidth - popup.width - 8, bounds.left))}px`;
  colorPickerPopup.style.top = `${Math.max(8, Math.min(window.innerHeight - popup.height - 8, bounds.bottom + 5))}px`;
}
colorPickerHue.addEventListener("input", () => {
  popupHue = Number(colorPickerHue.value);
  syncColorPicker({ apply: true, repaint: true });
});
colorPickerAlpha.addEventListener("input", () => {
  popupAlpha = Number(colorPickerAlpha.value) / 100;
  syncColorPicker({ apply: true });
});
function chooseSaturationAndValue(clientX, clientY) {
  const bounds = colorPickerSaturation.getBoundingClientRect();
  popupSaturation = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
  popupBrightness = Math.max(0, Math.min(1, 1 - (clientY - bounds.top) / bounds.height));
  syncColorPicker({ apply: true });
}
colorPickerSaturation.addEventListener("pointerdown", (event) => {
  colorPickerSaturation.setPointerCapture(event.pointerId);
  chooseSaturationAndValue(event.clientX, event.clientY);
  const move = (pointer) => chooseSaturationAndValue(pointer.clientX, pointer.clientY);
  const done = (pointer) => {
    if (colorPickerSaturation.hasPointerCapture(pointer.pointerId)) colorPickerSaturation.releasePointerCapture(pointer.pointerId);
    colorPickerSaturation.removeEventListener("pointermove", move);
    colorPickerSaturation.removeEventListener("pointerup", done);
    colorPickerSaturation.removeEventListener("pointercancel", done);
  };
  colorPickerSaturation.addEventListener("pointermove", move);
  colorPickerSaturation.addEventListener("pointerup", done);
  colorPickerSaturation.addEventListener("pointercancel", done);
});
colorPickerSaturation.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 0.1 : 0.01;
  if (event.key === "ArrowLeft") popupSaturation = Math.max(0, popupSaturation - step);
  else if (event.key === "ArrowRight") popupSaturation = Math.min(1, popupSaturation + step);
  else if (event.key === "ArrowUp") popupBrightness = Math.min(1, popupBrightness + step);
  else if (event.key === "ArrowDown") popupBrightness = Math.max(0, popupBrightness - step);
  else return;
  event.preventDefault();
  syncColorPicker({ apply: true });
});
colorPickerValue.addEventListener("input", () => {
  const hsva = colorToHsva(colorPickerValue.value);
  if (!hsva) {
    colorPickerValue.setAttribute("aria-invalid", "true");
    return;
  }
  popupHue = hsva.h;
  popupSaturation = hsva.s;
  popupBrightness = hsva.v;
  popupAlpha = hsva.a;
  syncColorPicker({ apply: true, repaint: true });
});
function updatePickerFromHsvFields() {
  popupHue = Math.max(0, Math.min(359, Number(colorPickerH.value) || 0));
  popupSaturation = Math.max(0, Math.min(100, Number(colorPickerS.value) || 0)) / 100;
  popupBrightness = Math.max(0, Math.min(100, Number(colorPickerV.value) || 0)) / 100;
  syncColorPicker({ apply: true, repaint: true });
}
[colorPickerH, colorPickerS, colorPickerV].forEach((input) => input.addEventListener("input", updatePickerFromHsvFields));
document.addEventListener("pointerdown", (event) => {
  if (!colorPickerPopup.hidden && !colorPickerPopup.contains(event.target) && !event.target.closest("[data-color-popup]")) hideColorPicker();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !colorPickerPopup.hidden) hideColorPicker();
});
function colorControl(label, field, value, scope = "node", key = `${scope}:${field}`) {
  const noColor = ["none", "transparent"].includes(String(value ?? "").toLowerCase());
  const swatch = !noColor && CSS.supports("color", String(value ?? "").trim()) ? String(value).trim() : "transparent";
  return `<label>${label}<span class="inspector-color"><button class="color-popup-trigger${noColor ? " none" : ""}" type="button" data-color-popup="${key}" style="--swatch:${escapeHtml(swatch)}" aria-label="Choose ${label.toLowerCase()}"></button><input data-${scope}-field="${field}" data-color-text="${key}" value="${escapeHtml(value ?? "")}" placeholder="CSS color"></span></label>`;
}

function fontOptions(scope, style = {}, includeColor = true, fieldPrefix = "") {
  const option = (value, current) => `<option value="${value}"${String(current) === value ? " selected" : ""}>${value}</option>`;
  const field = (name) => `${fieldPrefix}${name}`;
  return `<details class="font-options"><summary>Font options</summary>${includeColor ? colorControl("Color", field("color"), style.color, scope) : ""}<label>Font family<input data-${scope}-field="${field("font-family")}" value="${escapeHtml(style.fontFamily ?? "")}" placeholder="inherit"></label><div class="inspector-grid"><label>Size<input data-${scope}-field="${field("font-size")}" type="number" min="1" value="${style.fontSize ?? 12}"></label><label>Weight<select data-${scope}-field="${field("font-weight")}">${["normal","500","600","bold"].map((v) => option(v, style.fontWeight ?? "normal")).join("")}</select></label><label>Style<select data-${scope}-field="${field("font-style")}">${["normal","italic","oblique"].map((v) => option(v, style.fontStyle ?? "normal")).join("")}</select></label><label>Decoration<select data-${scope}-field="${field("text-decoration")}">${["none","underline","line-through","overline"].map((v) => option(v, style.textDecoration ?? "none")).join("")}</select></label></div><div class="inspector-grid">${colorControl("Text border", field("text-outline"), style.textOutline, scope)}<label>Border width<input data-${scope}-field="${field("text-outline-width")}" type="number" min="0" step="0.5" value="${style.textOutlineWidth ?? 0}"></label></div></details>`;
}

function nodeAnnotationControls(node) {
  const option = (value, current) => `<option value="${value}"${String(current) === value ? " selected" : ""}>${value}</option>`;
  const fields = node.annotations.map((annotation, index) => {
    const position = annotation.position;
    const colorKey = `node-annotation:${annotation.lineNumber}`;
    const noColor = ["none", "transparent"].includes(String(annotation.color ?? "").toLowerCase());
    const target = `data-annotation-line="${annotation.lineNumber}"`;
    const title = `${position === "below" ? "Below" : "Above"} ${node.annotations.filter((item) => item.position === position).indexOf(annotation) + 1}`;
    const swatch = !noColor && CSS.supports("color", String(annotation.color ?? "").trim()) ? annotation.color : "transparent";
    return `<details class="annotation-editor"><summary><span>${title}</span><label class="inspector-switch inspector-switch-summary"><span>Hidden</span><input data-node-annotation-hidden ${target} type="checkbox"${annotation.hidden ? " checked" : ""}></label></summary><label>Position<select data-node-annotation-position ${target}>${["above","below"].map((value) => option(value, position)).join("")}</select></label><label>Text<textarea data-node-annotation-text ${target} rows="2">${escapeHtml(annotation.text)}</textarea></label><details class="font-options"><summary>Font options</summary><label>Color<span class="inspector-color"><button class="color-popup-trigger${noColor ? " none" : ""}" type="button" data-color-popup="${colorKey}" style="--swatch:${escapeHtml(swatch)}" aria-label="Choose color"></button><input ${target} data-node-annotation-field="color" data-color-text="${colorKey}" value="${escapeHtml(annotation.color ?? "")}" placeholder="CSS color"></span></label><label>Font family<input ${target} data-node-annotation-field="font-family" value="${escapeHtml(annotation.fontFamily ?? "")}" placeholder="inherit"></label><div class="inspector-grid"><label>Size<input ${target} data-node-annotation-field="font-size" type="number" min="1" value="${annotation.fontSize ?? 12}"></label><label>Weight<select ${target} data-node-annotation-field="font-weight">${["normal","500","600","bold"].map((v) => option(v, annotation.fontWeight ?? "normal")).join("")}</select></label><label>Style<select ${target} data-node-annotation-field="font-style">${["normal","italic","oblique"].map((v) => option(v, annotation.fontStyle ?? "normal")).join("")}</select></label><label>Decoration<select ${target} data-node-annotation-field="text-decoration">${["none","underline","line-through","overline"].map((v) => option(v, annotation.textDecoration ?? "none")).join("")}</select></label></div><div class="inspector-grid">${colorControl("Text border", "text-outline", annotation.textOutline, "node-annotation", `${colorKey}:outline`).replaceAll("data-node-annotation-field", `${target} data-node-annotation-field`)}<label>Border width<input ${target} data-node-annotation-field="text-outline-width" type="number" min="0" step="0.5" value="${annotation.textOutlineWidth ?? 0}"></label></div></details><div class="inspector-inline-field"><label>Offset<input value="(${annotation.offsetX ?? 0}, ${annotation.offsetY ?? 0})" readonly></label><button type="button" data-remove-annotation-offset="${annotation.lineNumber}"${annotation.offsetX || annotation.offsetY ? "" : " disabled"}>Remove</button></div><button type="button" class="danger annotation-delete" data-delete-annotation="${annotation.lineNumber}">Delete annotation</button></details>`;
  }).join("");
  const allHidden = node.annotations.length && node.annotations.every((annotation) => annotation.hidden);
  return `<details class="annotations-editor"><summary><span>Annotations <small>${node.annotations.length}</small></span><label class="inspector-switch inspector-switch-summary"><span>Hidden</span><input data-node-annotations-hidden type="checkbox"${allHidden ? " checked" : ""}${node.annotations.length ? "" : " disabled"}></label></summary>${fields || '<p class="inspector-empty">No annotations.</p>'}</details><button type="button" class="inspector-primary-action" data-add-annotation>+ Add Annotation</button>`;
}

function openAnnotationBuilder(target = "node") {
  annotationBuilder.dataset.target = target;
  document.querySelector("#annotation-builder-help").textContent = `Add another annotation to the selected ${target === "line" ? "flow" : "node"}.`;
  const type = document.querySelector("#annotation-builder-type");
  type.innerHTML = `<option value="">Default annotation</option>${reusableNames("annotation").map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;
  document.querySelector("#annotation-builder-position-row").hidden = target === "line";
  document.querySelector("#annotation-builder-position").value = "above";
  document.querySelector("#annotation-builder-text").value = "Annotation";
  document.querySelector("#annotation-builder-color").value = "";
  document.querySelector("#annotation-builder-font-size").value = "";
  document.querySelector("#annotation-builder-font-family").value = "";
  document.querySelector("#annotation-builder-font-weight").value = "";
  document.querySelector("#annotation-builder-font-style").value = "";
  document.querySelector("#annotation-builder-decoration").value = "";
  document.querySelector("#annotation-builder-text-outline").value = "";
  document.querySelector("#annotation-builder-text-outline-width").value = "";
  document.querySelector("#annotation-builder-error").textContent = "";
  annotationBuilder.showModal();
  document.querySelector("#annotation-builder-text").select();
}

function tidyInspectorSections(root = inspectorContent) {
  root.querySelectorAll("[data-shadow-toggle]").forEach((toggle) => {
    const details = toggle.closest("details");
    const label = toggle.closest("label");
    const summary = details?.querySelector(":scope > summary");
    if (!details || !label || !summary) return;
    summary.textContent = "Shadow";
    label.className = "inspector-switch";
    label.replaceChildren(Object.assign(document.createElement("span"), { textContent: "Enabled" }), toggle);
    summary.insertAdjacentElement("afterend", label);
  });
}

function paintSelections() {
  const selectedKeys = new Set(selections.map((selection) => selection.selectionKey));
  canvas.querySelectorAll("[data-selection-key]").forEach((element) => {
    element.classList.toggle("selected-element", selectedKeys.has(element.dataset.selectionKey));
  });
}

function selectedNodes() {
  const selectedIds = new Set(selections.filter((item) => item.kind === "node").map((item) => item.id));
  return diagram?.layout?.nodes.filter((node) => selectedIds.has(node.id)) ?? [];
}

function selectedEdges() {
  return selections.filter((item) => item.kind === "line").map((item) => diagram?.layout?.edges.find((edge) => edge.from === item.from && edge.to === item.to && (!item.lineNumber || edge.lineNumber === item.lineNumber))).filter(Boolean);
}

function flowEndpointNodes(edge) {
  const owningGroup = edge.graphId ? currentGraph.groups.find((group) => group.id === edge.graphId) : null;
  const allowedIds = owningGroup ? new Set(owningGroup.nodeIds) : null;
  return currentGraph.nodes.filter((node) => !allowedIds || allowedIds.has(node.id));
}

function flowConnectionControls(edge) {
  if (!edge) return "";
  const endpointInput = (field, selected, excluded) => {
    const listId = `flow-${edge.lineNumber}-${field}-nodes`;
    const options = flowEndpointNodes(edge).filter((node) => node.id !== excluded).map((node) => {
      const group = graphForNode(node.id);
      const label = `${node.label || node.id}${group ? ` — ${group.label || group.id}` : ""}`;
      return `<option value="${escapeHtml(node.id)}" label="${escapeHtml(label)}"></option>`;
    }).join("");
    return `<input data-line-endpoint="${field}" value="${escapeHtml(selected)}" list="${listId}" autocomplete="off"><datalist id="${listId}">${options}</datalist>`;
  };
  const sourceFace = edge.sourceFace ?? ({ up: "top", right: "right", down: "bottom", left: "left" }[edge.sourceDirection] ?? "right");
  const targetFace = edge.targetFace ?? ({ down: "top", left: "right", up: "bottom", right: "left" }[edge.targetLayoutDirection ?? edge.layoutDirection] ?? "left");
  const faceOptions = (explicit, effective) => `<option value=""${explicit ? "" : " selected"}>Auto (${effective})</option>${["top", "right", "bottom", "left"].map((face) => `<option value="${face}"${explicit === face ? " selected" : ""}>${face}</option>`).join("")}`;
  return `<details open class="flow-connection-editor"><summary>Connection</summary><div class="inspector-grid"><label>From object${endpointInput("from", edge.from, edge.to)}</label><label>To object${endpointInput("to", edge.to, edge.from)}</label><label>Leaves source<select data-line-face="source-face">${faceOptions(edge.sourceFace, sourceFace)}</select></label><label>Enters target<select data-line-face="target-face">${faceOptions(edge.targetFace, targetFace)}</select></label></div></details>`;
}

function reusableNames(kind) {
  return [...new Set([...`${pugSource}\n${cssSource}`.matchAll(new RegExp(`^@${kind}\\s+([\\w-]+)`, "gm"))].map((match) => match[1]))];
}

function suggestedReusableName(kind) {
  const selection = selections[0];
  const base = kind === "node" ? `${selection?.id ?? "custom"}_node`
    : kind === "flow" ? `${selection?.from ?? "custom"}_${selection?.to ?? "flow"}_flow`
      : kind === "graph" ? `${selection?.id ?? "custom"}_graph`
        : "custom_note";
  const normalized = base.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/^[^a-zA-Z]+/, "") || `custom_${kind}`;
  const used = new Set(["node", "flow", "annotation"].flatMap(reusableNames));
  if (!used.has(normalized)) return normalized;
  let suffix = 2;
  while (used.has(`${normalized}_${suffix}`)) suffix += 1;
  return `${normalized}_${suffix}`;
}

/** Baseline a preset is measured against: its own preset when set, otherwise category defaults. */
function presetBaseline(kind, presetName) {
  const presets = currentGraph?.presets?.[kind] ?? {};
  return (presetName && presets[presetName]) || currentGraph?.defaults?.[kind] || {};
}

function openReusableStyleBuilder(kind, model, baseline = undefined, lineNumber = null) {
  const declarations = reusableStyleDeclarations(kind, model, baseline);
  pendingReusableStyle = { kind, declarations, lineNumber };
  styleBuilderKind.textContent = kind;
  styleBuilderName.value = suggestedReusableName(kind);
  styleBuilderPreview.textContent = declarations.length
    ? declarations.map(([property, value]) => `${property}: ${value};`).join("\n")
    : "/* matches the current defaults — the preset stores no overrides */";
  styleBuilderError.textContent = "";
  styleBuilder.showModal();
  styleBuilderName.select();
}

function openSelectedReusableStyle(kind) {
  if (kind === "node") {
    const selected = selectedNodes()[0];
    const node = selected ? currentGraph.nodes.find((candidate) => candidate.id === selected.id) : null;
    if (node) openReusableStyleBuilder(kind, node.style, presetBaseline("node", node.nodeType), node.lineNumber);
    return;
  }
  if (kind === "flow") {
    const selection = selections.find((item) => item.kind === "line");
    const edge = diagram?.layout?.edges.find((item) => item.from === selection?.from && item.to === selection?.to && (!selection?.lineNumber || item.lineNumber === selection.lineNumber));
    if (edge) openReusableStyleBuilder(kind, edge, presetBaseline("flow", edge.lineType), edge.lineNumber);
    return;
  }
  if (kind === "graph") {
    const selection = selections.find((item) => item.kind === "graph");
    const group = currentGraph.groups.find((candidate) => candidate.id === selection?.id);
    if (group) openReusableStyleBuilder(kind, group, presetBaseline("graph", group.graphType), group.lineNumber);
    return;
  }
  if (kind === "annotation") {
    const selection = selections.find((item) => item.kind === "annotation");
    const annotation = currentGraph.nodes.flatMap((node) => node.annotations).find((item) => item.lineNumber === selection?.lineNumber);
    if (annotation) openReusableStyleBuilder(kind, annotation);
  }
}

function syncInspectorScrollbarWidth() {
  inspector.classList.remove("has-scrollbar");
  requestAnimationFrame(() => {
    if (!inspector.hidden) inspector.classList.toggle("has-scrollbar", inspector.scrollHeight > inspector.clientHeight + 1);
  });
}

function setReusableStyleAction(kind = "") {
  saveReusableStyle.hidden = !kind;
  saveReusableStyle.dataset.buildStyle = kind;
  saveReusableStyle.textContent = kind ? `Save as ${kind} preset` : "Save as preset";
}

// ---------------------------------------------------------------------------
// Preview-first property panels with contextual sidecars
// ---------------------------------------------------------------------------
const sidecar = document.querySelector("#inspector-sidecar");
const sidecarContent = document.querySelector("#sidecar-content");
const sidecarTitle = document.querySelector("#sidecar-title");
let activeSidecar = null;
let sidecarSelectionKey = "";
let renderedSidecarKey = "";

const SIDECAR_TITLES = {
  "node-box": "Node box",
  "image-box": "Image",
  "node-label": "Node label",
  "node-annotations": "Node annotations",
  "node-flow": "Flow properties",
  "flow-line": "Flow line",
  "flow-annotations": "Flow annotations",
  "flow-connection": "Flow connection",
  "graph-frame": "Graph frame",
  "graph-title": "Graph title",
};
const FACE_FOR_SOURCE = { up: "top", right: "right", down: "bottom", left: "left" };
const FACE_FOR_TARGET = { down: "top", left: "right", up: "bottom", right: "left" };
const DIRECTION_FOR_FACE = { top: "up", right: "right", bottom: "down", left: "left" };

/** Find an inspector control in either the main panel or the open sidecar. */
function inspectorQuery(selector) {
  return inspectorContent.querySelector(selector) ?? sidecarContent.querySelector(selector);
}

function selectionSignature() {
  return selections.map((item) => item.selectionKey).join(",");
}

function closeSidecar() {
  activeSidecar = null;
  renderedSidecarKey = "";
  sidecar.hidden = true;
  sidecarContent.replaceChildren();
  inspectorContent.querySelectorAll(".active-part").forEach((part) => part.classList.remove("active-part"));
}

function openSidecar(kind, options = {}) {
  activeSidecar = { kind, ...options };
  renderSidecar();
}

function markSidecarAnchor() {
  inspectorContent.querySelectorAll(".active-part").forEach((part) => part.classList.remove("active-part"));
  if (!activeSidecar) return;
  const anchors = [...inspectorContent.querySelectorAll("[data-sidecar]")].filter((element) => {
    if (element.dataset.sidecar !== activeSidecar.kind) return false;
    if (activeSidecar.face && element.dataset.face !== activeSidecar.face) return false;
    if (activeSidecar.position && element.dataset.annotationPosition !== activeSidecar.position) return false;
    if (activeSidecar.edgeKey && element.dataset.flowEntry && element.dataset.flowEntry !== activeSidecar.edgeKey) return false;
    return true;
  });
  anchors[0]?.classList.add("active-part");
}

function positionSidecar() {
  if (sidecar.hidden) return;
  const panel = inspector.getBoundingClientRect();
  const shell = canvasShell.getBoundingClientRect();
  const width = sidecar.offsetWidth;
  const gap = 10;
  let side = "left";
  let left = panel.left - width - gap;
  if (left < Math.max(shell.left, 6)) { left = panel.right + gap; side = "right"; }
  left = Math.max(6, Math.min(left, window.innerWidth - width - 6));
  const anchor = inspectorContent.querySelector(".active-part");
  const anchorTop = anchor ? anchor.getBoundingClientRect().top - 10 : panel.top;
  const top = Math.max(Math.max(shell.top, 8), Math.min(anchorTop, window.innerHeight - sidecar.offsetHeight - 8));
  sidecar.style.left = `${left}px`;
  sidecar.style.top = `${top}px`;
  sidecar.dataset.side = side;
}

function renderSidecar() {
  if (!activeSidecar) { sidecar.hidden = true; return; }
  const markup = sidecarMarkup(activeSidecar);
  if (!markup) { closeSidecar(); return; }
  const renderKey = JSON.stringify(activeSidecar);
  const preserveState = renderedSidecarKey === renderKey && !sidecar.hidden;
  const openDetails = preserveState ? [...sidecarContent.querySelectorAll("details")].map((details) => details.open) : [];
  const scrollTop = preserveState ? sidecarContent.scrollTop : 0;
  sidecarTitle.textContent = activeSidecar.title ?? SIDECAR_TITLES[activeSidecar.kind] ?? "Settings";
  sidecarContent.innerHTML = markup;
  if (preserveState) {
    sidecarContent.querySelectorAll("details").forEach((details, index) => { details.open = openDetails[index] ?? details.open; });
    sidecarContent.scrollTop = scrollTop;
  }
  renderedSidecarKey = renderKey;
  sidecar.hidden = false;
  tidyInspectorSections(sidecarContent);
  markSidecarAnchor();
  requestAnimationFrame(positionSidecar);
}

function edgeKeyFor(edge) {
  return `${edge.from}|${edge.to}|${edge.lineNumber}`;
}

function edgeForKey(key) {
  const [from, to, lineNumber] = String(key ?? "").split("|");
  return (diagram?.layout?.edges ?? []).find((edge) => edge.from === from && edge.to === to && edge.lineNumber === Number(lineNumber));
}

function edgeSourceFace(edge) {
  return edge.sourceFace ?? FACE_FOR_SOURCE[edge.sourceDirection ?? edge.layoutDirection] ?? "right";
}

function edgeTargetFace(edge) {
  return edge.targetFace ?? FACE_FOR_TARGET[edge.targetLayoutDirection ?? edge.layoutDirection] ?? "left";
}

function nodeEdges(nodeId) {
  return (diagram?.layout?.edges ?? []).filter((edge) => edge.from === nodeId || edge.to === nodeId);
}

function edgeFaceForNode(edge, nodeId) {
  return edge.from === nodeId ? edgeSourceFace(edge) : edgeTargetFace(edge);
}

// --- Generic controls bound to an arbitrary declaration line ----------------

function structuralColorControl(label, field, value, lineNumber, key = `structural:${lineNumber}:${field}`) {
  const noColor = ["none", "transparent"].includes(String(value ?? "").toLowerCase());
  const swatch = !noColor && CSS.supports("color", String(value ?? "").trim()) ? String(value).trim() : "transparent";
  return `<label>${label}<span class="inspector-color"><button class="color-popup-trigger${noColor ? " none" : ""}" type="button" data-color-popup="${key}" style="--swatch:${escapeHtml(swatch)}" aria-label="Choose ${label.toLowerCase()}"></button><input data-structural-field="${field}" data-structural-line="${lineNumber}" data-color-text="${key}" value="${escapeHtml(value ?? "")}" placeholder="CSS color"></span></label>`;
}

function structuralSelect(label, field, values, current, lineNumber) {
  return `<label>${label}<select data-structural-field="${field}" data-structural-line="${lineNumber}">${values.map((value) => `<option value="${escapeHtml(value)}"${String(current) === value ? " selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label>`;
}

function structuralNumber(label, field, value, lineNumber, { min = 0, step = 1 } = {}) {
  return `<label>${label}<input type="number" min="${min}" step="${step}" data-structural-field="${field}" data-structural-line="${lineNumber}" value="${escapeHtml(value ?? "")}"></label>`;
}

/** Shadow editor shared by the node, flow, and graph sidecars. */
function shadowControls(scope, style = {}) {
  const enabled = Boolean(style.shadowColor);
  const field = (name) => `data-${scope}-field="${name}"`;
  const color = colorControl("Color", "shadow-color", style.shadowColor ?? "#000000", scope, `${scope}:shadow-color`);
  return `<details${enabled ? " open" : ""}><summary><label class="shadow-toggle"><input type="checkbox" data-shadow-toggle="${scope}"${enabled ? " checked" : ""}> Shadow</label></summary>${color}`
    + `<div class="inspector-grid"><label>X offset<input ${field("shadow-offset-x")} type="number" value="${style.shadowOffsetX ?? 4}"></label>`
    + `<label>Y offset<input ${field("shadow-offset-y")} type="number" value="${style.shadowOffsetY ?? 5}"></label>`
    + `<label>Blur<input ${field("shadow-blur")} type="number" min="0" value="${style.shadowBlur ?? 6}"></label>`
    + `<label>Opacity<input ${field("shadow-opacity")} type="number" min="0" max="1" step="0.05" value="${style.shadowOpacity ?? 0.3}"></label></div></details>`;
}

/** CSS shadow for previews; `drop-shadow` follows the drawn shape, `box-shadow` the frame. */
function previewShadowCss(style = {}, property = "filter") {
  if (!style.shadowColor) return "";
  const color = `color-mix(in srgb, ${style.shadowColor} ${Math.round(Math.min(1, Number(style.shadowOpacity ?? 0.3)) * 100)}%, transparent)`;
  const offsetX = Number(style.shadowOffsetX ?? 4);
  const offsetY = Number(style.shadowOffsetY ?? 5);
  const blur = Number(style.shadowBlur ?? 6);
  return property === "box-shadow"
    ? `box-shadow:${offsetX}px ${offsetY}px ${blur}px ${color}`
    : `filter:drop-shadow(${offsetX}px ${offsetY}px ${blur}px ${color})`;
}

// --- Preview building blocks -----------------------------------------------

function previewFontStyle(style = {}) {
  const textOutlineWidth = Math.max(Number(style.textOutlineWidth) || 0, 0);
  const textOutline = style.textOutline && style.textOutline !== "transparent" ? style.textOutline : "transparent";
  return escapeHtml([
    style.color ? `color:${style.color}` : "",
    style.fontFamily ? `font-family:${style.fontFamily}` : "",
    `font-size:${Math.max(Number(style.fontSize) || 12, 1)}px`,
    `font-weight:${style.fontWeight ?? "normal"}`,
    `font-style:${style.fontStyle ?? "normal"}`,
    `text-decoration:${style.textDecoration ?? "none"}`,
    textOutlineWidth ? `-webkit-text-stroke:${textOutlineWidth}px ${textOutline}` : "",
    textOutlineWidth ? "paint-order:stroke fill" : "",
  ].filter(Boolean).join(";"));
}

/** Draw the node's shape, honouring fill, outline colour, style, and width. */
function previewShapeMarkup(style, width, height) {
  const strokeWidth = Math.min(Number(style.outlineWidth ?? 1) || 0, 6);
  const inset = Math.max(strokeWidth / 2, 0.75);
  const w = width - inset * 2;
  const h = height - inset * 2;
  const dash = style.outlineStyle === "dashed" ? ' stroke-dasharray="8 6"' : style.outlineStyle === "dotted" ? ' stroke-dasharray="2 5"' : "";
  const stroke = style.outline ?? "currentColor";
  const common = `fill="${escapeHtml(style.fill ?? "transparent")}" stroke="${escapeHtml(stroke)}" stroke-width="${strokeWidth}"${dash}`;
  const shape = style.shape ?? "round";
  if (shape === "diamond") {
    return `<polygon ${common} points="${inset + w / 2},${inset} ${inset + w},${inset + h / 2} ${inset + w / 2},${inset + h} ${inset},${inset + h / 2}"/>`;
  }
  if (shape === "hexagon") {
    const cut = Math.min(22, w * 0.15);
    return `<polygon ${common} points="${inset + cut},${inset} ${inset + w - cut},${inset} ${inset + w},${inset + h / 2} ${inset + w - cut},${inset + h} ${inset + cut},${inset + h} ${inset},${inset + h / 2}"/>`;
  }
  if (shape === "cylinder") {
    const capRy = Math.min(h * 0.18, 12);
    const rx = w / 2;
    const cx = inset + rx;
    const body = `M ${inset},${inset + capRy} L ${inset},${inset + h - capRy} A ${rx},${capRy} 0 0 1 ${inset + w},${inset + h - capRy} L ${inset + w},${inset + capRy} A ${rx},${capRy} 0 0 0 ${inset},${inset + capRy} z`;
    return `<path d="${body}" fill="${escapeHtml(style.fill ?? "transparent")}" stroke="none"/><ellipse ${common} cx="${cx}" cy="${inset + h - capRy}" rx="${rx}" ry="${capRy}"/><ellipse ${common} cx="${cx}" cy="${inset + capRy}" rx="${rx}" ry="${capRy}"/><path d="${body}" fill="none" stroke="${escapeHtml(stroke)}" stroke-width="${strokeWidth}"${dash}/>`;
  }
  const radius = shape === "square" ? 0 : shape === "pill" ? h / 2 : shape === "rounded" ? 10 : 5;
  return `<rect ${common} x="${inset}" y="${inset}" width="${w}" height="${h}" rx="${radius}"/>`;
}

function annotationChip(kind, position, entries, label = position) {
  const count = entries.length;
  const style = entries[0] ? ` style="${previewFontStyle(entries[0])}"` : "";
  return `<button type="button" class="preview-part preview-annotation${count ? "" : " empty"}" data-sidecar="${kind}" data-annotation-position="${position}"${style} title="Edit ${label} annotations">${label}${count > 1 ? ` <span aria-label="${count} annotations">${count}</span>` : ""}</button>`;
}

function previewStageBackground(group, includeGraph = true) {
  const graphBackground = includeGraph ? group?.fill || "transparent" : "transparent";
  const canvasBackground = currentGraph.figure?.background || "#ffffff";
  return ` style="--preview-graph-background:${escapeHtml(graphBackground)};--preview-canvas-background:${escapeHtml(canvasBackground)}"`;
}

function nodePreviewMarkup(node) {
  const above = node.annotations.filter((annotation) => annotation.position !== "below");
  const below = node.annotations.filter((annotation) => annotation.position === "below");
  const width = 138;
  const height = 58;
  const faces = ["top", "right", "bottom", "left"];
  const horizontalAlign = node.style.align === "left" ? "flex-start" : node.style.align === "right" ? "flex-end" : "center";
  const verticalAlign = node.style.verticalAlign === "top" ? "flex-start" : node.style.verticalAlign === "bottom" ? "flex-end" : "center";
  const addButtons = faces.map((face) => `<button type="button" class="preview-face-add" data-face-add="${face}" title="Add a connected node on the ${face} face" aria-label="Add connected node on the ${face} face">+</button>`).join("");
  return `<div class="preview-stage node-preview-stage"${previewStageBackground(graphForNode(node.id))}>
    ${addButtons}
    ${annotationChip("node-annotations", "above", above)}
    <div class="node-preview">
      <div class="node-preview-box preview-part" data-sidecar="node-box" role="button" tabindex="0" title="Edit box appearance and face connections">
        <svg class="node-preview-shape" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="${escapeHtml(previewShadowCss(node.style))}" aria-hidden="true">${previewShapeMarkup(node.style, width, height)}</svg>
        <span class="node-preview-label preview-part" data-sidecar="node-label" role="button" tabindex="0" style="${previewFontStyle(node.style)};justify-content:${horizontalAlign};align-items:${verticalAlign}" title="Edit label text, alignment, and typography">label</span>
      </div>
    </div>
    ${annotationChip("node-annotations", "below", below)}</div>`;
}

function imagePreviewMarkup(image) {
  const above = image.annotations.filter((annotation) => annotation.position !== "below");
  const below = image.annotations.filter((annotation) => annotation.position === "below");
  const faces = ["top", "right", "bottom", "left"];
  const addButtons = faces.map((face) => `<button type="button" class="preview-face-add" data-face-add="${face}" title="Add a connected node on the ${face} face" aria-label="Add connected node on the ${face} face">+</button>`).join("");
  return `<div class="preview-stage node-preview-stage"${previewStageBackground(graphForNode(image.id))}>
    ${addButtons}
    ${annotationChip("node-annotations", "above", above)}
    <div class="image-preview-box preview-part" data-sidecar="image-box" role="button" tabindex="0" title="Edit image source, size, fit, and frame">
      <img src="${escapeHtml(image.style.source)}" alt="" style="object-fit:${image.style.fit};opacity:${image.style.opacity};${escapeHtml(previewShadowCss(image.style))}">
      <svg viewBox="0 0 138 92" aria-hidden="true">${previewShapeMarkup(image.style, 138, 92)}</svg>
    </div>
    ${annotationChip("node-annotations", "below", below)}</div>`;
}

function previewArrowMarkup(x, sign, shape, color, outline, outlineWidth, size) {
  const stroke = outline && outline !== "transparent" ? outline : null;
  const paint = stroke ? ` stroke="${escapeHtml(stroke)}" stroke-width="${Math.max(outlineWidth, 1)}" paint-order="stroke" stroke-linejoin="round"` : "";
  const y = 23;
  if (shape === "open") {
    return `<path d="M ${x - sign * size * 1.5} ${y - size} L ${x} ${y} L ${x - sign * size * 1.5} ${y + size}" fill="none" stroke="${escapeHtml(color)}" stroke-width="${Math.max(size / 2.6, 1.2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (shape === "diamond") {
    return `<polygon points="${x},${y} ${x - sign * size},${y - size} ${x - sign * size * 2},${y} ${x - sign * size},${y + size}" fill="${escapeHtml(color)}"${paint}/>`;
  }
  if (shape === "circle") {
    return `<circle cx="${x - sign * size}" cy="${y}" r="${size}" fill="${escapeHtml(color)}"${paint}/>`;
  }
  return `<polygon points="${x},${y} ${x - sign * size * 1.7},${y - size} ${x - sign * size * 1.7},${y + size}" fill="${escapeHtml(color)}"${paint}/>`;
}

function previewChunkyArrowMarkup(start, end, direction, color, outline, outlineWidth, arrowHeight, arrowHeadWidth) {
  const y = 23;
  const shaftHalf = Math.max(0.5, arrowHeight / 2);
  const headHalf = shaftHalf * 1.8;
  const headLength = Math.min(Math.max(1, arrowHeadWidth), (end - start) * 0.4);
  const backward = ["backward", "both"].includes(direction);
  const forward = ["forward", "both"].includes(direction);
  const bodyStart = backward ? start + headLength : start;
  const bodyEnd = forward ? end - headLength : end;
  let path = `M ${bodyStart} ${y - shaftHalf} H ${bodyEnd}`;
  if (forward) path += ` V ${y - headHalf} L ${end} ${y} L ${bodyEnd} ${y + headHalf}`;
  path += ` V ${y + shaftHalf} H ${bodyStart}`;
  if (backward) path += ` V ${y + headHalf} L ${start} ${y} L ${bodyStart} ${y - headHalf}`;
  const border = outline ? ` stroke="${escapeHtml(outline)}" stroke-width="${outlineWidth * 2}" paint-order="stroke fill"` : "";
  return `<path d="${path} Z" fill="${escapeHtml(color)}"${border} stroke-linecap="round" stroke-linejoin="round"/>`;
}

function flowPreviewMarkup(edge) {
  const color = edge.color ?? "#64748b";
  const outline = edge.outline && edge.outline !== "transparent" ? edge.outline : null;
  const outlineWidth = Number(edge.outlineWidth) || 0;
  const width = Math.min(Math.max(Number(edge.width) || 2, 1), 9);
  const dash = edge.style === "dashed" ? ' stroke-dasharray="8 6"' : edge.style === "dotted" ? ' stroke-dasharray="2 5"' : "";
  const size = Math.min(4 + width * 0.9, 9);
  const direction = edge.direction ?? "forward";
  const shape = edge.arrowShape ?? "triangle";
  const start = 16;
  const end = 194;
  if (shape === "chunky") {
    const arrow = previewChunkyArrowMarkup(start, end, direction, color, outline, outlineWidth, edge.arrowHeight ?? 8, edge.arrowHeadWidth ?? 16);
    return `<div class="preview-part flow-preview-wrap" data-sidecar="flow-line" role="button" tabindex="0" title="Edit line colour, width, stroke, and arrows"><svg class="flow-preview" viewBox="0 0 210 46" style="${escapeHtml(previewShadowCss(edge))}" aria-hidden="true">${arrow}</svg></div>`;
  }
  const arrows = [
    ["forward", "both"].includes(direction) ? previewArrowMarkup(end, 1, shape, color, outline, outlineWidth, size) : "",
    ["backward", "both"].includes(direction) ? previewArrowMarkup(start, -1, shape, color, outline, outlineWidth, size) : "",
  ].join("");
  const line = `${outline ? `<path d="M ${start} 23 H ${end}" fill="none" stroke="${escapeHtml(outline)}" stroke-width="${width + Math.max(outlineWidth, 1) * 2}" stroke-linecap="round"${dash}/>` : ""}<path d="M ${start} 23 H ${end}" fill="none" stroke="${escapeHtml(color)}" stroke-width="${width}" stroke-linecap="round"${dash}/>`;
  return `<div class="preview-part flow-preview-wrap" data-sidecar="flow-line" role="button" tabindex="0" title="Edit line colour, width, stroke, and arrows"><svg class="flow-preview" viewBox="0 0 210 46" style="${escapeHtml(previewShadowCss(edge))}" aria-hidden="true">${line}${arrows}</svg></div>`;
}

function flowPreviewStage(edge) {
  const annotations = edge.annotations ?? [];
  const group = currentGraph.groups.find((candidate) => candidate.id === edge.graphId) ?? graphForNode(edge.from) ?? graphForNode(edge.to);
  return `<div class="preview-stage"${previewStageBackground(group)}>${annotationChip("flow-annotations", "above", annotations, "annotation")}
    ${flowPreviewMarkup(edge)}</div>`;
}

function graphPreviewMarkup(group) {
  const frameStyle = escapeHtml([
    `background:${group?.fill && group.fill !== "transparent" ? group.fill : "transparent"}`,
    `border:${Math.min(Number(group?.outlineWidth ?? 1.5) || 0, 6)}px ${group?.outlineStyle ?? "solid"} ${group?.outline && group.outline !== "transparent" ? group.outline : "var(--border-strong)"}`,
    `border-radius:6px`,
    `padding:${Math.min(Math.max(Number(group?.padding ?? 24) / 3, 10), 20)}px`,
    previewShadowCss(group ?? {}, "box-shadow"),
  ].filter(Boolean).join(";"));
  const titleStyle = previewFontStyle(group ?? {});
  const align = group?.align === "right" ? "right" : group?.align === "center" ? "center" : "left";
  const horizontalAlign = align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start";
  const verticalAlign = group?.verticalAlign === "bottom" ? "bottom" : group?.verticalAlign === "middle" ? "middle" : "top";
  const verticalPlacement = verticalAlign === "bottom" ? "flex-end" : verticalAlign === "middle" ? "center" : "flex-start";
  const title = `<button type="button" class="preview-part graph-preview-title" data-sidecar="graph-title" data-label-position="${group?.labelPosition ?? "inside"}" data-vertical-align="${verticalAlign}" style="${titleStyle};justify-content:${horizontalAlign};align-items:${verticalPlacement};text-align:${align};transform:translate(${(group?.labelOffsetX ?? 0) / 3}px, ${(group?.labelOffsetY ?? 0) / 3}px)" title="Edit graph label placement, offset, and typography">label</button>`;
  const frame = `<div class="graph-preview-frame preview-part" data-sidecar="graph-frame" role="button" tabindex="0" style="${frameStyle}" title="Edit graph appearance, layout, spacing, layer, and offset">${group?.labelPosition === "outside" ? "" : title}</div>`;
  const outsideBefore = group?.labelPosition === "outside" && verticalAlign !== "bottom" ? title : "";
  const outsideAfter = group?.labelPosition === "outside" && verticalAlign === "bottom" ? title : "";
  return `<div class="preview-stage graph-preview-stage"${previewStageBackground(group, false)}><div class="graph-preview">${outsideBefore}${frame}${outsideAfter}</div></div>`;
}

// --- Sidecar contents -------------------------------------------------------

function legacyFlowAnnotationEditor(edge, position) {
  const title = position === "below" ? "Below" : "Above";
  const text = position === "below" ? edge?.annotationBelow : edge?.annotationAbove;
  const hidden = position === "below" ? edge?.annotationBelowHidden : edge?.annotationAboveHidden;
  if (!text) return "";
  const style = position === "below" ? edge?.annotationBelowStyle : edge?.annotationAboveStyle;
  return `<details open class="annotation-editor"><summary><span>${title}</span><label class="inspector-switch inspector-switch-summary"><span>Hidden</span><input data-line-annotation-hidden="annotation-${position}-hidden" type="checkbox"${hidden ? " checked" : ""}></label></summary><label>Text<input data-line-field="annotation-${position}" value="${escapeHtml(text)}"></label>${fontOptions("line", style ?? {}, true, `annotation-${position}-`)}<button type="button" class="danger annotation-delete" data-delete-line-annotation="annotation-${position}">Delete annotation</button></details>`;
}

function flowAnnotationEditor(annotation, index) {
  const edge = selectedEdges()[0];
  if (annotation.legacy) return legacyFlowAnnotationEditor(edge, annotation.position);
  const target = `data-flow-annotation-line="${annotation.lineNumber}"`;
  return `<details open class="annotation-editor"><summary><span>Annotation ${index + 1}</span><label class="inspector-switch inspector-switch-summary"><span>Hidden</span><input data-flow-annotation-hidden ${target} type="checkbox"${annotation.hidden ? " checked" : ""}></label></summary><label>Text<textarea data-flow-annotation-text ${target} rows="2">${escapeHtml(annotation.text)}</textarea></label>${fontOptions("flow-annotation", annotation).replaceAll("data-flow-annotation-field", `${target} data-flow-annotation-field`)}<div class="inspector-inline-field"><label>Offset<input value="(${annotation.offsetX ?? 0}, ${annotation.offsetY ?? 0})" readonly></label><button type="button" data-remove-flow-annotation-offset="${annotation.lineNumber}"${annotation.offsetX || annotation.offsetY ? "" : " disabled"}>Remove</button></div><button type="button" class="danger annotation-delete" data-delete-flow-annotation="${annotation.lineNumber}">Delete annotation</button></details>`;
}

function nodeBoxSidecar(node) {
  const faceControls = ["top", "right", "bottom", "left"].map((face) => {
    const ports = node.style.ports[face];
    return `<label>${face[0].toUpperCase()}${face.slice(1)}<select data-node-field="${face}-ports">${["shared", "distributed"].map((value) => `<option${ports === value ? " selected" : ""}>${value}</option>`).join("")}</select></label>`;
  }).join("");
  return `<label>Shape<select data-node-field="shape">${["square", "rounded", "round", "pill", "diamond", "hexagon", "cylinder"].map((shape) => `<option${node.style.shape === shape ? " selected" : ""}>${shape}</option>`).join("")}</select></label>`
    + colorControl("Fill", "fill", node.style.fill)
    + colorControl("Border", "outline", node.style.outline)
    + `<div class="inspector-grid"><label>Border style<select data-node-field="outline-style">${["solid", "dashed", "dotted"].map((value) => `<option${node.style.outlineStyle === value ? " selected" : ""}>${value}</option>`).join("")}</select></label><label>Border width<input data-node-field="outline-width" type="number" min="0" value="${node.style.outlineWidth}"></label><label>Width<input data-node-field="width" value="${escapeHtml(String(node.style.width))}"></label><label>Height<input data-node-field="height" value="${escapeHtml(String(node.style.height))}"></label></div>`
    + `<details class="face-connections" open><summary>Face connections</summary><div class="inspector-grid">${faceControls}</div></details>`
    + shadowControls("node", node.style)
    + `<div class="inspector-inline-field"><label>Offset<input value="(${node.offsetX}, ${node.offsetY})" readonly></label><button type="button" data-arrange="remove-offsets">Remove</button></div>`;
}

function imageBoxSidecar(image) {
  const option = (value) => `<option${image.style.fit === value ? " selected" : ""}>${value}</option>`;
  const faceControls = ["top", "right", "bottom", "left"].map((face) => {
    const ports = image.style.ports[face];
    return `<label>${face[0].toUpperCase()}${face.slice(1)}<select data-node-field="${face}-ports">${["shared", "distributed"].map((value) => `<option${ports === value ? " selected" : ""}>${value}</option>`).join("")}</select></label>`;
  }).join("");
  return `<div class="inspector-file-row"><label>URL or file<input data-node-field="source" value="${escapeHtml(image.style.source)}" placeholder="image.png or https://…"></label><button type="button" data-choose-image>Browse…</button></div>`
    + `<div class="inspector-grid"><label>Width<input data-node-field="width" type="number" min="1" value="${image.style.width}"></label><label>Height<input data-node-field="height" type="number" min="1" value="${image.style.height}"></label><label>Fit<select data-node-field="fit">${["contain", "cover", "fill"].map(option).join("")}</select></label><label>Opacity<input data-node-field="opacity" type="number" min="0" max="1" step="0.05" value="${image.style.opacity}"></label><label>Border padding<input data-node-field="padding" type="number" min="0" value="${image.style.padding}"></label></div>`
    + `<details open><summary>Frame</summary><label>Shape<select data-node-field="shape">${["square","rounded","round","pill","diamond","hexagon"].map((shape) => `<option${image.style.shape === shape ? " selected" : ""}>${shape}</option>`).join("")}</select></label>${colorControl("Fill overlay", "fill", image.style.fill)}${colorControl("Border", "outline", image.style.outline)}<div class="inspector-grid"><label>Border style<select data-node-field="outline-style">${["solid","dashed","dotted"].map((value) => `<option${image.style.outlineStyle === value ? " selected" : ""}>${value}</option>`).join("")}</select></label><label>Border width<input data-node-field="outline-width" type="number" min="0" value="${image.style.outlineWidth}"></label></div>${shadowControls("node", image.style)}</details>`
    + `<details class="face-connections"><summary>Face connections</summary><div class="inspector-grid">${faceControls}</div></details>`
    + `<div class="inspector-inline-field"><label>Offset<input value="(${image.offsetX}, ${image.offsetY})" readonly></label><button type="button" data-arrange="remove-offsets">Remove</button></div>`;
}

function nodeLabelSidecar(node) {
  return `<label>Label<input data-node-field="label" value="${escapeHtml(node.label.replace(/\n/g, " "))}"></label>`
    + `<div class="inspector-grid"><label>Horizontal alignment<select data-node-field="align">${["left", "center", "right"].map((value) => `<option${node.style.align === value ? " selected" : ""}>${value}</option>`).join("")}</select></label><label>Vertical alignment<select data-node-field="vertical-align">${["top", "middle", "bottom"].map((value) => `<option${node.style.verticalAlign === value ? " selected" : ""}>${value}</option>`).join("")}</select></label></div>`
    + fontOptions("node", node.style);
}

function faceOptionMarkup(current) {
  return ["top", "right", "bottom", "left"].map((face) => `<option value="${face}"${face === current ? " selected" : ""}>${face}</option>`).join("");
}

function flowStructuralSidecar(edge) {
  const line = edge.lineNumber;
  return `<p class="sidecar-help">${escapeHtml(edge.from)} → ${escapeHtml(edge.to)}</p>`
    + `<label>Label<input data-structural-field="label" data-structural-line="${line}" value="${escapeHtml(edge.label ?? "")}"></label>`
    + structuralColorControl(edge.arrowShape === "chunky" ? "Fill" : "Colour", "color", edge.color, line)
    + structuralColorControl("Outline", "outline", edge.outline, line)
    + `<div class="inspector-grid">${structuralNumber("Width", "width", edge.width, line, { min: 0.5, step: 0.5 })}${structuralNumber("Outline width", "outline-width", edge.outlineWidth, line, { min: 0, step: 0.5 })}${structuralNumber("Roundness", "roundness", edge.roundness, line)}</div>`
    + structuralSelect("Stroke", "stroke-style", ["solid", "dashed", "dotted"], edge.style, line)
    + structuralSelect("Arrow direction", "arrow-style", ["forward", "backward", "both", "none"], edge.direction, line)
    + structuralSelect("Arrow shape", "arrow-shape", ["triangle", "open", "diamond", "circle", "chunky"], edge.arrowShape, line)
    + (edge.arrowShape === "chunky" ? `<div class="inspector-grid">${structuralNumber("Arrow height", "arrow-height", edge.arrowHeight, line, { min: 1, step: 1 })}${structuralNumber("Arrow head width", "arrow-head-width", edge.arrowHeadWidth, line, { min: 1, step: 1 })}</div>` : "")
    + `<div class="inspector-grid"><label>Leaves source<select data-connected-field="source-face" data-connected-edge="${escapeHtml(edgeKeyFor(edge))}">${faceOptionMarkup(edgeSourceFace(edge))}</select></label><label>Enters target<select data-connected-field="target-face" data-connected-edge="${escapeHtml(edgeKeyFor(edge))}">${faceOptionMarkup(edgeTargetFace(edge))}</select></label></div>`
    + `<button type="button" class="inspector-primary-action" data-select-flow="${escapeHtml(edgeKeyFor(edge))}">Open flow panel</button>`;
}

function flowLineSidecar(edge) {
  return colorControl(edge?.arrowShape === "chunky" ? "Fill" : "Colour", "color", edge?.color, "line")
    + colorControl("Outline", "outline", edge?.outline, "line")
    + `<div class="inspector-grid"><label>Width<input data-line-field="width" type="number" min="0.5" step="0.5" value="${edge?.width ?? 2}"></label><label>Outline width<input data-line-field="outline-width" type="number" min="0" step="0.5" value="${edge?.outlineWidth ?? 0}"></label><label>Roundness<input data-line-field="roundness" type="number" min="0" step="1" value="${edge?.roundness ?? 9}"></label></div>`
    + `<label>Stroke<select data-line-field="stroke-style">${["solid", "dashed", "dotted"].map((value) => `<option${edge?.style === value ? " selected" : ""}>${value}</option>`).join("")}</select></label>`
    + `<label>Arrow direction<select data-line-field="arrow-style">${["forward", "backward", "both", "none"].map((value) => `<option${edge?.direction === value ? " selected" : ""}>${value}</option>`).join("")}</select></label>`
    + `<label>Arrow shape<select data-line-field="arrow-shape">${["triangle", "open", "diamond", "circle", "chunky"].map((value) => `<option${edge?.arrowShape === value ? " selected" : ""}>${value}</option>`).join("")}</select></label>`
    + (edge?.arrowShape === "chunky" ? `<div class="inspector-grid"><label>Arrow height<input data-line-field="arrow-height" type="number" min="1" step="1" value="${edge.arrowHeight ?? 8}"></label><label>Arrow head width<input data-line-field="arrow-head-width" type="number" min="1" step="1" value="${edge.arrowHeadWidth ?? 16}"></label></div>` : "")
    + shadowControls("line", edge ?? {})
    + fontOptions("line", edge ?? {}, false);
}

function sidecarMarkup(state) {
  const node = selectedNodes().length === 1 ? currentGraph.nodes.find((candidate) => candidate.id === selectedNodes()[0].id) : null;
  const edges = selectedEdges();
  const edge = edges.length === 1 ? edges[0] : null;
  const group = selections.length === 1 && selections[0].kind === "graph"
    ? currentGraph.groups.find((candidate) => candidate.id === selections[0].id)
    : null;
  if (state.kind === "node-flow") {
    const target = edgeForKey(state.edgeKey);
    return target ? flowStructuralSidecar(target) : "";
  }
  if (node) {
    if (state.kind === "image-box" && node.kind === "image") return imageBoxSidecar(node);
    if (state.kind === "node-box") return nodeBoxSidecar(node);
    if (state.kind === "node-label") return nodeLabelSidecar(node);
    if (state.kind === "node-annotations") return nodeAnnotationControls(node);
  }
  if (edge) {
    if (state.kind === "flow-line") return flowLineSidecar(edge);
    if (state.kind === "flow-connection") return flowConnectionControls(edge);
    if (state.kind === "flow-annotations") {
      const annotations = edge.annotations ?? [];
      const editors = annotations.map(flowAnnotationEditor).join("");
      return `${editors || '<p class="inspector-empty">No annotations yet.</p>'}<button type="button" class="inspector-primary-action" data-add-line-annotation>+ Add Annotation</button>`;
    }
  }
  if (group) {
    if (state.kind === "graph-frame") {
      const relativeOptions = currentGraph.groups.filter((candidate) => candidate.id !== group.id)
        .map((candidate) => `<option value="${escapeHtml(candidate.id)}"${candidate.id === group.relativeTo ? " selected" : ""}>${escapeHtml(candidate.label || candidate.id)}</option>`).join("");
      return colorControl("Fill", "fill", group.fill, "graph")
        + colorControl("Outline", "outline", group.outline, "graph")
        + `<div class="inspector-grid"><label>Outline style<select data-graph-field="outline-style">${["solid", "dashed", "dotted"].map((value) => `<option${group.outlineStyle === value ? " selected" : ""}>${value}</option>`).join("")}</select></label><label>Outline width<input data-graph-field="outline-width" type="number" min="0" value="${group.outlineWidth ?? 1.5}"></label></div>`
        + `<label>Padding<input data-graph-field="padding" type="number" min="0" value="${group.padding ?? 24}"></label>`
        + shadowControls("graph", group)
        + `<details open><summary>Layout and spacing</summary><div class="inspector-grid"><label>X spacing<input data-graph-field="x-spacing" type="number" min="0" value="${group.xSpacing ?? 60}"></label><label>Y spacing<input data-graph-field="y-spacing" type="number" min="0" value="${group.ySpacing ?? 40}"></label><label>Placement<select data-graph-field="placement">${["below", "right", "left", "above"].map((value) => `<option${group.placement === value ? " selected" : ""}>${value}</option>`).join("")}</select></label><label>Relative to<select data-graph-field="relative-to"${relativeOptions ? "" : " disabled"}>${relativeOptions || '<option value="">First graph</option>'}</select></label></div><label>Layer (${group.layer ?? 0})<select data-graph-field="layer-order"><option value="">Choose…</option><option value="front">Send to front</option><option value="back">Send to back</option></select></label><div class="inspector-inline-field"><label>Offset<input value="(${group.offsetX ?? 0}, ${group.offsetY ?? 0})" readonly></label><button type="button" data-arrange="remove-offsets"${group.offsetX || group.offsetY ? "" : " disabled"}>Remove</button></div></details>`;
    }
    if (state.kind === "graph-title") {
      return `<label>Title<input data-graph-field="label" value="${escapeHtml(group.label ?? "")}"></label>`
        + `<div class="inspector-grid"><label>Position<select data-graph-field="label-position">${["inside", "outside"].map((value) => `<option${group.labelPosition === value ? " selected" : ""}>${value}</option>`).join("")}</select></label><label>Horizontal placement<select data-graph-field="align">${["left", "center", "right"].map((value) => `<option${group.align === value ? " selected" : ""}>${value}</option>`).join("")}</select></label><label>Vertical placement<select data-graph-field="vertical-align">${["top", "middle", "bottom"].map((value) => `<option${group.verticalAlign === value ? " selected" : ""}>${value}</option>`).join("")}</select></label></div>`
        + `<div class="inspector-inline-field"><label>Offset<input value="(${group.labelOffsetX ?? 0}, ${group.labelOffsetY ?? 0})" readonly></label><button type="button" data-remove-graph-label-offset>Remove</button></div>`
        + fontOptions("graph", group);
    }
  }
  return "";
}

// --- Panels -----------------------------------------------------------------

function presetSelect(kind, current, dataAttribute, emptyLabel, emptyValue = "") {
  const names = reusableNames(kind);
  const options = `<option value="${escapeHtml(emptyValue)}"${current ? "" : " selected"}>${escapeHtml(emptyLabel)}</option>${names.map((name) => `<option value="${escapeHtml(name)}"${name === current ? " selected" : ""}>${escapeHtml(name)}</option>`).join("")}`;
  return `<label class="preset-row">Preset<select ${dataAttribute}>${options}</select></label>`;
}

function nodeConnectionsSection(node) {
  const edges = nodeEdges(node.id);
  const entries = edges.map((edge) => {
    const outgoing = edge.from === node.id;
    const other = currentGraph.nodes.find((candidate) => candidate.id === (outgoing ? edge.to : edge.from));
    const otherLabel = other?.label?.replace(/\n/g, " ") || (outgoing ? edge.to : edge.from);
    const detail = `${outgoing ? `leaves ${edgeSourceFace(edge)}` : `enters ${edgeTargetFace(edge)}`} · ${edge.style ?? "solid"} · ${edge.lineType ? escapeHtml(edge.lineType) : "no preset"}`;
    return `<button type="button" class="preview-part connection-entry" data-sidecar="node-flow" data-flow-entry="${escapeHtml(edgeKeyFor(edge))}"><strong>${outgoing ? "To" : "From"} ${escapeHtml(otherLabel)}</strong><small>${detail}</small></button>`;
  }).join("");
  return `<details class="connections-editor"${edges.length ? " open" : ""}><summary>Connected flows <small>${edges.length}</small></summary>${entries || '<p class="inspector-empty">No connected flows.</p>'}</details>`;
}

function renderNodePanel(node) {
  const nodeGraph = graphForNode(node.id);
  const graphOptions = currentGraph.groups.map((group) => `<option value="${escapeHtml(group.id)}"${group.id === nodeGraph?.id ? " selected" : ""}>${escapeHtml(group.label || group.id)}</option>`).join("");
  inspectorContent.innerHTML = `<div class="inspector-heading"><div class="inspector-heading-text"><strong>Node</strong></div><label class="inspector-switch inspector-switch-heading"><span>Hidden</span><input data-node-hidden type="checkbox"${node.hidden ? " checked" : ""}></label></div>`
    + `<label class="inspector-id-field">ID (optional)<input data-node-field="id" value="${escapeHtml(node.explicitId)}" placeholder="${escapeHtml(node.id)}" pattern="[A-Za-z][A-Za-z0-9_-]*" title="Start with a letter; use letters, numbers, underscores, or hyphens."></label>`
    + presetSelect("node", node.nodeType ?? "", "data-node-type", "node (no preset)", "node")
    + nodePreviewMarkup(node)
    + `<div class="inspector-grid"><label>Graph<select data-node-graph>${graphOptions}</select></label><label>Layer (${node.layer ?? 0})<select data-node-layer-order><option value="">Choose…</option><option value="up">Move Up</option><option value="down">Move Down</option><option value="top">Send to Top</option><option value="bottom">Send to Bottom</option></select></label></div>`
    + nodeConnectionsSection(node);
  setReusableStyleAction("node");
}

function renderFlowPanel(edge) {
  inspectorContent.innerHTML = `<div class="inspector-heading"><div class="inspector-heading-text"><strong>Flow</strong></div><label class="inspector-switch inspector-switch-heading"><span>Hidden</span><input data-line-hidden type="checkbox"${edge.hidden ? " checked" : ""}></label></div>`
    + presetSelect("flow", edge.lineType ?? "", "data-line-type", "flow (no preset)")
    + flowPreviewStage(edge)
    + `<button type="button" class="preview-part connection-entry" data-sidecar="flow-connection"><strong>Connects ${escapeHtml(edge.from)} → ${escapeHtml(edge.to)}</strong><small>leaves ${edgeSourceFace(edge)} · enters ${edgeTargetFace(edge)}</small></button>`;
  setReusableStyleAction("flow");
}

function renderGraphPanel(group) {
  inspectorContent.innerHTML = `<div class="inspector-heading"><div class="inspector-heading-text"><strong>Graph</strong></div><label class="inspector-switch inspector-switch-heading"><span>Hidden</span><input data-graph-hidden type="checkbox"${group?.hidden ? " checked" : ""}></label></div>`
    + `<label class="inspector-id-field">ID<input data-graph-field="id" value="${escapeHtml(group?.id ?? "")}" required pattern="[A-Za-z][A-Za-z0-9_-]*" title="Start with a letter; use letters, numbers, underscores, or hyphens."></label>`
    + presetSelect("graph", group?.graphType ?? "", "data-graph-type", "graph (no preset)")
    + graphPreviewMarkup(group);
  setReusableStyleAction("graph");
}

function renderInspector() {
  const signature = selectionSignature();
  if (signature !== sidecarSelectionKey) { sidecarSelectionKey = signature; closeSidecar(); }
  const openSections = new Set([...inspectorContent.querySelectorAll("details[open] > summary")].map((summary) => summary.textContent.trim()));
  queueMicrotask(() => inspectorContent.querySelectorAll("details > summary").forEach((summary) => {
    if (openSections.has(summary.textContent.trim())) summary.parentElement.open = true;
  }));
  if (!selections.length) { inspector.hidden = true; setReusableStyleAction(); return; }
  inspector.hidden = false;
  requestAnimationFrame(constrainInspectorToCanvas);
  setReusableStyleAction();
  syncInspectorScrollbarWidth();
  const graphSelections = selections.filter((item) => item.kind === "graph");
  const selectionKinds = new Set(selections.map((item) => item.kind));
  if (selections.length > 1 && selectionKinds.size > 1) {
    inspectorContent.innerHTML = `<h3>${selections.length} items selected</h3><p class="inspector-empty">No shared properties.</p>`;
    return;
  }
  if (graphSelections.length === selections.length) {
    if (graphSelections.length > 1) {
      inspectorContent.innerHTML = `<h3>${graphSelections.length} graphs selected</h3><small class="inspector-help">Shift-click or Ctrl/Cmd-click graph boundaries to change the selection.</small><label>Align / distribute<select data-arrange-select><option value="">Choose…</option><option value="left">Align left</option><option value="center">Align center</option><option value="right">Align right</option><option value="top">Align top</option><option value="middle">Align middle</option><option value="bottom">Align bottom</option><option value="horizontal">Distribute horizontally</option><option value="vertical">Distribute vertically</option></select></label><button type="button" data-arrange="remove-offsets">Remove graph offsets</button>`;
      const groups = graphSelections.map((selection) => currentGraph.groups.find((group) => group.id === selection.id)).filter(Boolean);
      inspectorContent.querySelector("h3")?.insertAdjacentHTML("beforeend", `<label class="inspector-switch inspector-switch-heading"><span>Hidden</span><input data-graph-hidden type="checkbox"${groups.length && groups.every((group) => group.hidden) ? " checked" : ""}></label>`);
      return;
    }
    renderGraphPanel(currentGraph.groups.find((candidate) => candidate.id === graphSelections[0].id));
    renderSidecar();
    return;
  }
  const nodes = selectedNodes();
  if (nodes.length === selections.length) {
    const custom = [...`${pugSource}\n${cssSource}`.matchAll(/^@node\s+([\w-]+)/gm)].map((match) => match[1]);
    if (nodes.length > 1) {
      inspectorContent.innerHTML = `<h3>${nodes.length} nodes selected</h3><label>Node Layer<select data-node-layer-order><option value="">Choose…</option><option value="front">Send to front</option><option value="back">Send to back</option></select></label><label>Type<select data-node-type><option value="">Choose…</option><option value="node">node</option>${custom.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}</select></label><details><summary>Appearance</summary><label>Shape<select data-node-field="shape"><option value="">Choose…</option>${["square","rounded","round","pill","diamond","hexagon","cylinder"].map((shape) => `<option>${shape}</option>`).join("")}</select></label>${colorControl("Fill", "fill", "")}${colorControl("Text", "color", "")}${colorControl("Border", "outline", "")}<label>Border style<select data-node-field="outline-style"><option value="">Choose…</option><option>solid</option><option>dashed</option><option>dotted</option></select></label><label>Border width<input data-node-field="outline-width" type="number" min="0"></label></details><details><summary><label class="shadow-toggle"><input type="checkbox" data-shadow-toggle> Shadow</label></summary>${colorControl("Color", "shadow-color", "#000000")}<label>X offset<input data-node-field="shadow-offset-x" type="number" value="4"></label><label>Y offset<input data-node-field="shadow-offset-y" type="number" value="5"></label><label>Blur<input data-node-field="shadow-blur" type="number" min="0" value="6"></label><label>Opacity<input data-node-field="shadow-opacity" type="number" min="0" max="1" step="0.05" value="0.3"></label></details><label>Align / distribute<select data-arrange-select><option value="">Choose…</option><option value="left">Align left</option><option value="center">Align center</option><option value="right">Align right</option><option value="top">Align top</option><option value="middle">Align middle</option><option value="bottom">Align bottom</option><option value="horizontal">Distribute horizontally</option><option value="vertical">Distribute vertically</option></select></label><button data-arrange="remove-offsets">Remove offsets</button>`;
      inspectorContent.querySelector("h3")?.insertAdjacentHTML("beforeend", `<label class="inspector-switch inspector-switch-heading"><span>Hidden</span><input data-node-hidden type="checkbox"${nodes.every((item) => item.hidden) ? " checked" : ""}></label>`);
      inspectorContent.querySelector("details")?.insertAdjacentHTML("afterend", fontOptions("node", { fontSize: 16 }));
      tidyInspectorSections();
      return;
    }
    const selected = currentGraph.nodes.find((candidate) => candidate.id === nodes[0].id);
    if (selected.kind === "image") renderImagePanel(selected);
    else renderNodePanel(selected);
    renderSidecar();
    return;
  }
  const annotationSelections = selections.filter((item) => item.kind === "annotation");
  if (annotationSelections.length === selections.length) {
    const annotations = annotationSelections.map((selection) => currentGraph.nodes.flatMap((node) => node.annotations).find((annotation) => annotation.lineNumber === selection.lineNumber)).filter(Boolean);
    const annotation = annotations[0] ?? {};
    inspectorContent.innerHTML = `<h3>${annotations.length} annotation${annotations.length === 1 ? "" : "s"}</h3><label>Text<textarea data-selected-annotation-text rows="2">${escapeHtml(annotation.text ?? "")}</textarea></label>${fontOptions("annotation", annotation)}<label>Offset<input value="(${annotation.offsetX ?? 0}, ${annotation.offsetY ?? 0})" readonly></label>`;
    if (annotations.length === 1) setReusableStyleAction("annotation");
    return;
  }
  const edges = selectedEdges();
  if (edges.length === 1 && edges[0]) {
    renderFlowPanel(edges[0]);
    renderSidecar();
    return;
  }
  const edge = edges[0];
  const lineTypes = [...`${pugSource}\n${cssSource}`.matchAll(/^@flow\s+([\w-]+)/gm)].map((match) => match[1]);
  const sharedType = edges.every((candidate) => candidate?.lineType === edge?.lineType) ? edge?.lineType ?? "" : "";
  inspectorContent.innerHTML = `<h3>${edges.length} flow${edges.length === 1 ? "" : "s"}</h3>${edges.length === 1 ? flowConnectionControls(edge) : ""}<label>Flow type<select data-line-type><option value="">Choose…</option>${lineTypes.map((name) => `<option value="${escapeHtml(name)}"${sharedType === name ? " selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select></label><details open><summary>Flow appearance <small>local overrides</small></summary>${colorControl("Color", "color", edge?.color, "line")}${colorControl("Outline", "outline", edge?.outline, "line")}<div class="inspector-grid"><label>Width<input data-line-field="width" type="number" min="0.5" step="0.5" value="${edge?.width ?? 2}"></label><label>Outline width<input data-line-field="outline-width" type="number" min="0" step="0.5" value="${edge?.outlineWidth ?? 0}"></label><label>Roundness<input data-line-field="roundness" type="number" min="0" step="1" value="${edge?.roundness ?? 9}"></label></div><label>Stroke<select data-line-field="stroke-style">${["solid","dashed","dotted"].map((value) => `<option${edge?.style === value ? " selected" : ""}>${value}</option>`).join("")}</select></label><label>Arrow direction<select data-line-field="arrow-style">${["forward","backward","both","none"].map((value) => `<option${edge?.direction === value ? " selected" : ""}>${value}</option>`).join("")}</select></label><label>Arrow shape<select data-line-field="arrow-shape">${["triangle","open","diamond","circle","chunky"].map((value) => `<option${edge?.arrowShape === value ? " selected" : ""}>${value}</option>`).join("")}</select></label></details>`;
  inspectorContent.querySelector("h3")?.insertAdjacentHTML("beforeend", `<label class="inspector-switch inspector-switch-heading"><span>Hidden</span><input data-line-hidden type="checkbox"${edges.length && edges.every((item) => item?.hidden) ? " checked" : ""}></label>`);
  const annotationCount = edges.reduce((count, item) => count + (item.annotations?.length ?? 0), 0);
  inspectorContent.insertAdjacentHTML("beforeend", `<details class="annotations-editor"><summary><span>Annotations <small>${annotationCount}</small></span></summary><p class="inspector-empty">${annotationCount ? "Open one flow to edit its annotations." : "No annotations."}</p></details>`);
  if (edges.length === 1) setReusableStyleAction("flow");
}

function suggestedNodeId() {
  const used = new Set(currentGraph.nodes.map((node) => node.id));
  let number = currentGraph.nodes.length + 1;
  while (used.has(`node-${number}`)) number += 1;
  return `node-${number}`;
}

function graphForNode(id) {
  return currentGraph.groups.find((group) => group.nodeIds.includes(id));
}

function reconcileFlowScopes(value) {
  for (let attempt = 0; attempt <= currentGraph.edges.length; attempt += 1) {
    const parsed = parseDiagram(value, cssSource);
    const ownership = new Map(parsed.groups.flatMap((group) => group.nodeIds.map((id) => [id, group.id])));
    const edge = parsed.edges.find((candidate) => {
      const fromGraph = ownership.get(candidate.from);
      const toGraph = ownership.get(candidate.to);
      const expectedGraph = fromGraph && fromGraph === toGraph ? fromGraph : null;
      return candidate.graphId !== expectedGraph;
    });
    if (!edge) return value;
    const expectedGraph = ownership.get(edge.from) === ownership.get(edge.to) ? ownership.get(edge.from) : null;
    const explicitCanvasLine = value.split("\n").findIndex((line) => /^#(?:canvas|diagram)(?:\(|$)/.test(line.trim())) + 1;
    const containerLine = expectedGraph
      ? parsed.groups.find((group) => group.id === expectedGraph)?.lineNumber
      : explicitCanvasLine || 0;
    if (containerLine === undefined) return value;
    value = moveDeclarationToContainer(value, edge.lineNumber, containerLine);
  }
  return value;
}

function renderBuilderGraphOptions(select, selectedGraphId) {
  select.innerHTML = currentGraph.groups.map((group) => `<option value="${escapeHtml(group.id)}"${group.id === selectedGraphId ? " selected" : ""}>${escapeHtml(group.label || group.id)}</option>`).join("");
}

function renderBuilderNodeChoices(container, graphId, selectedId) {
  const group = currentGraph.groups.find((candidate) => candidate.id === graphId);
  const nodes = (group?.nodeIds ?? []).map((id) => currentGraph.nodes.find((node) => node.id === id)).filter(Boolean)
    .sort((a, b) => (b.layer ?? 0) - (a.layer ?? 0) || (b.sourceIndex ?? 0) - (a.sourceIndex ?? 0));
  if (!nodes.length) {
    container.innerHTML = '<span class="node-choice-empty">No nodes in this graph</span>';
    return;
  }
  const activeId = nodes.some((node) => node.id === selectedId) ? selectedId : nodes[0].id;
  container.innerHTML = nodes.map((node) => `<button class="node-choice" type="button" role="option" data-node-choice="${escapeHtml(node.id)}" aria-selected="${node.id === activeId}">${escapeHtml(node.label || node.id)}</button>`).join("");
}

function selectedBuilderNode(container) {
  return container.querySelector('[data-node-choice][aria-selected="true"]')?.dataset.nodeChoice ?? "";
}

function chooseBuilderNode(container, id) {
  container.querySelectorAll("[data-node-choice]").forEach((item) => item.setAttribute("aria-selected", String(item.dataset.nodeChoice === id)));
}

function openGraphBuilder(mode = "flow", preferredIds = null, { face = "" } = {}) {
  if (activeDocument !== "pug") activateDocument("pug");
  const selectedIds = preferredIds ?? selectedNodes().map((node) => node.id);
  const preferredSource = selectedIds[0] ?? currentGraph.nodes[0]?.id;
  const sourceGraph = graphForNode(preferredSource) ?? currentGraph.groups[0];
  const targetGraph = sourceGraph;
  graphBuilder.dataset.mode = mode;
  document.querySelector("#graph-builder-title").textContent = mode === "diagram" ? "Create graph" : mode === "node" ? "Add node" : mode === "connected-node" ? "Add connected node" : "Add flow";
  document.querySelector("#graph-builder-help").textContent = mode === "diagram" ? "Create a graph with its first independent node." : mode === "node" ? "Add an independent node to a graph. Add flows separately when needed." : mode === "connected-node" ? "Create a node and connect it to the selected node in any direction." : "Connect two existing nodes. Cross-graph flows are stored at canvas level.";
  document.querySelector("#builder-from-graph-label").textContent = mode === "node" ? "Graph" : "From graph";
  renderBuilderGraphOptions(builderFromGraph, sourceGraph?.id);
  renderBuilderNodeChoices(builderSources, builderFromGraph.value, preferredSource);
  renderBuilderGraphOptions(builderToGraph, targetGraph?.id);
  renderBuilderNodeChoices(builderTargets, builderToGraph.value, "");
  renderBuilderGraphOptions(builderNewNodeGraph, sourceGraph?.id);
  graphBuilder.dataset.connectedNode = mode === "connected-node" ? preferredSource : "";
  const connectedNode = currentGraph.nodes.find((node) => node.id === preferredSource);
  builderConnectedNode.value = connectedNode ? `${connectedNode.label || connectedNode.id} (${connectedNode.id})` : "";
  builderFlowDirection.value = "to";
  builderConnectedFace.value = face || "right";
  graphBuilder.querySelectorAll(".new-target-only").forEach((element) => { element.hidden = mode === "flow"; });
  builderId.required = mode !== "flow";
  const nodeTypeOptions = `<option value="node">node</option>${reusableNames("node").map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;
  builderNodeType.innerHTML = nodeTypeOptions;
  builderLineType.innerHTML = `<option value="">Default flow</option>${reusableNames("flow").map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;
  builderId.value = suggestedNodeId();
  builderLabel.value = "New node";
  builderDiagramId.value = `diagram-${currentGraph.groups.length + 1}`;
  builderDiagramLabel.value = "";
  builderDiagramPlacement.value = "below";
  builderDiagramRelativeTo.innerHTML = currentGraph.groups.length
    ? currentGraph.groups.map((group, index) => `<option value="${escapeHtml(group.id)}"${index === currentGraph.groups.length - 1 ? " selected" : ""}>${escapeHtml(group.label || group.id)}</option>`).join("")
    : '<option value="">First graph</option>';
  builderDiagramPlacement.disabled = !currentGraph.groups.length;
  builderDiagramRelativeTo.disabled = !currentGraph.groups.length;
  document.querySelector("#builder-submit").textContent = mode === "diagram" ? "Create graph" : mode === "node" ? "Create node" : mode === "connected-node" ? "Create connected node" : "Create flow";
  builderError.textContent = "";
  graphBuilder.showModal();
  if (mode !== "flow") builderLabel.select();
}

function selectCreatedNode(id) {
  const node = currentGraph.nodes.find((candidate) => candidate.id === id);
  if (!node) return;
  selections = [{ kind: "node", id, lineNumber: node.lineNumber, selectionKey: `node:${id}`, additive: false }];
  paintSelections();
  renderInspector();
}

function selectCanvasElement(item) {
  if (activeDocument !== "pug") activateDocument("pug");
  if (item.additive) {
    const index = selections.findIndex((selection) => selection.selectionKey === item.selectionKey);
    if (index >= 0) selections.splice(index, 1); else selections.push(item);
  } else selections = [item];
  paintSelections();
  renderInspector();
}

function renderLayersPanel() {
  const groups = [...(currentGraph?.groups ?? [])]
    .sort((a, b) => (b.layer ?? 0) - (a.layer ?? 0) || b.sourceIndex - a.sourceIndex);
  graphCount.textContent = String(groups.length);
  if (!groups.length) {
    layersList.innerHTML = '<p class="layers-empty">Create a graph to add a layer.</p>';
    graphBrowserSelect.innerHTML = "";
    graphBrowserSelect.disabled = true;
    graphNodesList.innerHTML = '<p class="layers-empty">No nodes.</p>';
    graphFlowsList.innerHTML = '<p class="layers-empty">No flows.</p>';
    graphNodeCount.textContent = "0";
    graphFlowCount.textContent = "0";
    return;
  }
  layersList.innerHTML = groups.map((group) => `<button class="layer-item${group.hidden ? " object-hidden" : ""}" type="button" role="listitem" draggable="true" data-layer-graph="${escapeHtml(group.id)}" title="Drag to change stacking order"><span class="layer-grip" aria-hidden="true">⠿</span><span class="layer-name">${escapeHtml(group.label || group.id)}</span><span class="layer-number">${group.layer ?? 0}</span></button>`).join("");
  if (!groups.some((group) => group.id === browsedGraphId)) browsedGraphId = groups[0].id;
  graphBrowserSelect.disabled = false;
  graphBrowserSelect.innerHTML = groups.map((group) => `<option value="${escapeHtml(group.id)}"${group.id === browsedGraphId ? " selected" : ""}>${escapeHtml(group.label || group.id)}</option>`).join("");
  const group = groups.find((candidate) => candidate.id === browsedGraphId);
  const nodeIds = new Set(group?.nodeIds ?? []);
  const nodes = (group?.nodeIds ?? []).map((id) => currentGraph.nodes.find((node) => node.id === id)).filter(Boolean)
    .sort((a, b) => (b.layer ?? 0) - (a.layer ?? 0) || (b.sourceIndex ?? 0) - (a.sourceIndex ?? 0));
  const flows = (currentGraph?.edges ?? []).filter((edge) => nodeIds.has(edge.from) || nodeIds.has(edge.to));
  graphNodeCount.textContent = String(nodes.length);
  graphFlowCount.textContent = String(flows.length);
  graphNodesList.innerHTML = nodes.length
    ? nodes.map((node) => `<button class="graph-item node-layer-item${node.hidden ? " object-hidden" : ""}" type="button" role="listitem" draggable="true" data-browser-node="${escapeHtml(node.id)}" title="Drag to change node stacking order"><span class="layer-grip" aria-hidden="true">⠿</span><span class="node-layer-copy"><strong>${escapeHtml(node.label || node.id)}</strong><small>${escapeHtml(node.id)}</small></span><span class="layer-number">${node.layer ?? 0}</span></button>`).join("")
    : '<p class="layers-empty">No nodes.</p>';
  graphFlowsList.innerHTML = flows.length
    ? flows.map((edge) => `<button class="graph-item${edge.hidden ? " object-hidden" : ""}" type="button" role="listitem" data-browser-flow="${edge.lineNumber}" data-browser-from="${escapeHtml(edge.from)}" data-browser-to="${escapeHtml(edge.to)}"><strong>${escapeHtml(edge.from)} → ${escapeHtml(edge.to)}</strong><small>${edge.graphId ? "Graph flow" : "Canvas flow"}</small></button>`).join("")
    : '<p class="layers-empty">No flows.</p>';
}

graphBrowserSelect.addEventListener("change", () => {
  browsedGraphId = graphBrowserSelect.value;
  renderLayersPanel();
});

layersList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-layer-graph]");
  const group = currentGraph?.groups.find((candidate) => candidate.id === item?.dataset.layerGraph);
  if (!group) return;
  browsedGraphId = group.id;
  renderLayersPanel();
  selectCanvasElement({ kind: "graph", id: group.id, lineNumber: group.lineNumber, selectionKey: `graph:${group.id}`, additive: false });
});

graphNodesList.addEventListener("click", (event) => {
  const id = event.target.closest("[data-browser-node]")?.dataset.browserNode;
  const node = currentGraph?.nodes.find((candidate) => candidate.id === id);
  if (node) selectCanvasElement({ kind: "node", id, lineNumber: node.lineNumber, selectionKey: `node:${id}`, additive: false });
});

graphFlowsList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-browser-flow]");
  if (!item) return;
  const lineNumber = Number(item.dataset.browserFlow);
  selectCanvasElement({ kind: "line", from: item.dataset.browserFrom, to: item.dataset.browserTo, lineNumber, selectionKey: `line:${item.dataset.browserFrom}:${item.dataset.browserTo}:${lineNumber}`, additive: false });
});

function applyGraphLayerOrder(orderedIds) {
  const layers = new Map(orderedIds.map((id, index) => [id, orderedIds.length - index - 1]));
  let nextSource = source.value;
  [...currentGraph.groups].sort((a, b) => b.lineNumber - a.lineNumber).forEach((group) => {
    if (layers.has(group.id)) nextSource = setStructuralField(nextSource, group.lineNumber, "layer", String(layers.get(group.id)));
  });
  setSource(nextSource);
  showCanvasToast("Updated graph stacking order");
}

function applyNodeLayerOrders(orders) {
  const layers = new Map();
  orders.forEach((orderedIds) => orderedIds.forEach((id, index) => layers.set(id, orderedIds.length - index - 1)));
  let nextSource = source.value;
  [...currentGraph.nodes].filter((node) => layers.has(node.id)).sort((a, b) => b.lineNumber - a.lineNumber).forEach((node) => {
    nextSource = setNodeField(nextSource, node.lineNumber, "layer", String(layers.get(node.id)));
  });
  setSource(nextSource);
  showCanvasToast("Updated node stacking order");
}

function applyNodeLayerOrder(orderedIds) {
  applyNodeLayerOrders([orderedIds]);
}

function moveSelectedLayers(orderedIds, selectedIds, action) {
  const selected = new Set(selectedIds);
  if (["top", "front"].includes(action)) return [...orderedIds.filter((id) => selected.has(id)), ...orderedIds.filter((id) => !selected.has(id))];
  if (["bottom", "back"].includes(action)) return [...orderedIds.filter((id) => !selected.has(id)), ...orderedIds.filter((id) => selected.has(id))];
  const result = [...orderedIds];
  if (action === "up") {
    for (let index = 1; index < result.length; index += 1) {
      if (selected.has(result[index]) && !selected.has(result[index - 1])) [result[index - 1], result[index]] = [result[index], result[index - 1]];
    }
  } else if (action === "down") {
    for (let index = result.length - 2; index >= 0; index -= 1) {
      if (selected.has(result[index]) && !selected.has(result[index + 1])) [result[index], result[index + 1]] = [result[index + 1], result[index]];
    }
  }
  return result;
}

let draggedLayerId = null;
layersList.addEventListener("dragstart", (event) => {
  const item = event.target.closest("[data-layer-graph]");
  if (!item) return;
  draggedLayerId = item.dataset.layerGraph;
  item.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedLayerId);
});
layersList.addEventListener("dragover", (event) => {
  const item = event.target.closest("[data-layer-graph]");
  if (!item || item.dataset.layerGraph === draggedLayerId) return;
  event.preventDefault();
  layersList.querySelectorAll(".drag-over").forEach((candidate) => candidate.classList.remove("drag-over"));
  item.classList.add("drag-over");
});
layersList.addEventListener("drop", (event) => {
  const target = event.target.closest("[data-layer-graph]");
  if (!target || !draggedLayerId || target.dataset.layerGraph === draggedLayerId) return;
  event.preventDefault();
  const ids = [...layersList.querySelectorAll("[data-layer-graph]")].map((item) => item.dataset.layerGraph);
  const from = ids.indexOf(draggedLayerId);
  const to = ids.indexOf(target.dataset.layerGraph);
  ids.splice(to, 0, ids.splice(from, 1)[0]);
  applyGraphLayerOrder(ids);
});
layersList.addEventListener("dragend", () => {
  draggedLayerId = null;
  layersList.querySelectorAll(".dragging, .drag-over").forEach((item) => item.classList.remove("dragging", "drag-over"));
});

let draggedNodeId = null;
graphNodesList.addEventListener("dragstart", (event) => {
  const item = event.target.closest("[data-browser-node]");
  if (!item) return;
  draggedNodeId = item.dataset.browserNode;
  item.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedNodeId);
});
graphNodesList.addEventListener("dragover", (event) => {
  const item = event.target.closest("[data-browser-node]");
  if (!item || item.dataset.browserNode === draggedNodeId) return;
  event.preventDefault();
  graphNodesList.querySelectorAll(".drag-over").forEach((candidate) => candidate.classList.remove("drag-over"));
  item.classList.add("drag-over");
});
graphNodesList.addEventListener("drop", (event) => {
  const target = event.target.closest("[data-browser-node]");
  if (!target || !draggedNodeId || target.dataset.browserNode === draggedNodeId) return;
  event.preventDefault();
  const ids = [...graphNodesList.querySelectorAll("[data-browser-node]")].map((item) => item.dataset.browserNode);
  const from = ids.indexOf(draggedNodeId);
  const to = ids.indexOf(target.dataset.browserNode);
  ids.splice(to, 0, ids.splice(from, 1)[0]);
  applyNodeLayerOrder(ids);
});
graphNodesList.addEventListener("dragend", () => {
  draggedNodeId = null;
  graphNodesList.querySelectorAll(".dragging, .drag-over").forEach((item) => item.classList.remove("dragging", "drag-over"));
});

function deleteCanvasSelection() {
  closeSidecar();
  const operations = selections.map((selection) => {
    if (selection.kind === "graph") {
      const group = currentGraph.groups.find((candidate) => candidate.id === selection.id);
      return { line: selection.lineNumber, apply: (value) => (group?.nodeIds ?? []).reduce((next, id) => removeNodeReferences(next, id), removeDeclaration(value, selection.lineNumber)) };
    }
    if (selection.kind === "node") {
      const node = currentGraph.nodes.find((candidate) => candidate.id === selection.id);
      return node ? { line: node.lineNumber, apply: (value) => removeNodeReferences(removeNodeDeclaration(value, node.lineNumber), node.id) } : null;
    }
    if (selection.kind === "node-label") {
      const node = currentGraph.nodes.find((candidate) => candidate.id === selection.id);
      return node ? { line: node.lineNumber, apply: (value) => setNodeField(value, node.lineNumber, "label", "") } : null;
    }
    if (selection.kind === "annotation") return { line: selection.lineNumber, apply: (value) => removeNodeAnnotation(value, selection.lineNumber) };
    const edge = currentGraph.edges.find((candidate) => candidate.from === selection.from && candidate.to === selection.to && (!selection.lineNumber || candidate.lineNumber === selection.lineNumber));
    if (!edge) return null;
    if (selection.kind === "connection-label") return { line: edge.lineNumber, apply: (value) => removeConnectionLabel(value, edge.lineNumber) };
    return { line: edge.lineNumber, apply: (value) => removeDeclaration(value, edge.lineNumber) };
  }).filter(Boolean).sort((a, b) => b.line - a.line);
  const unique = operations.filter((operation, index) => index === 0 || operation.line !== operations[index - 1].line);
  let nextSource = source.value;
  unique.forEach((operation) => { nextSource = operation.apply(nextSource); });
  selections = [];
  setSource(nextSource);
}

vimToggle.checked = new URLSearchParams(location.search).get("vim") === "1";
attachVimMode(source, vimToggle, vimStatus);

function panelLimits() {
  const mainWidth = main.getBoundingClientRect().width;
  return { minimum: 300, maximum: Math.max(300, Math.min(760, mainWidth - 360)) };
}

function setPanelWidth(width, persist = true) {
  const { minimum, maximum } = panelLimits();
  const nextWidth = Math.round(Math.min(maximum, Math.max(minimum, width)));
  main.style.setProperty("--panel-width", nextWidth + "px");
  panelResizer.setAttribute("aria-valuemin", String(minimum));
  panelResizer.setAttribute("aria-valuemax", String(maximum));
  panelResizer.setAttribute("aria-valuenow", String(nextWidth));
  if (persist) localStorage.setItem(PANEL_WIDTH_KEY, String(nextWidth));
}

function graphPanelLimits() {
  const mainWidth = main.getBoundingClientRect().width;
  const sourceWidth = main.classList.contains("source-collapsed") ? 0 : sourcePanel.getBoundingClientRect().width + 9;
  return { minimum: 180, maximum: Math.max(180, Math.min(520, mainWidth - sourceWidth - 320)) };
}

function setGraphPanelWidth(width, persist = true) {
  const { minimum, maximum } = graphPanelLimits();
  const nextWidth = Math.round(Math.min(maximum, Math.max(minimum, width)));
  main.style.setProperty("--layers-open-width", nextWidth + "px");
  graphPanelResizer.setAttribute("aria-valuemin", String(minimum));
  graphPanelResizer.setAttribute("aria-valuemax", String(maximum));
  graphPanelResizer.setAttribute("aria-valuenow", String(nextWidth));
  if (persist) localStorage.setItem(LAYERS_WIDTH_KEY, String(nextWidth));
}

const sourceToggle = document.querySelector("#toggle-source");
function setSourcePanelCollapsed(collapsed, persist = true) {
  main.classList.toggle("source-collapsed", collapsed);
  sourcePanel.setAttribute("aria-hidden", String(collapsed));
  sourcePanel.inert = collapsed;
  sourceToggle.setAttribute("aria-expanded", String(!collapsed));
  sourceToggle.querySelector(".toggle-arrow").textContent = collapsed ? "›" : "‹";
  sourceToggle.setAttribute("aria-label", collapsed ? "Show source panel" : "Hide source panel");
  sourceToggle.title = collapsed ? "Show source panel" : "Hide source panel";
  if (persist) localStorage.setItem(PANEL_COLLAPSED_KEY, String(collapsed));
}

function setLayersPanelCollapsed(collapsed, persist = true) {
  main.classList.toggle("layers-collapsed", collapsed);
  layersPanel.setAttribute("aria-hidden", String(collapsed));
  layersPanel.inert = collapsed;
  layersToggle.setAttribute("aria-expanded", String(!collapsed));
  layersToggle.querySelector(".toggle-arrow").textContent = collapsed ? "‹" : "›";
  layersToggle.setAttribute("aria-label", collapsed ? "Show objects panel" : "Hide objects panel");
  layersToggle.title = collapsed ? "Show objects panel" : "Hide objects panel";
  if (persist) localStorage.setItem(LAYERS_COLLAPSED_KEY, String(collapsed));
}

const savedPanelWidth = Number(localStorage.getItem(PANEL_WIDTH_KEY));
if (Number.isFinite(savedPanelWidth) && savedPanelWidth > 0) setPanelWidth(savedPanelWidth, false);
else setPanelWidth(430, false);
const savedGraphPanelWidth = Number(localStorage.getItem(LAYERS_WIDTH_KEY));
if (Number.isFinite(savedGraphPanelWidth) && savedGraphPanelWidth > 0) setGraphPanelWidth(savedGraphPanelWidth, false);
else setGraphPanelWidth(230, false);
setSourcePanelCollapsed(localStorage.getItem(PANEL_COLLAPSED_KEY) === "true", false);
sourceToggle.addEventListener("click", () => setSourcePanelCollapsed(!main.classList.contains("source-collapsed")));
setLayersPanelCollapsed(localStorage.getItem(LAYERS_COLLAPSED_KEY) !== "false", false);
layersToggle.addEventListener("click", () => setLayersPanelCollapsed(!main.classList.contains("layers-collapsed")));

let panelDrag = null;
panelResizer.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || main.classList.contains("source-collapsed")) return;
  event.preventDefault();
  panelDrag = { pointerId: event.pointerId, x: event.clientX, width: sourcePanel.getBoundingClientRect().width };
  document.body.classList.add("resizing-panel");
});
window.addEventListener("pointermove", (event) => {
  if (panelDrag?.pointerId === event.pointerId) setPanelWidth(panelDrag.width + event.clientX - panelDrag.x);
});
function finishPanelDrag(event) {
  if (!panelDrag || (event.pointerId !== undefined && panelDrag.pointerId !== event.pointerId)) return;
  panelDrag = null;
  document.body.classList.remove("resizing-panel");
}
window.addEventListener("pointerup", finishPanelDrag);
window.addEventListener("pointercancel", finishPanelDrag);
panelResizer.addEventListener("keydown", (event) => {
  const current = sourcePanel.getBoundingClientRect().width;
  const { minimum, maximum } = panelLimits();
  const amount = event.shiftKey ? 50 : 10;
  if (event.key === "ArrowLeft") setPanelWidth(current - amount);
  else if (event.key === "ArrowRight") setPanelWidth(current + amount);
  else if (event.key === "Home") setPanelWidth(minimum);
  else if (event.key === "End") setPanelWidth(maximum);
  else return;
  event.preventDefault();
});
panelResizer.addEventListener("dblclick", () => setPanelWidth(430));

let graphPanelDrag = null;
graphPanelResizer.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || main.classList.contains("layers-collapsed")) return;
  event.preventDefault();
  graphPanelDrag = { pointerId: event.pointerId, x: event.clientX, width: layersPanel.getBoundingClientRect().width };
  document.body.classList.add("resizing-graphs");
});
window.addEventListener("pointermove", (event) => {
  if (graphPanelDrag?.pointerId === event.pointerId) setGraphPanelWidth(graphPanelDrag.width + graphPanelDrag.x - event.clientX);
});
function finishGraphPanelDrag(event) {
  if (!graphPanelDrag || (event.pointerId !== undefined && graphPanelDrag.pointerId !== event.pointerId)) return;
  graphPanelDrag = null;
  document.body.classList.remove("resizing-graphs");
}
window.addEventListener("pointerup", finishGraphPanelDrag);
window.addEventListener("pointercancel", finishGraphPanelDrag);
graphPanelResizer.addEventListener("keydown", (event) => {
  const current = layersPanel.getBoundingClientRect().width;
  const { minimum, maximum } = graphPanelLimits();
  const amount = event.shiftKey ? 50 : 10;
  if (event.key === "ArrowLeft") setGraphPanelWidth(current + amount);
  else if (event.key === "ArrowRight") setGraphPanelWidth(current - amount);
  else if (event.key === "Home") setGraphPanelWidth(minimum);
  else if (event.key === "End") setGraphPanelWidth(maximum);
  else return;
  event.preventDefault();
});
graphPanelResizer.addEventListener("dblclick", () => setGraphPanelWidth(230));
window.addEventListener("resize", () => {
  setPanelWidth(sourcePanel.getBoundingClientRect().width, false);
  const currentGraphWidth = Number.parseFloat(getComputedStyle(main).getPropertyValue("--layers-open-width")) || 230;
  setGraphPanelWidth(currentGraphWidth, false);
});

function applyTheme(preference) {
  const selected = ["system", "light", "dark"].includes(preference) ? preference : "system";
  const resolved = selected === "system" ? (systemDark.matches ? "dark" : "light") : selected;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  themeToggle.dataset.preference = selected;
  themeToggle.setAttribute("aria-pressed", String(resolved === "dark"));
  themeToggle.setAttribute("aria-label", `Switch to ${resolved === "dark" ? "light" : "dark"} theme`);
  themeToggle.title = selected === "system" ? `Following system theme (${resolved}); click to switch` : `${resolved[0].toUpperCase() + resolved.slice(1)} theme; click to switch`;
  themeValue.textContent = selected === "system" ? `System (${resolved})` : selected;
  if (diagram) {
    diagram.render(pugSource, cssSource);
    applyCanvasZoom();
    paintSelections();
  }
}

applyTheme(localStorage.getItem(THEME_KEY) ?? "system");
themeToggle.addEventListener("click", () => {
  const preference = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, preference);
  applyTheme(preference);
});
const handleSystemThemeChange = () => {
  if (themeToggle.dataset.preference === "system") applyTheme("system");
};
if (systemDark.addEventListener) systemDark.addEventListener("change", handleSystemThemeChange);
else systemDark.addListener(handleSystemThemeChange);

let renderedLineCount = 0;
let lastEditorCaret = 0;

function updateEditorChrome() {
  const lineCount = source.value.split("\n").length;
  if (lineCount !== renderedLineCount) {
    renderedLineCount = lineCount;
    lineNumbers.replaceChildren(...Array.from({ length: lineCount }, (_item, index) => {
      const number = document.createElement("span");
      number.textContent = String(index + 1);
      return number;
    }));
  }
  const selection = window.getSelection();
  if (document.activeElement === source || source.contains(selection?.anchorNode)) {
    const visualMode = source.dataset.vimMode?.startsWith("visual");
    lastEditorCaret = source.selectionDirection === "backward"
      ? source.selectionStart
      : visualMode
        ? Math.max(source.selectionStart, source.selectionEnd - 1)
        : source.selectionEnd;
  }
  const line = source.value.slice(0, lastEditorCaret).split("\n").length - 1;
  lineNumbers.querySelector(".active")?.classList.remove("active");
  lineNumbers.children[line]?.classList.add("active");
  lineNumbers.style.transform = "translateY(" + -source.scrollTop + "px)";
  currentLine.style.transform = "translateY(" + (14 + line * 20 - source.scrollTop) + "px)";
  const showVimCursor = source.dataset.vimMode === "normal" && document.activeElement === source;
  vimBlockCursor.hidden = !showVimCursor;
  if (showVimCursor) {
    const selectionRange = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    selectionRange?.collapse(source.selectionDirection !== "backward");
    const caretRect = selectionRange?.getClientRects()[0];
    const shellRect = editorShell.getBoundingClientRect();
    let left = caretRect?.left ? caretRect.left - shellRect.left : 52;
    if (!caretRect?.left) {
      const currentLineText = source.value.slice(source.value.lastIndexOf("\n", lastEditorCaret - 1) + 1, lastEditorCaret);
      const columns = [...currentLineText].reduce((count, character) => character === "\t" ? count + (2 - count % 2) : count + 1, 0);
      left += columns * 7.23 - source.scrollLeft;
    }
    vimBlockCursor.style.transform = "translate(" + left + "px, " + (14 + line * 20 - source.scrollTop) + "px)";
  }
}

function highlightSource() {
  updateEditorChrome();
  if (!CSS.highlights || !window.Highlight) return;
  for (const name of ["sbd-comment", "sbd-string", "sbd-math", "sbd-structure", "sbd-attribute", "sbd-color", "sbd-number"]) {
    CSS.highlights.delete(name);
  }
  const pattern = /(\/\/.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\$[^$\n]*\$)|(@(?:node|flow|line|annotation)\b|#canvas|^\s*\||[a-zA-Z][\w-]*(?:\.[\w-]+)+|(?:\.[\w-]+)+|^\s*(?:node|flow|graph)\b)|([\w-]+)(?=\s*=)|(#[\da-fA-F]{8}\b|#[\da-fA-F]{6}\b|#[\da-fA-F]{3}\b)|(\b\d+(?:\.\d+)?\b)/gm;
  const start = source.selectionStart;
  const end = source.selectionEnd;
  if (source.childNodes.length !== 1 || source.firstChild?.nodeType !== Node.TEXT_NODE) {
    const value = source.value;
    const editing = sourceHasFocus();
    source.value = value;
    if (editing) source.setSelectionRange(start, end);
  }
  const textNode = source.firstChild;
  if (!textNode) return;
  const ranges = {
    "sbd-comment": [],
    "sbd-string": [],
    "sbd-math": [],
    "sbd-structure": [],
    "sbd-attribute": [],
    "sbd-color": [],
    "sbd-number": [],
  };
  for (const match of source.value.matchAll(pattern)) {
    const name = match[1] ? "sbd-comment"
      : match[2] ? "sbd-string"
        : match[3] ? "sbd-math"
          : match[4] ? "sbd-structure"
            : match[5] ? "sbd-attribute"
              : match[6] ? "sbd-color"
                : "sbd-number";
    const range = document.createRange();
    range.setStart(textNode, match.index);
    range.setEnd(textNode, match.index + match[0].length);
    ranges[name].push(range);
  }
  for (const [name, items] of Object.entries(ranges)) CSS.highlights.set(name, new Highlight(...items));
}

function syncHighlightScroll() {
  updateEditorChrome();
}

const structureCompletions = [
  { label: "@node", insert: "@node custom_node", detail: "Define a reusable node type" },
  { label: "@flow", insert: "@flow custom_flow", detail: "Define a reusable flow type" },
  { label: "@graph", insert: "@graph custom_graph", detail: "Define a reusable graph type" },
  { label: "@annotation", insert: "@annotation custom_note", detail: "Define a reusable annotation style" },
  { label: "graph", insert: "graph\n  .id graph-id", detail: "Start a canvas graph" },
  { label: ".defaults", insert: ".defaults", detail: "Group diagram-wide node, line, and annotation defaults" },
  { label: "flow", insert: "flow\n  .from source-id\n  .to target-id", detail: "Flow between nodes; branching and merging are inferred" },
  { label: ".from", insert: ".from ", detail: "Flow source node ID" },
  { label: ".to", insert: ".to ", detail: "Flow target node ID" },
  { label: ".from-direction", insert: ".from-direction right", detail: "Direction leaving a flow source" },
  { label: ".to-direction", insert: ".to-direction right", detail: "Direction entering a flow target" },
  { label: ".layer", insert: ".layer 0", detail: "Graph stacking layer; higher renders in front" },
  { label: ".placement", insert: ".placement below", detail: "Place a graph above, below, left, or right of another graph" },
  { label: ".relative-to", insert: ".relative-to graph-id", detail: "Graph ID used as the placement reference" },
  { label: ".x-spacing", insert: ".x-spacing 60", detail: "Horizontal spacing between graph nodes" },
  { label: ".y-spacing", insert: ".y-spacing 40", detail: "Vertical spacing between graph nodes" },
  { label: ".padding", insert: ".padding 24", detail: "Space inside a graph frame" },
  { label: ".direction", insert: ".direction right", detail: "Layout direction: right, left, up, or down" },
  ...["top", "right", "bottom", "left"].map((face) => ({ label: `.${face}-ports`, insert: `.${face}-ports distributed`, detail: `Use distributed or shared ports on the ${face} face` })),
  { label: ".background", insert: ".background #ffffff", detail: "Diagram background" },
  { label: ".font", insert: ".font Verdana, sans-serif", detail: "Diagram font" },
  { label: "node", insert: "node\n  .label ", detail: "Declare a node (nest a reusable @node class to style it) or group node defaults" },
  { label: "image", insert: "image\n  .id image-id\n  .source https://", detail: "Declare a standalone image that can participate in flows" },
  { label: ".color", insert: ".color #111111", detail: "Text, line, or annotation color" },
  { label: ".fill", insert: ".fill #ffffff", detail: "Node fill color" },
  { label: ".shape", insert: ".shape rounded", detail: "Node shape" },
  { label: ".shadow-color", insert: ".shadow-color #000000", detail: "Enable a node drop shadow" },
  { label: ".shadow-offset-x", insert: ".shadow-offset-x 4", detail: "Horizontal shadow offset" },
  { label: ".shadow-offset-y", insert: ".shadow-offset-y 5", detail: "Vertical shadow offset" },
  { label: ".shadow-blur", insert: ".shadow-blur 6", detail: "Shadow blur radius" },
  { label: ".shadow-opacity", insert: ".shadow-opacity 0.3", detail: "Shadow opacity from 0 to 1" },
  { label: ".source", insert: ".source https://", detail: "Image URL or file location" },
  { label: ".fit", insert: ".fit contain", detail: "Image fit: contain, cover, or fill" },
  { label: ".opacity", insert: ".opacity 1", detail: "Image opacity from 0 to 1" },
  { label: ".outline", insert: ".outline #111111", detail: "Node outline color" },
  { label: ".outline-style", insert: ".outline-style solid", detail: "solid, dashed, or dotted" },
  { label: ".outline-width", insert: ".outline-width 2", detail: "Node outline width" },
  { label: ".arrow-style", insert: ".arrow-style forward", detail: "forward, backward, both, or none" },
  { label: ".arrow-shape", insert: ".arrow-shape triangle", detail: "triangle, open, diamond, circle, or chunky" },
  { label: ".arrow-height", insert: ".arrow-height 8", detail: "Chunky arrow shaft height" },
  { label: ".arrow-head-width", insert: ".arrow-head-width 16", detail: "Chunky arrow head width" },
  { label: ".stroke-style", insert: ".stroke-style solid", detail: "solid, dashed, or dotted" },
  { label: ".roundness", insert: ".roundness 9", detail: "Connector corner radius; 0 makes sharp bends" },
  { label: ".source-face", insert: ".source-face right", detail: "Node face where the connector starts" },
  { label: ".target-face", insert: ".target-face left", detail: "Node face where the connector ends" },
  { label: ".label-position", insert: ".label-position above", detail: "Connection label side" },
  { label: ".label-offset", insert: ".label-offset (0, 0)", detail: "Manual label offset" },
  { label: ".label-hidden", insert: ".label-hidden", detail: "Hide the connection label" },
  { label: ".annotation-above", insert: ".annotation-above ", detail: "Connector annotation above the line" },
  { label: ".annotation-below", insert: ".annotation-below ", detail: "Connector annotation below the line" },
  { label: ".annotation-above-hidden", insert: ".annotation-above-hidden", detail: "Hide the upper connector annotation" },
  { label: ".annotation-below-hidden", insert: ".annotation-below-hidden", detail: "Hide the lower connector annotation" },
  { label: ".offset", insert: ".offset (0, 0)", detail: "Manual node or annotation offset" },
  { label: ".annotation", insert: ".annotation\n  .above ", detail: "Group annotations inside a node" },
  { label: ".above", insert: ".above ", detail: "Annotation above a node" },
  { label: ".below", insert: ".below ", detail: "Annotation below a node" },
  { label: ".label", insert: ".label ", detail: "Node or connection text" },
  { label: ".id", insert: ".id ", detail: "Stable node ID" },
  { label: ".width", insert: ".width 180", detail: "Node or line width" },
  { label: ".height", insert: ".height auto", detail: "Node height" },
  { label: ".align", insert: ".align center", detail: "Horizontal label alignment: left, center, or right" },
  { label: ".vertical-align", insert: ".vertical-align middle", detail: "Vertical label alignment: top, middle, or bottom" },
  { label: ".font-family", insert: ".font-family Inter, sans-serif", detail: "Font stack for node or annotation text" },
  { label: ".font-size", insert: ".font-size 16", detail: "Text size in pixels" },
  { label: ".font-weight", insert: ".font-weight bold", detail: "normal, numeric, or bold" },
  { label: ".font-style", insert: ".font-style italic", detail: "normal, italic, or oblique" },
  { label: ".text-decoration", insert: ".text-decoration underline", detail: "none, underline, overline, or line-through" },
  { label: ".text-outline", insert: ".text-outline transparent", detail: "Text outline color" },
  { label: ".text-outline-width", insert: ".text-outline-width 0", detail: "Text outline width" },
  { label: ".hidden", insert: ".hidden", detail: "Hide a node while preserving layout" },
];

function availableStructureCompletions() {
  const custom = [...`${pugSource}\n${cssSource}`.matchAll(/^@(node|flow|graph|annotation)\s+([a-zA-Z][\w-]*)/gm)].map((match) => ({
    label: `.${match[2]}`,
    insert: `.${match[2]}`,
    detail: `Apply reusable ${match[1]} class`,
    reusableKind: match[1],
  }));
  return [...structureCompletions, ...custom];
}

const completionLabels = {
  root: new Set(["@node", "@flow", "@graph", "@annotation", "graph", ".defaults", ".background", ".font", "flow"]),
  canvas: new Set(["graph", ".defaults", ".background", ".font", "flow"]),
  graph: new Set(["node", "image", "flow", ".id", ".label", ".layer", ".placement", ".relative-to", ".width", ".height", ".frame-offset", ".x-spacing", ".y-spacing", ".padding", ".fill", ".color", ".outline", ".outline-style", ".outline-width", ".offset", ".label-position", ".label-offset", ".align", ".vertical-align", ".font-family", ".font-size", ".font-weight", ".font-style", ".text-decoration", ".text-outline", ".text-outline-width", ".hidden"]),
  node: new Set([".id", ".label", ".layer", ".shape", ".fill", ".color", ".outline", ".outline-style", ".outline-width", ".width", ".height", ".align", ".vertical-align", ".offset", ".label-offset", ".annotation", ".top-ports", ".right-ports", ".bottom-ports", ".left-ports", ".shadow-color", ".shadow-offset-x", ".shadow-offset-y", ".shadow-blur", ".shadow-opacity", ".font-family", ".font-size", ".font-weight", ".font-style", ".text-decoration", ".text-outline", ".text-outline-width", ".hidden"]),
  image: new Set([".id", ".source", ".width", ".height", ".fit", ".opacity", ".padding", ".shape", ".fill", ".outline", ".outline-style", ".outline-width", ".offset", ".annotation", ".top-ports", ".right-ports", ".bottom-ports", ".left-ports", ".shadow-color", ".shadow-offset-x", ".shadow-offset-y", ".shadow-blur", ".shadow-opacity", ".hidden"]),
  nodeStyle: new Set([".shape", ".fill", ".color", ".outline", ".outline-style", ".outline-width", ".width", ".height", ".align", ".vertical-align", ".top-ports", ".right-ports", ".bottom-ports", ".left-ports", ".shadow-color", ".shadow-offset-x", ".shadow-offset-y", ".shadow-blur", ".shadow-opacity", ".font-family", ".font-size", ".font-weight", ".font-style", ".text-decoration", ".text-outline", ".text-outline-width"]),
  flow: new Set([".from", ".to", ".from-direction", ".to-direction", ".direction", ".color", ".outline", ".outline-width", ".width", ".arrow-style", ".arrow-shape", ".arrow-height", ".arrow-head-width", ".stroke-style", ".roundness", ".label", ".label-position", ".label-offset", ".label-hidden", ".annotation", ".source-face", ".target-face", ".font-family", ".font-size", ".font-weight", ".font-style", ".text-decoration", ".text-outline", ".text-outline-width", ".hidden"]),
  flowStyle: new Set([".color", ".outline", ".outline-width", ".width", ".arrow-style", ".arrow-shape", ".arrow-height", ".arrow-head-width", ".stroke-style", ".roundness", ".label", ".label-position", ".label-offset", ".label-hidden", ".annotation-above", ".annotation-below", ".annotation-above-hidden", ".annotation-below-hidden", ...["above", "below"].flatMap((position) => ["color", "font-family", "font-size", "font-weight", "font-style", "text-decoration", "text-outline", "text-outline-width"].map((property) => `.annotation-${position}-${property}`)), ".source-face", ".target-face", ".font-family", ".font-size", ".font-weight", ".font-style", ".text-decoration", ".text-outline", ".text-outline-width", ".hidden"]),
  graphStyle: new Set([".label-position", ".align", ".vertical-align", ".placement", ".fill", ".color", ".outline", ".outline-style", ".outline-width", ".width", ".height", ".padding", ".x-spacing", ".y-spacing", ".shadow-color", ".shadow-offset-x", ".shadow-offset-y", ".shadow-blur", ".shadow-opacity", ".font-family", ".font-size", ".font-weight", ".font-style", ".text-decoration", ".text-outline", ".text-outline-width"]),
  annotation: new Set([".above", ".below"]),
  annotationStyle: new Set([".color", ".font-family", ".font-size", ".font-weight", ".font-style", ".text-decoration", ".text-outline", ".text-outline-width"]),
  annotationEntry: new Set([".color", ".offset", ".font-family", ".font-size", ".font-weight", ".font-style", ".text-decoration", ".text-outline", ".text-outline-width", ".hidden"]),
  defaults: new Set(["node", "flow", ".annotation"]),
};

const cssRootCompletions = [
  { label: "@node", insert: "@node custom_node {\n  \n}", cursorBack: 2, detail: "Define a reusable node type" },
  { label: "@flow", insert: "@flow custom_flow {\n  \n}", cursorBack: 2, detail: "Define a reusable flow type" },
  { label: "@graph", insert: "@graph custom_graph {\n  \n}", cursorBack: 2, detail: "Define a reusable graph type" },
  { label: "@annotation", insert: "@annotation custom_note {\n  \n}", cursorBack: 2, detail: "Define a reusable annotation style" },
];
const cssPropertyLabels = {
  node: ["shape", "fill", "color", "outline", "outline-style", "outline-width", "width", "height", "align", "vertical-align", "shadow-color", "shadow-offset-x", "shadow-offset-y", "shadow-blur", "shadow-opacity", "font-family", "font-size", "font-weight", "font-style", "text-decoration", "text-outline", "text-outline-width"],
  flow: ["color", "outline", "outline-width", "width", "arrow-style", "arrow-shape", "arrow-height", "arrow-head-width", "stroke-style", "roundness", "source-face", "target-face", "label", "label-position", "label-offset", "label-hidden", "annotation-above", "annotation-below", "annotation-above-hidden", "annotation-below-hidden", ...["above", "below"].flatMap((position) => ["color", "font-family", "font-size", "font-weight", "font-style", "text-decoration", "text-outline", "text-outline-width"].map((property) => `annotation-${position}-${property}`)), "font-family", "font-size", "font-weight", "font-style", "text-decoration", "text-outline", "text-outline-width", "hidden"],
  graph: ["label-position", "align", "vertical-align", "placement", "fill", "color", "outline", "outline-style", "outline-width", "padding", "x-spacing", "y-spacing", "shadow-color", "shadow-offset-x", "shadow-offset-y", "shadow-blur", "shadow-opacity", "font-family", "font-size", "font-weight", "font-style", "text-decoration", "text-outline", "text-outline-width"],
  annotation: ["color", "font-family", "font-size", "font-weight", "font-style", "text-decoration", "text-outline", "text-outline-width"],
};

function cssPropertyCompletions(kind) {
  const templates = new Map(structureCompletions.map((item) => [item.label.slice(1), item]));
  return (cssPropertyLabels[kind] ?? []).map((property) => {
    const template = templates.get(property);
    const value = template?.insert.match(/^\.[\w-]+(?:\s+([\s\S]*))?$/)?.[1] ?? "";
    return {
      label: property,
      insert: `${property}: ${value || "value"};`,
      detail: template?.detail ?? `Reusable ${kind} property`,
    };
  });
}

function cssCompletionContext(caret) {
  const before = source.value.slice(0, caret);
  const lineStart = before.lastIndexOf("\n") + 1;
  const current = before.slice(lineStart);
  const match = current.match(/(@?[a-zA-Z][\w-]*)$/);
  const start = match ? caret - match[1].length : caret;
  if (current.includes(":")) return { items: [], prefix: "", start: caret, end: caret };
  const openBrace = before.lastIndexOf("{");
  const closeBrace = before.lastIndexOf("}");
  if (openBrace > closeBrace) {
    const header = before.slice(0, openBrace).match(/@(node|flow|graph|annotation)\s+[a-zA-Z][\w-]*\s*$/);
    if (header) return { items: cssPropertyCompletions(header[1]), prefix: match?.[1] ?? "", start, end: caret };
  }
  return { items: cssRootCompletions, prefix: match?.[1] ?? "", start, end: caret };
}

function completionScope(caret) {
  const before = source.value.slice(0, caret);
  const lines = before.split("\n");
  const current = lines.pop() ?? "";
  const indent = current.match(/^\s*/)?.[0].replace(/\t/g, "  ").length ?? 0;
  const ancestors = [];
  let ceiling = indent;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const text = lines[index].trim();
    if (!text || text.startsWith("//")) continue;
    const width = (lines[index].match(/^\s*/)?.[0] ?? "").replace(/\t/g, "  ").length;
    if (width >= ceiling) continue;
    ancestors.push(text);
    ceiling = width;
  }
  const parent = ancestors[0] ?? "";
  const customKinds = new Map([...`${pugSource}\n${cssSource}`.matchAll(/^@(node|flow|graph|annotation)\s+([a-zA-Z][\w-]*)/gm)].map((match) => [`.${match[2]}`, match[1]]));
  const parentHead = parent.split(/\s/)[0];
  if (!parent) return "root";
  if (/^@node\b/.test(parent)) return "nodeStyle";
  if (/^@flow\b/.test(parent)) return "flowStyle";
  if (/^@graph\b/.test(parent)) return "graphStyle";
  if (/^@annotation\b/.test(parent)) return "annotationStyle";
  if (parent === "#canvas" || parent.startsWith("#canvas(")) return "canvas";
  if (parent === "graph") return "graph";
  if (parentHead === "flow" || parentHead === ".flow") return ancestors.some((item) => item === ".defaults") ? "flowStyle" : "flow";
  if (parentHead === ".annotation") return ancestors.some((item) => item === ".defaults") ? "annotationStyle" : "annotation";
  if ([".above", ".below"].includes(parentHead)) return "annotationEntry";
  if (parentHead === ".defaults") return "defaults";
  if (parentHead === "image") return "image";
  if (["node", ".node"].includes(parentHead) && ancestors.some((item) => item === ".defaults")) return "node";
  if (customKinds.get(parentHead) === "graph") return "graph";
  if (customKinds.get(parentHead) === "flow") return "flowStyle";
  if (customKinds.get(parentHead) === "annotation") return "annotationEntry";
  if (["node", ".node"].includes(parentHead) || customKinds.get(parentHead) === "node") return "node";
  return "root";
}

function completionsForScope(scope) {
  const allowed = completionLabels[scope] ?? completionLabels.root;
  const matches = availableStructureCompletions().filter((item) => {
    if (item.reusableKind) return (scope === item.reusableKind) || (scope === "annotationEntry" && item.reusableKind === "annotation");
    return allowed.has(item.label);
  });
  const unique = new Map(matches.map((item) => [item.label, item]));
  if (scope === "graph") unique.set("node", { label: "node", insert: "node\n  .label ", detail: "Declare an independent node" });
  if (scope === "defaults") {
    unique.set("node", { label: "node", insert: "node\n  .fill #ffffff", detail: "Default node properties" });
    unique.set("flow", { label: "flow", insert: "flow\n  .color #111111", detail: "Default flow properties" });
    unique.set(".annotation", { label: ".annotation", insert: ".annotation\n  .color #111111", detail: "Default annotation properties" });
  }
  return [...unique.values()].sort((left, right) => left.label.localeCompare(right.label));
}
let shownCompletions = [];
let activeCompletion = 0;
let completionRange = null;

function completionContext() {
  const caret = source.selectionStart;
  if (activeDocument === "css") return cssCompletionContext(caret);
  const lineStart = source.value.lastIndexOf("\n", caret - 1) + 1;
  const before = source.value.slice(lineStart, caret);
  const declaration = before.trimStart();
  const openParen = before.lastIndexOf("(");
  if (openParen > before.lastIndexOf(")")) {
    const match = before.match(/([\w-]*)$/);
    return { items: [], prefix: match?.[1] ?? "", start: caret - (match?.[1]?.length ?? 0), end: caret };
  }
  const match = before.match(/([a-zA-Z][\w-]*|(?:\.[\w-]*)+|#[\w-]*|@[\w-]*)$/);
  if (!match || declaration !== match[1]) return { items: [], prefix: "", start: caret, end: caret };
  return { items: completionsForScope(completionScope(caret)), prefix: match?.[1] ?? "", start: match ? caret - match[1].length : caret, end: caret };
}

function renderCompletions() {
  completionMenu.replaceChildren();
  shownCompletions.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "completion-item" + (index === activeCompletion ? " active" : "");
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === activeCompletion));
    button.append(document.createTextNode(item.label));
    const detail = document.createElement("small");
    detail.textContent = item.detail;
    button.append(detail);
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      activeCompletion = index;
      acceptCompletion();
    });
    completionMenu.append(button);
  });
}

function positionCompletionMenu() {
  const selection = window.getSelection();
  const range = selection?.rangeCount && source.contains(selection.focusNode) ? selection.getRangeAt(0).cloneRange() : null;
  range?.collapse(false);
  const caretRect = range?.getClientRects()[0];
  const shellRect = editorShell.getBoundingClientRect();
  const lineStart = source.value.lastIndexOf("\n", source.selectionStart - 1) + 1;
  const line = source.value.slice(0, source.selectionStart).split("\n").length - 1;
  const column = [...source.value.slice(lineStart, source.selectionStart)]
    .reduce((count, character) => character === "\t" ? count + (2 - count % 2) : count + 1, 0);
  const caretLeft = caretRect?.left ?? shellRect.left + 52 + column * 7.23 - source.scrollLeft;
  const caretTop = caretRect?.top ?? shellRect.top + 14 + line * 20 - source.scrollTop;
  const caretBottom = caretRect?.bottom ?? caretTop + 20;
  const width = completionMenu.offsetWidth;
  const height = completionMenu.offsetHeight;
  const left = Math.max(6, Math.min(caretLeft - shellRect.left, shellRect.width - width - 6));
  const below = caretBottom - shellRect.top + 4;
  const top = below + height <= shellRect.height - 6
    ? below
    : Math.max(6, caretTop - shellRect.top - height - 4);
  completionMenu.style.translate = `${left}px ${top}px`;
}

function showCompletions() {
  const context = completionContext();
  const prefix = context.prefix.toLowerCase().replace(/^\./, "");
  shownCompletions = context.items
    .filter((item) => item.label.toLowerCase().replace(/^\./, "").includes(prefix))
    .sort((left, right) => {
      const leftLabel = left.label.toLowerCase().replace(/^\./, "");
      const rightLabel = right.label.toLowerCase().replace(/^\./, "");
      const leftRank = leftLabel.startsWith(prefix) ? 0 : 1;
      const rightRank = rightLabel.startsWith(prefix) ? 0 : 1;
      return leftRank - rightRank || leftLabel.localeCompare(rightLabel);
    });
  if (!shownCompletions.length) return hideCompletions();
  activeCompletion = 0;
  completionRange = context;
  completionMenu.hidden = false;
  renderCompletions();
  positionCompletionMenu();
}

function hideCompletions() {
  completionMenu.hidden = true;
  completionMenu.style.translate = "";
  shownCompletions = [];
  completionRange = null;
}

function acceptCompletion() {
  const item = shownCompletions[activeCompletion];
  if (!item || !completionRange) return;
  const lineStart = source.value.lastIndexOf("\n", completionRange.start - 1) + 1;
  const indentation = source.value.slice(lineStart, completionRange.start).match(/^\s*/)?.[0] ?? "";
  source.setRangeText(item.insert.replaceAll("\n", `\n${indentation}`), completionRange.start, completionRange.end, "end");
  const caret = source.selectionStart - (item.cursorBack ?? 0);
  source.setSelectionRange(caret, caret);
  hideCompletions();
  source.dispatchEvent(new Event("input"));
}

function persistElementMove(change) {
  const nextX = change.currentX + change.dx;
  const nextY = change.currentY + change.dy;
  const draggedSelection = selections.find((item) => item.selectionKey === change.selectionKey);
  if (draggedSelection && selections.length > 1 && !["image-resize", "node-resize", "graph-resize", "node-label", "graph-label", "block-annotation"].includes(change.kind)) {
    let nextSource = source.value;
    const selectedNodeIds = selections.filter((selection) => selection.kind === "node").map((selection) => selection.id);
    const nodeMoves = independentMoveOffsets(diagram?.layout?.nodes ?? [], diagram?.layout?.edges ?? [], selectedNodeIds, change.dx, change.dy)
      .map((node) => ({ line: node.lineNumber, apply: (value) => setNodeOffsetField(value, node.lineNumber, "offset", node.offsetX, node.offsetY) }));
    const operations = [...nodeMoves, ...selections.map((selection) => {
      if (selection.kind === "node") return null;
      if (selection.kind === "graph") {
        const graph = diagram?.layout?.groups.find((candidate) => candidate.id === selection.id);
        return graph && { line: graph.lineNumber, apply: (value) => setDeclarationOffsetField(value, graph.lineNumber, (graph.offsetX ?? 0) + change.dx, (graph.offsetY ?? 0) + change.dy) };
      }
      if (selection.kind === "line") {
        const edge = diagram?.layout?.edges.find((candidate) => candidate.from === selection.from && candidate.to === selection.to && candidate.lineNumber === selection.lineNumber);
        return edge && { line: edge.lineNumber, apply: (value) => setStructuralOffsetField(value, edge.lineNumber, (edge.labelOffsetX ?? 0) + change.dx, (edge.labelOffsetY ?? 0) + change.dy) };
      }
      return null;
    }).filter(Boolean)].sort((a, b) => b.line - a.line);
    operations.forEach((operation) => { nextSource = operation.apply(nextSource); });
    if (operations.length) setSource(nextSource);
    return;
  }
  if (change.kind === "graph") {
    setSource(setDeclarationOffsetField(source.value, change.lineNumber, nextX, nextY));
    return;
  }
  if (change.kind === "graph-label") {
    setSource(setStructuralField(source.value, change.lineNumber, "label-offset", `(${Math.round(nextX * 10) / 10}, ${Math.round(nextY * 10) / 10})`));
    return;
  }
  if (change.kind === "node") {
    applyNodePositions(independentMoveOffsets(diagram?.layout?.nodes ?? [], diagram?.layout?.edges ?? [], [change.id], change.dx, change.dy));
    return;
  }
  if (change.kind === "node-label") {
    setSource(setNodeOffsetField(source.value, change.lineNumber, "label-offset", nextX, nextY));
    return;
  }
  if (change.kind === "image-resize" || change.kind === "node-resize") {
    const width = Math.max(1, change.currentWidth + change.dx * change.resizeX);
    const height = Math.max(1, change.currentHeight + change.dy * change.resizeY);
    const offsetX = change.currentX + (change.resizeX ? change.dx / 2 : 0);
    const offsetY = change.currentY + (change.resizeY ? change.dy / 2 : 0);
    setSource(setNodeGeometry(source.value, change.lineNumber, width, height, offsetX, offsetY));
    return;
  }
  if (change.kind === "graph-resize") {
    const width = Math.max(1, change.currentWidth + change.dx * change.resizeX);
    const height = Math.max(1, change.currentHeight + change.dy * change.resizeY);
    const offsetX = change.currentX + (change.resizeX ? change.dx / 2 : 0);
    const offsetY = change.currentY + (change.resizeY ? change.dy / 2 : 0);
    setSource(setGraphGeometry(source.value, change.lineNumber, width, height, offsetX, offsetY));
    return;
  }
  if (change.kind === "connection-label") {
    setSource(setStructuralOffsetField(source.value, change.lineNumber, nextX, nextY));
    return;
  }
  if (change.kind === "flow-annotation") {
    setSource(setAnnotationOffsetField(source.value, change.lineNumber, nextX, nextY));
    return;
  }
  setSource(setAnnotationOffsetField(source.value, change.lineNumber, nextX, nextY));
}

function cleanupDiagram() {
  if (!diagram?.layout) return;
  const ownerByNode = new Map();
  diagram.layout.groups.forEach((group) => group.nodeIds.forEach((id) => ownerByNode.set(id, group.id)));
  const internalEdges = diagram.layout.edges.filter((edge) => ownerByNode.get(edge.from) === ownerByNode.get(edge.to));
  const nodeChanges = cleanupAlignmentOffsets(diagram.layout.nodes, internalEdges);
  const nodeChangesById = new Map(nodeChanges.map((change) => [change.id, change]));
  const cleanedNodes = diagram.layout.nodes.map((node) => {
    const change = nodeChangesById.get(node.id);
    return change ? {
      ...node,
      x: node.x + change.offsetX - (node.offsetX ?? 0),
      y: node.y + change.offsetY - (node.offsetY ?? 0),
      offsetX: change.offsetX,
      offsetY: change.offsetY,
    } : node;
  });
  const graphChanges = cleanupGraphOffsets(cleanedNodes, diagram.layout.edges, diagram.layout.groups);
  let nextSource = source.value;
  const operations = [
    ...nodeChanges.map((change) => ({ ...change, apply: (value) => setNodeOffsetField(value, change.lineNumber, "offset", change.offsetX, change.offsetY) })),
    ...graphChanges.map((change) => ({ ...change, apply: (value) => setDeclarationOffsetField(value, change.lineNumber, change.offsetX, change.offsetY) })),
  ];
  [...operations].sort((a, b) => b.lineNumber - a.lineNumber).forEach((change) => {
    nextSource = change.apply(nextSource);
  });
  if (nextSource === source.value) {
    status.textContent = "Diagram is already clean.";
    status.className = "status ready";
    return;
  }
  setSource(nextSource);
  const parts = [];
  if (nodeChanges.length) parts.push(`${nodeChanges.length} node${nodeChanges.length === 1 ? "" : "s"}`);
  if (graphChanges.length) parts.push(`${graphChanges.length} graph${graphChanges.length === 1 ? "" : "s"}`);
  status.textContent = `Cleaned up ${parts.join(" and ")}.`;
  status.className = "status ready";
}

function applyNodePositions(targets) {
  let nextSource = source.value;
  [...targets].sort((a, b) => b.lineNumber - a.lineNumber).forEach((target) => {
    nextSource = setNodeOffsetField(nextSource, target.lineNumber, "offset", target.offsetX, target.offsetY);
  });
  setSource(nextSource);
}

function arrangeSelection(action) {
  const selectedGraphIds = new Set(selections.filter((item) => item.kind === "graph").map((item) => item.id));
  const graphs = (diagram?.layout?.groups ?? []).filter((group) => selectedGraphIds.has(group.id)).map((group) => ({
    id: group.id, lineNumber: group.lineNumber, x: group.x, y: group.y, width: group.right - group.x,
    height: group.bottom - group.y, aboveHeight: 0, offsetX: group.offsetX ?? 0, offsetY: group.offsetY ?? 0,
  }));
  if (graphs.length) {
    let nextSource = source.value;
    if (action === "remove-offsets") {
      [...graphs].sort((a, b) => b.lineNumber - a.lineNumber).forEach((graph) => { nextSource = removeDeclarationField(nextSource, graph.lineNumber, "offset"); });
    } else if (graphs.length > 1) {
      [...arrangeNodeOffsets(graphs, action)].sort((a, b) => b.lineNumber - a.lineNumber)
        .forEach((graph) => { nextSource = setDeclarationOffsetField(nextSource, graph.lineNumber, graph.offsetX, graph.offsetY); });
    }
    setSource(nextSource);
    return;
  }
  const nodes = selectedNodes();
  if (!nodes.length) return;
  if (action === "remove-offsets") {
    let nextSource = source.value;
    [...nodes].sort((a, b) => b.lineNumber - a.lineNumber).forEach((node) => { nextSource = removeNodeField(nextSource, node.lineNumber, "offset"); });
    setSource(nextSource);
    return;
  }
  if (nodes.length < 2) return;
  applyNodePositions(arrangeNodeOffsets(nodes, action));
}

function filename(extension) {
  const stem = pugFileName.replace(/\.pug$/i, "") || "Untitled";
  return `${stem}.${extension}`;
}

function exportFilename(extension, graphId = "") {
  const stem = pugFileName.replace(/\.pug$/i, "") || "Untitled";
  return `${stem}${graphId ? `-${graphId}` : ""}.${extension}`;
}

function sourceFilename(extension) {
  if (extension === "pug") return pugFileName || "Untitled.pug";
  return cssFileName || filename("css");
}

function sourcePickerOptions(kind) {
  const css = kind === "css";
  return {
    suggestedName: sourceFilename(kind),
    types: [{
      description: css ? "CSS stylesheet" : "Pugflow diagram",
      accept: { [css ? "text/css" : "text/plain"]: [css ? ".css" : ".pug"] },
    }],
  };
}

async function saveActiveSource(saveAs = false) {
  storeActiveDocument();
  if (!window.showSaveFilePicker) {
    status.textContent = "Direct file saving requires a browser with system file access.";
    status.className = "status error";
    return;
  }
  const kind = activeDocument;
  let handle = kind === "pug" ? pugFileHandle : cssFileHandle;
  try {
    if (saveAs || !handle) handle = await window.showSaveFilePicker(sourcePickerOptions(kind));
    const writable = await handle.createWritable();
    await writable.write(kind === "pug" ? pugSource : cssSource);
    await writable.close();
    if (kind === "pug") { pugFileHandle = handle; pugFileName = handle.name; }
    else { cssFileHandle = handle; cssFileName = handle.name; hasCssDocument = true; }
    updateSourceFileNames();
    persistWorkspace();
    status.textContent = `Saved ${handle.name}`;
    status.className = "status ready";
    fileMenu.open = false;
  } catch (error) {
    if (error?.name !== "AbortError") {
      status.textContent = `Could not save file: ${error.message}`;
      status.className = "status error";
    }
  }
}

async function loadSourceFiles(files, handles = []) {
  const pug = files.find((file) => file.name.toLowerCase().endsWith(".pug"));
  const css = files.find((file) => file.name.toLowerCase().endsWith(".css"));
  if (pug) {
    pugSource = await pug.text();
    pugFileName = pug.name;
    pugFileHandle = handles[files.indexOf(pug)] ?? null;
  }
  if (css) {
    cssSource = await css.text();
    cssFileName = css.name;
    cssFileHandle = handles[files.indexOf(css)] ?? null;
    hasCssDocument = true;
  }
  canvasUndo = [];
  canvasRedo = [];
  selections = [];
  updateSourceFileNames();
  source.value = activeDocument === "pug" ? pugSource : cssSource;
  highlightSource();
  update();
  fileMenu.open = false;
}

function selectSourceLine({ lineNumber }) {
  if (activeDocument !== "pug") activateDocument("pug");
  const lines = source.value.split("\n");
  const start = lines.slice(0, lineNumber - 1).reduce((length, line) => length + line.length + 1, 0);
  lastEditorCaret = start;
  const lineHeight = Number.parseFloat(getComputedStyle(source).lineHeight) || 20;
  const reveal = () => {
    source.scrollTop = Math.max(0, (lineNumber - 3) * lineHeight);
    updateEditorChrome();
  };
  reveal();
  requestAnimationFrame(reveal);
  editorShell.classList.remove("source-target");
  void editorShell.offsetWidth;
  editorShell.classList.add("source-target");
}

function update() {
  storeActiveDocument();
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

function setCanvasZoom(percent) {
  canvasZoomPercent = Math.max(25, Math.min(300, Math.round(percent / 5) * 5));
  if (![...canvasZoom.options].some((option) => Number(option.value) === canvasZoomPercent)) {
    canvasZoom.add(new Option(`${canvasZoomPercent}%`, String(canvasZoomPercent)));
  }
  canvasZoom.value = String(canvasZoomPercent);
  applyCanvasZoom();
}

function applyCanvasZoom() {
  const svg = canvas.querySelector("svg");
  if (!svg) return;
  const intrinsicWidth = Number(svg.getAttribute("width")) || 1;
  const intrinsicHeight = Number(svg.getAttribute("height")) || 1;
  svg.style.width = `${intrinsicWidth * canvasZoomPercent / 100}px`;
  svg.style.height = `${intrinsicHeight * canvasZoomPercent / 100}px`;
  svg.style.maxWidth = "none";
}

function fitCanvasZoom() {
  const svg = canvas.querySelector("svg");
  if (!svg) return;
  const width = Number(svg.getAttribute("width")) || 1;
  const height = Number(svg.getAttribute("height")) || 1;
  const availableWidth = Math.max(1, canvasShell.clientWidth - 70);
  const availableHeight = Math.max(1, canvasShell.clientHeight - 70);
  setCanvasZoom(Math.min(availableWidth / width, availableHeight / height) * 100);
}

function zoomCanvasAt(clientX, clientY, percent) {
  const svg = canvas.querySelector("svg");
  if (!svg || percent === canvasZoomPercent) return;
  const before = svg.getBoundingClientRect();
  const anchorX = before.width ? (clientX - before.left) / before.width : 0.5;
  const anchorY = before.height ? (clientY - before.top) / before.height : 0.5;
  setCanvasZoom(percent);
  const after = svg.getBoundingClientRect();
  canvasShell.scrollBy({
    left: after.left + after.width * anchorX - clientX,
    top: after.top + after.height * anchorY - clientY,
    behavior: "auto",
  });
}

/** True while the caret lives in the source editor, so edits there keep their selection. */
function sourceHasFocus() {
  return document.activeElement === source || source.contains(document.activeElement);
}

/** Describe an inspector control well enough to find it again after a re-render. */
function controlIdentity(control, root) {
  if (!control || !root) return null;
  const tagName = control.tagName.toLowerCase();
  return {
    root,
    tagName,
    type: control.type ?? "",
    dataset: { ...control.dataset },
    index: [...root.querySelectorAll(tagName)].indexOf(control),
    selectionStart: control.selectionStart ?? null,
    selectionEnd: control.selectionEnd ?? null,
  };
}

function restoreControlFocus(identity) {
  if (!identity) return false;
  const roots = [identity.root, identity.root === inspectorContent ? sidecarContent : inspectorContent];
  const keys = Object.keys(identity.dataset);
  for (const root of roots) {
    if (!root.isConnected) continue;
    const candidates = [...root.querySelectorAll(identity.tagName)];
    const control = (keys.length
      ? candidates.find((candidate) => candidate.type === identity.type
        && keys.every((key) => candidate.dataset[key] === identity.dataset[key]))
      : null) ?? candidates[identity.index];
    if (!control) continue;
    control.focus({ preventScroll: true });
    if (identity.selectionStart !== null && typeof control.setSelectionRange === "function") {
      try { control.setSelectionRange(identity.selectionStart, identity.selectionEnd ?? identity.selectionStart); } catch { /* unsupported input type */ }
    }
    return document.activeElement === control;
  }
  return false;
}

/** Keep focus inside the property panel when the edited control disappeared. */
function focusInspectorFallback(root) {
  const target = [root, inspectorContent].find((candidate) => candidate?.isConnected && !candidate.closest("[hidden]"))
    ?.querySelector("input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])");
  if (target) { target.focus({ preventScroll: true }); return; }
  inspector.tabIndex = -1;
  inspector.focus({ preventScroll: true });
}

function setSource(value, recordHistory = true) {
  const activeRoot = [inspectorContent, sidecarContent].find((root) => root.contains(document.activeElement));
  const focusIdentity = controlIdentity(activeRoot ? document.activeElement : null, activeRoot);
  if (activeDocument !== "pug") activateDocument("pug");
  if (recordHistory && !colorPickerActive && value !== pugSource) {
    canvasUndo.push(pugSource);
    canvasRedo = [];
  }
  source.value = value;
  pugSource = value;
  highlightSource();
  syncHighlightScroll();
  hideCompletions();
  update();
  if (activeRoot && !restoreControlFocus(focusIdentity)) focusInspectorFallback(activeRoot);
}

function undoCanvas() {
  const previous = canvasUndo.pop();
  if (previous === undefined) return;
  canvasRedo.push(pugSource);
  setSource(previous, false);
}

function redoCanvas() {
  const next = canvasRedo.pop();
  if (next === undefined) return;
  canvasUndo.push(pugSource);
  setSource(next, false);
}

source.value = activeDocument === "pug" ? pugSource : cssSource;
source.addEventListener("beforeinput", () => {
  if (activeDocument !== "pug" || colorPickerActive || source.value !== pugSource) return;
  if (canvasUndo.at(-1) !== pugSource) canvasUndo.push(pugSource);
  canvasRedo = [];
});
source.addEventListener("input", (event) => {
  storeActiveDocument();
  highlightSource();
  update();
  if (/^[a-z@.#-]$/i.test(event.data ?? "")) showCompletions();
  else if (!completionMenu.hidden) showCompletions();
});
source.addEventListener("keydown", (event) => {
  if (activeDocument === "pug" && (event.metaKey || event.ctrlKey) && !event.altKey && ["z", "y"].includes(event.key.toLowerCase())) {
    event.preventDefault();
    if (event.key.toLowerCase() === "y" || event.shiftKey) redoCanvas();
    else undoCanvas();
    return;
  }
  if (event.ctrlKey && event.code === "Space") {
    event.preventDefault();
    showCompletions();
    return;
  }
  if (!completionMenu.hidden) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      activeCompletion = (activeCompletion + direction + shownCompletions.length) % shownCompletions.length;
      renderCompletions();
      completionMenu.children[activeCompletion]?.scrollIntoView({ block: "nearest" });
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      acceptCompletion();
      return;
    }
    if (event.key === "Enter") hideCompletions();
    if (event.key === "Escape") {
      event.preventDefault();
      hideCompletions();
      return;
    }
  }
  if (event.key !== "Tab") return;
  event.preventDefault();
  const indented = indentSourceSelection(source.value, source.selectionStart, source.selectionEnd, event.shiftKey);
  source.value = indented.value;
  source.setSelectionRange(indented.start, indented.end);
  source.dispatchEvent(new Event("input"));
});
source.addEventListener("scroll", syncHighlightScroll);
source.addEventListener("click", hideCompletions);
source.addEventListener("keyup", updateEditorChrome);
source.addEventListener("vim-mode-change", updateEditorChrome);
document.addEventListener("selectionchange", () => {
  if (document.activeElement === source) updateEditorChrome();
});
document.addEventListener("pointerdown", (event) => {
  if (!completionMenu.contains(event.target) && event.target !== source) hideCompletions();
});

document.querySelectorAll("[data-source-tab]").forEach((tab) => tab.addEventListener("click", () => activateDocument(tab.dataset.sourceTab)));
const fileMenu = document.querySelector(".file-menu");
document.querySelector("#new-pug").addEventListener("click", () => {
  storeActiveDocument();
  if (pugSource && !window.confirm("Replace the current Pug document with a new blank diagram?")) return;
  pugSource = "";
  pugFileName = "";
  pugFileHandle = null;
  canvasUndo = [];
  canvasRedo = [];
  selections = [];
  updateSourceFileNames();
  activateDocument("pug", true);
  fileMenu.open = false;
});
document.querySelector("#new-css").addEventListener("click", () => {
  storeActiveDocument();
  if (cssSource && !window.confirm("Replace the current CSS document with a new blank file?")) return;
  cssSource = "";
  cssFileName = "";
  cssFileHandle = null;
  hasCssDocument = true;
  updateSourceFileNames();
  activateDocument("css", true);
  fileMenu.open = false;
});
document.querySelector("#save-source").addEventListener("click", () => saveActiveSource());
document.querySelector("#save-source-as").addEventListener("click", () => saveActiveSource(true));
document.querySelector("#cleanup-diagram").addEventListener("click", cleanupDiagram);
canvasZoom.addEventListener("change", () => setCanvasZoom(Number(canvasZoom.value)));
document.querySelector("#zoom-out").addEventListener("click", () => setCanvasZoom(canvasZoomPercent - 25));
document.querySelector("#zoom-in").addEventListener("click", () => setCanvasZoom(canvasZoomPercent + 25));
document.querySelector("#zoom-fit").addEventListener("click", fitCanvasZoom);

const modeSelectButton = document.querySelector("#mode-select");
const modePanButton = document.querySelector("#mode-pan");
function setCanvasMode(mode) {
  canvasMode = mode;
  modeSelectButton.classList.toggle("mode-active", mode === "select");
  modePanButton.classList.toggle("mode-active", mode === "pan");
  modeSelectButton.setAttribute("aria-pressed", String(mode === "select"));
  modePanButton.setAttribute("aria-pressed", String(mode === "pan"));
  canvasShell.classList.toggle("pan-mode", mode === "pan");
}
modeSelectButton.addEventListener("click", () => setCanvasMode("select"));
modePanButton.addEventListener("click", () => setCanvasMode("pan"));

let panPointer = null;
canvasShell.addEventListener("pointerdown", (event) => {
  const effectivePan = canvasMode === "pan" || spaceHeld;
  if (!effectivePan || event.button !== 0) return;
  panPointer = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, scrollLeft: canvasShell.scrollLeft, scrollTop: canvasShell.scrollTop };
  canvasShell.setPointerCapture(event.pointerId);
  canvasShell.classList.add("panning");
  event.preventDefault();
  event.stopPropagation();
}, { capture: true });
canvasShell.addEventListener("pointermove", (event) => {
  if (!panPointer || panPointer.pointerId !== event.pointerId) return;
  canvasShell.scrollLeft = panPointer.scrollLeft - (event.clientX - panPointer.x);
  canvasShell.scrollTop = panPointer.scrollTop - (event.clientY - panPointer.y);
});
function finishCanvasPan(event) {
  if (!panPointer || panPointer.pointerId !== event.pointerId) return;
  panPointer = null;
  canvasShell.classList.remove("panning");
}
canvasShell.addEventListener("pointerup", finishCanvasPan);
canvasShell.addEventListener("pointercancel", finishCanvasPan);
canvasShell.addEventListener("lostpointercapture", finishCanvasPan);

let spaceHeld = false;
document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !event.target.matches("input, textarea, [contenteditable='true'], select, button") && !spaceHeld) {
    spaceHeld = true;
    if (canvasMode === "select") canvasShell.classList.add("pan-mode");
  }
  if (event.code === "KeyV" && !event.ctrlKey && !event.metaKey && !event.target.matches("input, textarea, [contenteditable='true'], select")) setCanvasMode("select");
  if (event.code === "KeyH" && !event.ctrlKey && !event.metaKey && !event.target.matches("input, textarea, [contenteditable='true'], select")) setCanvasMode("pan");
});
document.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    spaceHeld = false;
    if (canvasMode === "select") canvasShell.classList.remove("pan-mode");
  }
});
canvasShell.addEventListener("wheel", (event) => {
  if (inspector.contains(event.target) || sidecar.contains(event.target)) return;
  const mouseWheel = event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL
    || (Math.abs(event.deltaX) < 1 && Math.abs(event.deltaY) >= 80);
  if (!event.ctrlKey && !mouseWheel) return;
  event.preventDefault();
  const magnitude = event.ctrlKey ? Math.min(20, Math.max(5, Math.abs(event.deltaY) * 0.25)) : 10;
  zoomCanvasAt(event.clientX, event.clientY, canvasZoomPercent + (event.deltaY < 0 ? magnitude : -magnitude));
}, { passive: false });
document.querySelector("#add-diagram").addEventListener("click", () => openGraphBuilder("diagram"));
document.querySelector("#add-node").addEventListener("click", () => openGraphBuilder(currentGraph.nodes.length ? "node" : "diagram"));
document.querySelector("#add-image").addEventListener("click", () => {
  const graph = currentGraph.groups[0];
  if (!graph) { showCanvasToast("Create a graph before adding an image."); return; }
  const imageSource = window.prompt("Image URL or file location");
  if (!imageSource?.trim()) return;
  const id = suggestedNodeId().replace(/^node/, "image");
  setSource(appendGraphImage(source.value, graph.lineNumber, { id, source: imageSource.trim() }));
  selectCreatedNode(id);
});
document.querySelector("#add-flow").addEventListener("click", () => openGraphBuilder("flow"));
const toolbarMenus = [...document.querySelectorAll(".toolbar-menu")];
toolbarMenus.forEach((menu) => menu.addEventListener("click", (event) => {
  if (event.target.closest("button")) menu.open = false;
  else if (event.target.closest("summary")) toolbarMenus.filter((other) => other !== menu).forEach((other) => { other.open = false; });
}));
document.addEventListener("pointerdown", (event) => toolbarMenus.forEach((menu) => {
  if (menu.open && !menu.contains(event.target)) menu.open = false;
}));
document.querySelector("#undo-canvas").addEventListener("click", undoCanvas);
document.querySelector("#redo-canvas").addEventListener("click", redoCanvas);
document.addEventListener("keydown", (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const focused = document.activeElement;
  if (focused?.matches("input:not([type='button']):not([type='checkbox']):not([type='radio']):not([type='range']):not([type='submit']), textarea, [contenteditable='true']")) return;
  if (event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redoCanvas() : undoCanvas(); }
  else if (event.key.toLowerCase() === "y") { event.preventDefault(); redoCanvas(); }
}, { capture: true });
document.querySelector("#close-inspector").addEventListener("click", () => { selections = []; closeSidecar(); paintSelections(); renderInspector(); });
document.querySelector("#sidecar-close").addEventListener("click", closeSidecar);
document.querySelector("#delete-selection").addEventListener("click", deleteCanvasSelection);
saveReusableStyle.addEventListener("click", () => openSelectedReusableStyle(saveReusableStyle.dataset.buildStyle));
const handleInspectorClick = (event) => {
  if (event.target.matches("summary input[type='checkbox']")) event.stopPropagation();
  const addFace = event.target.closest("[data-face-add]")?.dataset.faceAdd;
  if (addFace) {
    const node = selectedNodes()[0];
    if (node) openGraphBuilder("connected-node", [node.id], { face: addFace });
    return;
  }
  const flowEntry = event.target.closest("[data-flow-entry]");
  const previewPart = event.target.closest("[data-sidecar]");
  if (flowEntry && (!previewPart || previewPart === flowEntry || previewPart.dataset.sidecar === "node-flow")) {
    openSidecar("node-flow", { edgeKey: flowEntry.dataset.flowEntry });
    return;
  }
  if (previewPart) {
    openSidecar(previewPart.dataset.sidecar, {
      face: previewPart.dataset.face,
      position: previewPart.dataset.annotationPosition,
    });
    return;
  }
  const selectedFlow = event.target.closest("[data-select-flow]")?.dataset.selectFlow;
  if (selectedFlow) {
    const edge = edgeForKey(selectedFlow);
    if (edge) {
      closeSidecar();
      selectCanvasElement({ kind: "line", from: edge.from, to: edge.to, lineNumber: edge.lineNumber, selectionKey: `line:${edge.from}:${edge.to}:${edge.lineNumber}`, additive: false });
    }
    return;
  }
  const colorPopup = event.target.closest("[data-color-popup]");
  if (colorPopup) {
    const key = colorPopup.dataset.colorPopup;
    const textInput = inspectorQuery(`[data-color-text="${key}"]`);
    if (textInput) openColorPickerPopup(colorPopup, textInput.value, (color) => {
      const currentInput = inspectorQuery(`[data-color-text="${key}"]`);
      if (!currentInput) return;
      currentInput.value = color;
      const currentTrigger = inspectorQuery(`[data-color-popup="${key}"]`);
      currentTrigger?.style.setProperty("--swatch", color);
      currentTrigger?.classList.toggle("none", /^#[0-9a-f]{6}00$/i.test(color));
      currentInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    return;
  }
  if (event.target.closest("[data-add-annotation]")) {
    if (selectedNodes()[0]) openAnnotationBuilder("node");
    return;
  }
  if (event.target.closest("[data-add-line-annotation]")) {
    if (selectedEdges()[0]) openAnnotationBuilder("line");
    return;
  }
  const deletedAnnotation = Number(event.target.closest("[data-delete-annotation]")?.dataset.deleteAnnotation);
  if (deletedAnnotation) {
    setSource(removeNodeAnnotation(source.value, deletedAnnotation));
    return;
  }
  const deletedLineAnnotation = event.target.closest("[data-delete-line-annotation]")?.dataset.deleteLineAnnotation;
  if (deletedLineAnnotation) {
    const edge = selectedEdges()[0];
    if (edge) {
      const position = deletedLineAnnotation.replace("annotation-", "");
      const fields = [deletedLineAnnotation, `${deletedLineAnnotation}-hidden`, ...["color", "font-family", "font-size", "font-weight", "font-style", "text-decoration", "text-outline", "text-outline-width"].map((property) => `annotation-${position}-${property}`)];
      let nextSource = source.value;
      fields.forEach((field) => { nextSource = removeDeclarationField(nextSource, edge.lineNumber, field); });
      setSource(nextSource);
    }
    return;
  }
  const annotationOffset = Number(event.target.closest("[data-remove-annotation-offset]")?.dataset.removeAnnotationOffset);
  if (annotationOffset) {
    setSource(removeDeclarationField(source.value, annotationOffset, "offset"));
    return;
  }
  const flowAnnotationOffset = Number(event.target.closest("[data-remove-flow-annotation-offset]")?.dataset.removeFlowAnnotationOffset);
  if (flowAnnotationOffset) {
    setSource(removeDeclarationField(source.value, flowAnnotationOffset, "offset"));
    return;
  }
  const deletedFlowAnnotation = Number(event.target.closest("[data-delete-flow-annotation]")?.dataset.deleteFlowAnnotation);
  if (deletedFlowAnnotation) {
    setSource(removeDeclaration(source.value, deletedFlowAnnotation));
    return;
  }
  if (event.target.closest("[data-remove-graph-label-offset]")) {
    const group = selections.length === 1 && selections[0].kind === "graph"
      ? currentGraph.groups.find((candidate) => candidate.id === selections[0].id)
      : null;
    if (group) setSource(removeDeclarationField(source.value, group.lineNumber, "label-offset"));
    return;
  }
  const graphMode = event.target.closest("[data-graph-add]")?.dataset.graphAdd;
  if (graphMode) {
    openGraphBuilder(graphMode, selectedNodes().map((node) => node.id));
    return;
  }
  if (event.target.closest("[data-choose-image]")) {
    nodeImageFile.click();
    return;
  }
  const styleKind = event.target.closest("[data-build-style]")?.dataset.buildStyle;
  if (styleKind) { openSelectedReusableStyle(styleKind); return; }
  const action = event.target.closest("[data-arrange]")?.dataset.arrange;
  if (action) arrangeSelection(action);
  const field = event.target.closest("[data-remove-field]")?.dataset.removeField;
  if (field) {
    let nextSource = source.value;
    [...selectedNodes()].sort((a, b) => b.lineNumber - a.lineNumber).forEach((node) => { nextSource = removeNodeField(nextSource, node.lineNumber, field); });
    setSource(nextSource);
  }
};
inspectorContent.addEventListener("click", handleInspectorClick);
sidecarContent.addEventListener("click", handleInspectorClick);
inspectorContent.addEventListener("toggle", syncInspectorScrollbarWidth, true);
graphBuilderForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const mode = graphBuilder.dataset.mode;
  const id = builderId.value.trim();
  const label = builderLabel.value.replace(/[\r\n]+/g, " ").trim();
  if (mode !== "flow" && !/^[a-zA-Z][\w-]*$/.test(id)) {
    builderError.textContent = "ID must start with a letter and contain only letters, numbers, underscores, or hyphens.";
    return;
  }
  if (mode !== "flow" && currentGraph.nodes.some((node) => node.id === id)) {
    builderError.textContent = `The ID “${id}” is already in use.`;
    return;
  }
  const options = {
    fromDirection: builderFromDirection.value,
    toDirection: builderToDirection.value,
    nodeType: builderNodeType.value,
    lineType: builderLineType.value,
    id,
    label,
    diagramId: builderDiagramId.value.trim(),
    diagramLabel: builderDiagramLabel.value.trim(),
    diagramPlacement: builderDiagramPlacement.value,
    diagramRelativeTo: builderDiagramRelativeTo.value,
    diagramFill: document.querySelector("#builder-diagram-fill").value.trim(),
    diagramOutline: document.querySelector("#builder-diagram-outline").value.trim(),
  };
  let nextSource;
  if (mode === "flow") {
    const from = selectedBuilderNode(builderSources);
    const to = selectedBuilderNode(builderTargets);
    if (!from || !to) {
      builderError.textContent = "Choose both a From Node and a To Node.";
      return;
    }
    if (from === to) {
      builderError.textContent = "Choose two different nodes.";
      return;
    }
    const fromGroup = graphForNode(from);
    const toGroup = graphForNode(to);
    const canvasLine = pugSource.split("\n").findIndex((line) => /^#(?:canvas|diagram)(?:\(|$)/.test(line.trim())) + 1;
    const scopeLine = fromGroup?.id === toGroup?.id ? fromGroup.lineNumber : canvasLine || 0;
    nextSource = appendFlowReference(pugSource, scopeLine, { ...options, from, to });
  } else if (mode === "connected-node") {
    const pinned = graphBuilder.dataset.connectedNode;
    const pinnedGraph = graphForNode(pinned);
    const nodeGraph = currentGraph.groups.find((candidate) => candidate.id === builderNewNodeGraph.value);
    if (!pinnedGraph || !nodeGraph || !pinned) {
      builderError.textContent = "The connected node or graph is no longer available.";
      return;
    }
    options.fromDirection = DIRECTION_FOR_FACE[builderConnectedFace.value] ?? "right";
    options.toDirection = options.fromDirection;
    const towardNewNode = builderFlowDirection.value === "to";
    const from = towardNewNode ? pinned : id;
    const to = towardNewNode ? id : pinned;
    const canvasLine = pugSource.split("\n").findIndex((line) => /^#(?:canvas|diagram)(?:\(|$)/.test(line.trim())) + 1;
    const scopeLine = pinnedGraph.id === nodeGraph.id ? nodeGraph.lineNumber : canvasLine || 0;
    nextSource = appendGraphNode(pugSource, nodeGraph.lineNumber, options);
    nextSource = appendFlowReference(nextSource, scopeLine, { ...options, from, to, toDirection: options.fromDirection });
  } else if (mode === "node") {
    const graph = currentGraph.groups.find((candidate) => candidate.id === builderFromGraph.value);
    if (!graph) {
      builderError.textContent = "Choose a graph.";
      return;
    }
    nextSource = appendGraphNode(pugSource, graph.lineNumber, options);
  } else nextSource = appendDiagramNode(pugSource, options);
  graphBuilder.close();
  setSource(nextSource);
  if (mode !== "flow") selectCreatedNode(id);
});
builderFromGraph.addEventListener("change", () => renderBuilderNodeChoices(builderSources, builderFromGraph.value, ""));
builderToGraph.addEventListener("change", () => renderBuilderNodeChoices(builderTargets, builderToGraph.value, ""));
[builderSources, builderTargets].forEach((container) => container.addEventListener("click", (event) => {
  const choice = event.target.closest("[data-node-choice]");
  if (choice) chooseBuilderNode(container, choice.dataset.nodeChoice);
}));
function annotationBuilderStyle() {
  const type = document.querySelector("#annotation-builder-type").value;
  const preset = {};
  if (type) {
    const escaped = type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const body = cssSource.match(new RegExp(`@annotation\\s+${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
    for (const declaration of body.split(";")) {
      const separator = declaration.indexOf(":");
      if (separator > 0) preset[declaration.slice(0, separator).trim()] = declaration.slice(separator + 1).trim();
    }
  }
  const entered = {
    color: document.querySelector("#annotation-builder-color").value.trim(),
    "font-size": document.querySelector("#annotation-builder-font-size").value,
    "font-family": document.querySelector("#annotation-builder-font-family").value.trim(),
    "font-weight": document.querySelector("#annotation-builder-font-weight").value,
    "font-style": document.querySelector("#annotation-builder-font-style").value,
    "text-decoration": document.querySelector("#annotation-builder-decoration").value,
    "text-outline": document.querySelector("#annotation-builder-text-outline").value.trim(),
    "text-outline-width": document.querySelector("#annotation-builder-text-outline-width").value,
  };
  return { type, values: Object.fromEntries(Object.entries({ ...preset, ...Object.fromEntries(Object.entries(entered).filter(([, value]) => value !== "")) }).filter(([, value]) => value !== "")) };
}
annotationBuilderForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const text = document.querySelector("#annotation-builder-text").value.trim();
  if (!text) {
    document.querySelector("#annotation-builder-error").textContent = "Enter annotation text.";
    return;
  }
  const position = document.querySelector("#annotation-builder-position").value;
  const annotationStyle = annotationBuilderStyle();
  if (annotationBuilder.dataset.target === "line") {
    const edge = selectedEdges()[0];
    if (!edge) { annotationBuilder.close(); return; }
    setSource(appendFlowAnnotation(source.value, edge.lineNumber, {
      text,
      type: annotationStyle.type,
      color: document.querySelector("#annotation-builder-color").value.trim(),
      fontSize: document.querySelector("#annotation-builder-font-size").value,
      fontFamily: document.querySelector("#annotation-builder-font-family").value.trim(),
      fontWeight: document.querySelector("#annotation-builder-font-weight").value,
      fontStyle: document.querySelector("#annotation-builder-font-style").value,
      textDecoration: document.querySelector("#annotation-builder-decoration").value,
      textOutline: document.querySelector("#annotation-builder-text-outline").value.trim(),
      textOutlineWidth: document.querySelector("#annotation-builder-text-outline-width").value,
    }));
    annotationBuilder.close();
    return;
  }
  const node = selectedNodes()[0];
  if (!node) { annotationBuilder.close(); return; }
  setSource(appendNodeAnnotation(source.value, node.lineNumber, {
    position,
    type: annotationStyle.type,
    text,
    color: document.querySelector("#annotation-builder-color").value.trim(),
    fontSize: document.querySelector("#annotation-builder-font-size").value,
    fontFamily: document.querySelector("#annotation-builder-font-family").value.trim(),
    fontWeight: document.querySelector("#annotation-builder-font-weight").value,
    fontStyle: document.querySelector("#annotation-builder-font-style").value,
    textDecoration: document.querySelector("#annotation-builder-decoration").value,
    textOutline: document.querySelector("#annotation-builder-text-outline").value.trim(),
    textOutlineWidth: document.querySelector("#annotation-builder-text-outline-width").value,
  }));
  annotationBuilder.close();
});
styleBuilderForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  if (!pendingReusableStyle) return;
  const name = styleBuilderName.value.trim();
  try {
    cssSource = appendReusableStyle(cssSource, pendingReusableStyle.kind, name, pendingReusableStyle.declarations);
    hasCssDocument = true;
    const { kind, lineNumber } = pendingReusableStyle;
    pendingReusableStyle = null;
    styleBuilder.close();
    if (lineNumber) {
      if (kind === "node") setSource(setNodeType(source.value, lineNumber, name, reusableNames("node")));
      else if (kind === "flow") setSource(setStructuralLineType(source.value, lineNumber, name, reusableNames("flow")));
      else if (kind === "graph") setSource(setGraphType(source.value, lineNumber, name, reusableNames("graph")));
    }
    updateSourceFileNames();
    activateDocument("css");
    showCanvasToast(`Added @${styleBuilderKind.textContent} ${name} to CSS`);
  } catch (error) {
    styleBuilderError.textContent = error.message;
  }
});
nodeImageFile.addEventListener("change", () => {
  const file = nodeImageFile.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const imported = new Image();
    imported.onload = () => {
      let nextSource = source.value;
      [...selectedNodes()].filter((node) => node.kind === "image").sort((a, b) => b.lineNumber - a.lineNumber).forEach((node) => {
        nextSource = setNodeField(nextSource, node.lineNumber, "source", reader.result);
        nextSource = setNodeField(nextSource, node.lineNumber, "width", String(imported.naturalWidth));
        nextSource = setNodeField(nextSource, node.lineNumber, "height", String(imported.naturalHeight));
      });
      setSource(nextSource);
      nodeImageFile.value = "";
    };
    imported.src = reader.result;
  };
  reader.readAsDataURL(file);
});
const handleInspectorChange = (event) => {
  const nodes = selectedNodes();
  const node = nodes[0];
  const structuralField = event.target.dataset.structuralField;
  if (structuralField) {
    const lineNumber = Number(event.target.dataset.structuralLine);
    if (!lineNumber) return;
    setSource(event.target.value === ""
      ? removeDeclarationField(source.value, lineNumber, structuralField)
      : setStructuralField(source.value, lineNumber, structuralField, event.target.value));
    return;
  }
  const flowAnnotationLine = Number(event.target.dataset.flowAnnotationLine);
  if (flowAnnotationLine) {
    if (event.target.matches("[data-flow-annotation-text]")) {
      setSource(setAnnotationText(source.value, flowAnnotationLine, event.target.value));
      return;
    }
    if (event.target.matches("[data-flow-annotation-hidden]")) {
      setSource(event.target.checked
        ? setStructuralField(source.value, flowAnnotationLine, "hidden", "")
        : removeDeclarationField(source.value, flowAnnotationLine, "hidden"));
      return;
    }
    const field = event.target.dataset.flowAnnotationField;
    if (field) {
      setSource(event.target.value === ""
        ? removeDeclarationField(source.value, flowAnnotationLine, field)
        : setStructuralField(source.value, flowAnnotationLine, field, event.target.value));
      return;
    }
  }
  const shadowScope = event.target.dataset.shadowToggle;
  if (shadowScope === "line" || shadowScope === "graph") {
    const value = event.target.checked ? "#000000" : "transparent";
    const targets = shadowScope === "line"
      ? selectedEdges().map((edge) => edge.lineNumber)
      : selections.filter((item) => item.kind === "graph").map((item) => item.lineNumber);
    let nextSource = source.value;
    [...new Set(targets)].sort((a, b) => b - a).forEach((lineNumber) => {
      nextSource = setStructuralField(nextSource, lineNumber, "shadow-color", value);
    });
    if (nextSource !== source.value) setSource(nextSource);
    return;
  }
  if (event.target.matches("[data-graph-type]")) {
    const selection = selections.find((item) => item.kind === "graph");
    const group = currentGraph.groups.find((candidate) => candidate.id === selection?.id);
    if (!group) return;
    setSource(setGraphType(source.value, group.lineNumber, event.target.value, reusableNames("graph")));
    return;
  }
  const lineEndpoint = event.target.dataset.lineEndpoint;
  if (lineEndpoint) {
    const edge = selectedEdges()[0];
    if (!edge) return;
    const endpoint = event.target.value.trim();
    if (!flowEndpointNodes(edge).some((node) => node.id === endpoint)) { renderInspector(); return; }
    const from = lineEndpoint === "from" ? endpoint : edge.from;
    const to = lineEndpoint === "to" ? endpoint : edge.to;
    if (from === to) { renderInspector(); return; }
    selections = [{ kind: "line", from, to, lineNumber: edge.lineNumber, selectionKey: `line:${from}:${to}:${edge.lineNumber}`, additive: false }];
    setSource(setStructuralField(source.value, edge.lineNumber, lineEndpoint, endpoint));
    return;
  }
  const lineFace = event.target.dataset.lineFace;
  if (lineFace) {
    const edge = selectedEdges()[0];
    if (!edge) return;
    const nextSource = event.target.value
      ? setStructuralField(source.value, edge.lineNumber, lineFace, event.target.value)
      : removeDeclarationField(source.value, edge.lineNumber, lineFace);
    setSource(nextSource);
    return;
  }
  const connectedField = event.target.dataset.connectedField;
  if (connectedField) {
    const [from, to, line] = event.target.dataset.connectedEdge.split("|");
    const edge = diagram.layout.edges.find((candidate) => candidate.from === from && candidate.to === to && candidate.lineNumber === Number(line));
    if (!edge) return;
    const nextSource = setStructuralField(source.value, edge.lineNumber, connectedField, event.target.value);
    setSource(nextSource);
    return;
  }
  const graphField = event.target.dataset.graphField;
  if (graphField) {
    if (graphField === "id") {
      const selection = selections.find((item) => item.kind === "graph");
      const group = currentGraph.groups.find((candidate) => candidate.id === selection?.id);
      const requestedId = event.target.value.trim();
      if (!group || !event.target.checkValidity()) { event.target.reportValidity(); return; }
      if (currentGraph.groups.some((candidate) => candidate !== group && candidate.id === requestedId)) {
        event.target.setCustomValidity("This graph ID is already in use.");
        event.target.reportValidity();
        event.target.setCustomValidity("");
        return;
      }
      let nextSource = setStructuralField(source.value, group.lineNumber, "id", requestedId);
      nextSource = renameGraphReferences(nextSource, group.id, requestedId);
      selections = selections.map((item) => item.kind === "graph" && item.id === group.id
        ? { ...item, id: requestedId, selectionKey: `graph:${requestedId}` }
        : item);
      setSource(nextSource);
      return;
    }
    if (graphField === "layer-order") {
      const selectedIds = new Set(selections.filter((item) => item.kind === "graph").map((item) => item.id));
      const ordered = [...currentGraph.groups]
        .sort((a, b) => (b.layer ?? 0) - (a.layer ?? 0) || b.sourceIndex - a.sourceIndex)
        .map((group) => group.id);
      const selected = ordered.filter((id) => selectedIds.has(id));
      const others = ordered.filter((id) => !selectedIds.has(id));
      applyGraphLayerOrder(event.target.value === "front" ? [...selected, ...others] : [...others, ...selected]);
      return;
    }
    let nextSource = source.value;
    [...selections].filter((item) => item.kind === "graph").sort((a, b) => b.lineNumber - a.lineNumber)
      .forEach((selection) => {
        nextSource = event.target.value === ""
          ? removeDeclarationField(nextSource, selection.lineNumber, graphField)
          : setStructuralField(nextSource, selection.lineNumber, graphField, event.target.value);
      });
    setSource(nextSource);
    return;
  }
  if (event.target.matches("[data-graph-hidden]")) {
    let nextSource = source.value;
    [...selections].filter((item) => item.kind === "graph").sort((a, b) => b.lineNumber - a.lineNumber)
      .forEach((selection) => { nextSource = setStructuralField(nextSource, selection.lineNumber, "hidden", event.target.checked ? "" : "false"); });
    setSource(nextSource);
    return;
  }
  if (event.target.matches("[data-node-layer-order]")) {
    if (!event.target.value) return;
    const selectedIds = new Set(selections.filter((item) => item.kind === "node").map((item) => item.id));
    const orders = currentGraph.groups.map((group) => {
      const ordered = group.nodeIds.map((id) => currentGraph.nodes.find((node) => node.id === id)).filter(Boolean)
        .sort((a, b) => (b.layer ?? 0) - (a.layer ?? 0) || (b.sourceIndex ?? 0) - (a.sourceIndex ?? 0))
        .map((item) => item.id);
      return moveSelectedLayers(ordered, selectedIds, event.target.value);
    }).filter((order) => order.some((id) => selectedIds.has(id)));
    applyNodeLayerOrders(orders);
    return;
  }
  if (event.target.matches("[data-arrange-select]")) {
    if (event.target.value) arrangeSelection(event.target.value);
    return;
  }
  if (event.target.matches("[data-color-picker]")) {
    const textInput = inspectorQuery(`[data-color-text="${event.target.dataset.colorPicker}"]`);
    if (textInput) { textInput.value = event.target.value; textInput.dispatchEvent(new Event("change", { bubbles: true })); }
    return;
  }
  if (event.target.matches("[data-annotation-color-picker]")) {
    const input = inspectorQuery(`[data-annotation-line="${event.target.dataset.annotationColorPicker}"][data-annotation-style-field="color"]`);
    if (input) { input.value = event.target.value; input.dispatchEvent(new Event("change", { bubbles: true })); }
    return;
  }
  if (event.target.matches("[data-node-annotation-color-picker]")) {
    const lineNumber = event.target.dataset.nodeAnnotationColorPicker;
    const input = inspectorQuery(`[data-annotation-line="${lineNumber}"][data-node-annotation-field="color"]`);
    if (input) { input.value = event.target.value; input.dispatchEvent(new Event("change", { bubbles: true })); }
    return;
  }
  if (event.target.matches("[data-node-annotation-text]")) {
    setSource(setAnnotationText(source.value, Number(event.target.dataset.annotationLine), event.target.value));
    return;
  }
  if (event.target.matches("[data-node-annotation-field]")) {
    setSource(setStructuralField(source.value, Number(event.target.dataset.annotationLine), event.target.dataset.nodeAnnotationField, event.target.value));
    return;
  }
  if (event.target.matches("[data-node-annotation-position]")) {
    setSource(setAnnotationPosition(source.value, Number(event.target.dataset.annotationLine), event.target.value));
    return;
  }
  if (event.target.matches("[data-node-annotation-hidden]")) {
    const annotationLine = Number(event.target.dataset.annotationLine);
    const nextSource = event.target.checked
      ? setStructuralField(source.value, annotationLine, "hidden", "")
      : removeDeclarationField(source.value, annotationLine, "hidden");
    if (nextSource !== source.value) setSource(nextSource);
    return;
  }
  if (event.target.matches("[data-node-annotations-hidden]")) {
    let nextSource = source.value;
    [...nodes[0].annotations].sort((a, b) => b.lineNumber - a.lineNumber).forEach((annotation) => {
      nextSource = event.target.checked
        ? setStructuralField(nextSource, annotation.lineNumber, "hidden", "")
        : removeDeclarationField(nextSource, annotation.lineNumber, "hidden");
    });
    if (nextSource !== source.value) setSource(nextSource);
    return;
  }
  if (event.target.matches("[data-annotation-text]")) {
    setSource(setAnnotationText(source.value, Number(event.target.dataset.annotationText), event.target.value));
    return;
  }
  if (event.target.matches("[data-annotation-style-field]")) {
    setSource(setStructuralField(source.value, Number(event.target.dataset.annotationLine), event.target.dataset.annotationStyleField, event.target.value));
    return;
  }
  if (event.target.matches("[data-shadow-toggle]")) {
    let nextSource = source.value;
    [...nodes].sort((a, b) => b.lineNumber - a.lineNumber).forEach((selected) => {
      nextSource = setNodeField(nextSource, selected.lineNumber, "shadow-color", event.target.checked ? "#000000" : "transparent");
    });
    setSource(nextSource);
    return;
  }
  if (event.target.matches("[data-node-hidden]")) {
    let nextSource = source.value;
    [...nodes].sort((a, b) => b.lineNumber - a.lineNumber).forEach((selected) => {
      nextSource = event.target.checked ? setNodeField(nextSource, selected.lineNumber, "hidden", "") : removeNodeField(nextSource, selected.lineNumber, "hidden");
    });
    setSource(nextSource);
    return;
  }
  if (event.target.matches("[data-node-type]") && node) {
    if (!event.target.value) return;
    let nextSource = source.value;
    [...nodes].sort((a, b) => b.lineNumber - a.lineNumber).forEach((selected) => { nextSource = setNodeType(nextSource, selected.lineNumber, event.target.value, reusableNames("node")); });
    setSource(nextSource);
    return;
  }
  if (event.target.matches("[data-node-graph]") && node) {
    const targetGraph = currentGraph.groups.find((group) => group.id === event.target.value);
    const currentNodeGraph = graphForNode(node.id);
    if (!targetGraph || targetGraph.id === currentNodeGraph?.id) return;
    let nextSource = source.value;
    let movingNode = node;
    if (!movingNode.explicitId) {
      nextSource = setNodeField(nextSource, movingNode.lineNumber, "id", movingNode.id);
      movingNode = parseDiagram(nextSource, cssSource).nodes.find((candidate) => candidate.id === node.id);
    }
    const parsed = parseDiagram(nextSource, cssSource);
    const parsedTarget = parsed.groups.find((group) => group.id === targetGraph.id);
    nextSource = moveNodeToGraph(nextSource, movingNode.lineNumber, parsedTarget.lineNumber);
    setSource(reconcileFlowScopes(nextSource));
    return;
  }
  const annotationField = event.target.dataset.annotationField;
  if (event.target.matches("[data-selected-annotation-text]")) {
    let nextSource = source.value;
    [...selections].filter((item) => item.kind === "annotation").sort((a, b) => b.lineNumber - a.lineNumber)
      .forEach((selection) => { nextSource = setAnnotationText(nextSource, selection.lineNumber, event.target.value); });
    setSource(nextSource);
    return;
  }
  if (annotationField) {
    let nextSource = source.value;
    [...selections].filter((item) => item.kind === "annotation").sort((a, b) => b.lineNumber - a.lineNumber)
      .forEach((selection) => { nextSource = setStructuralField(nextSource, selection.lineNumber, annotationField, event.target.value); });
    setSource(nextSource);
    return;
  }
  const nodeField = event.target.dataset.nodeField;
  if (nodeField && node) {
    if (nodeField === "id") {
      const requestedId = event.target.value.trim();
      if (requestedId && !event.target.checkValidity()) { event.target.reportValidity(); return; }
      const nodeIndex = currentGraph.nodes.findIndex((candidate) => candidate.id === node.id);
      let nextSource = requestedId
        ? setNodeField(source.value, node.lineNumber, "id", requestedId)
        : removeNodeField(source.value, node.lineNumber, "id");
      const reparsed = parseDiagram(nextSource, cssSource);
      const nextId = reparsed.nodes[nodeIndex]?.id;
      if (nextId) {
        nextSource = renameNodeReferences(nextSource, node.id, nextId);
        selections = selections.map((selection) => selection.kind === "node" && selection.id === node.id
          ? { ...selection, id: nextId, selectionKey: `node:${nextId}` }
          : selection);
      }
      setSource(nextSource);
      return;
    }
    if (!event.target.value && nodeField !== "label") return;
    let nextSource = source.value;
    [...nodes].sort((a, b) => b.lineNumber - a.lineNumber).forEach((selected) => {
      nextSource = setNodeField(nextSource, selected.lineNumber, nodeField, event.target.value);
    });
    setSource(nextSource);
    return;
  }
  const lineField = event.target.dataset.lineField;
  if (event.target.matches("[data-line-hidden], [data-line-annotation-hidden], [data-line-annotations-hidden]")) {
    const fields = event.target.matches("[data-line-hidden]")
      ? ["hidden"]
      : event.target.matches("[data-line-annotations-hidden]")
        ? ["annotation-above-hidden", "annotation-below-hidden"]
        : [event.target.dataset.lineAnnotationHidden];
    const operations = selections.filter((item) => item.kind === "line").map((item) => {
      const selectedEdge = diagram.layout.edges.find((candidate) => candidate.from === item.from && candidate.to === item.to && (!item.lineNumber || candidate.lineNumber === item.lineNumber));
      return { edge: selectedEdge, lineNumber: selectedEdge.lineNumber };
    }).sort((a, b) => b.lineNumber - a.lineNumber);
    let nextSource = source.value;
    operations.forEach(({ edge: selectedEdge, lineNumber }) => {
      fields.forEach((field) => {
        nextSource = event.target.checked
          ? setStructuralField(nextSource, lineNumber, field, "")
          : removeDeclarationField(nextSource, lineNumber, field);
      });
    });
    setSource(nextSource);
    return;
  }
  if (event.target.matches("[data-line-type]")) {
    const lineType = event.target.value;
    if (!lineType) return;
    const knownTypes = [...`${pugSource}\n${cssSource}`.matchAll(/^@flow\s+([\w-]+)/gm)].map((match) => match[1]);
    const operations = selections.filter((item) => item.kind === "line").map((item) => {
      const edge = diagram.layout.edges.find((candidate) => candidate.from === item.from && candidate.to === item.to && (!item.lineNumber || candidate.lineNumber === item.lineNumber));
      return { edge, lineNumber: edge.lineNumber };
    }).sort((a, b) => b.lineNumber - a.lineNumber);
    let nextSource = source.value;
    operations.forEach(({ lineNumber }) => { nextSource = setStructuralLineType(nextSource, lineNumber, lineType, knownTypes); });
    setSource(nextSource);
    return;
  }
  if (!lineField) return;
  if (lineField === "id" && event.target.value && !event.target.checkValidity()) { event.target.reportValidity(); return; }
  const operations = selections.filter((item) => item.kind === "line").map((item) => {
    const edge = diagram.layout.edges.find((candidate) => candidate.from === item.from && candidate.to === item.to && (!item.lineNumber || candidate.lineNumber === item.lineNumber));
    return { edge, lineNumber: edge.lineNumber };
  }).sort((a, b) => b.lineNumber - a.lineNumber);
  let nextSource = source.value;
  operations.forEach(({ lineNumber }) => {
    nextSource = lineField === "id" && !event.target.value.trim()
      ? removeDeclarationField(nextSource, lineNumber, lineField)
      : setStructuralField(nextSource, lineNumber, lineField, event.target.value);
  });
  setSource(nextSource);
};
inspectorContent.addEventListener("change", handleInspectorChange);
sidecarContent.addEventListener("change", handleInspectorChange);

let inspectorDrag = null;
function constrainInspectorToCanvas() {
  if (inspector.hidden) { closeSidecar(); return; }
  const canvasBounds = canvasShell.getBoundingClientRect();
  const margin = 12;
  inspector.style.maxWidth = `${Math.max(0, canvasBounds.width - margin * 2)}px`;
  inspector.style.maxHeight = `${Math.max(0, canvasBounds.height - margin * 2)}px`;
  const inspectorBounds = inspector.getBoundingClientRect();
  const minLeft = canvasBounds.left + margin;
  const minTop = canvasBounds.top + margin;
  const maxLeft = Math.max(minLeft, canvasBounds.right - inspectorBounds.width - margin);
  const maxTop = Math.max(minTop, canvasBounds.bottom - inspectorBounds.height - margin);
  const currentLeft = inspector.style.left ? inspectorBounds.left : maxLeft;
  const currentTop = inspector.style.top ? inspectorBounds.top : minTop;
  inspector.style.left = `${Math.max(minLeft, Math.min(maxLeft, currentLeft))}px`;
  inspector.style.top = `${Math.max(minTop, Math.min(maxTop, currentTop))}px`;
  inspector.style.right = "auto";
  positionSidecar();
}

document.querySelector(".inspector-drag-handle").addEventListener("pointerdown", (event) => {
  const bounds = inspector.getBoundingClientRect();
  inspectorDrag = { pointerId: event.pointerId, dx: event.clientX - bounds.left, dy: event.clientY - bounds.top };
  event.target.setPointerCapture(event.pointerId);
});
document.querySelector(".inspector-drag-handle").addEventListener("pointermove", (event) => {
  if (!inspectorDrag || inspectorDrag.pointerId !== event.pointerId) return;
  const canvasBounds = canvasShell.getBoundingClientRect();
  const margin = 12;
  const minLeft = canvasBounds.left + margin;
  const minTop = canvasBounds.top + margin;
  const maxLeft = Math.max(minLeft, canvasBounds.right - inspector.offsetWidth - margin);
  const maxTop = Math.max(minTop, canvasBounds.bottom - inspector.offsetHeight - margin);
  const left = Math.max(minLeft, Math.min(maxLeft, event.clientX - inspectorDrag.dx));
  const top = Math.max(minTop, Math.min(maxTop, event.clientY - inspectorDrag.dy));
  inspector.style.left = `${left}px`;
  inspector.style.top = `${top}px`;
  inspector.style.right = "auto";
  positionSidecar();
});
document.querySelector(".inspector-drag-handle").addEventListener("pointerup", () => { inspectorDrag = null; });
new ResizeObserver(constrainInspectorToCanvas).observe(canvasShell);
window.addEventListener("resize", constrainInspectorToCanvas);
document.querySelector("#load-source").addEventListener("click", async () => {
  if (!window.showOpenFilePicker) { sourceFile.click(); return; }
  try {
    const handles = await window.showOpenFilePicker({
      multiple: true,
      types: [{ description: "Pugflow source", accept: { "text/plain": [".pug"], "text/css": [".css"] } }],
    });
    await loadSourceFiles(await Promise.all(handles.map((handle) => handle.getFile())), handles);
  } catch (error) {
    if (error?.name !== "AbortError") {
      status.textContent = `Could not open file: ${error.message}`;
      status.className = "status error";
    }
  }
});
sourceFile.addEventListener("change", async () => {
  const files = [...(sourceFile.files ?? [])];
  if (!files.length) return;
  await loadSourceFiles(files);
  sourceFile.value = "";
});
function populateExportTargets(select) {
  select.replaceChildren(new Option("Entire canvas", ""), ...(currentGraph?.groups ?? []).map((group) => new Option(group.label || group.id, group.id)));
}

function configureExportDialog(prefix) {
  const dialog = document.querySelector(`#${prefix}-export-dialog`);
  const format = document.querySelector(`#${prefix}-export-format`);
  const dpiRow = document.querySelector(`#${prefix}-export-dpi-row`);
  const target = document.querySelector(`#${prefix}-export-target`);
  document.querySelector(`#open-${prefix}-export`).addEventListener("click", () => {
    populateExportTargets(target);
    target.value = "";
    dialog.showModal();
  });
  format.addEventListener("change", () => { dpiRow.hidden = format.value !== "png"; });
  return { dialog, format, target, dpi: document.querySelector(`#${prefix}-export-dpi`) };
}

const copyExport = configureExportDialog("copy");
document.querySelector("#copy-export-form").addEventListener("submit", async (event) => {
  if (event.submitter?.value === "cancel" || !diagram) return;
  event.preventDefault();
  try {
    const graphId = copyExport.target.value;
    const svg = copyExport.format.value === "svg";
    const type = svg ? "image/svg+xml" : "image/png";
    const blob = svg
      ? new Blob([diagram.toSVGString(graphId)], { type })
      : await diagram.toPNGBlob(Number(copyExport.dpi.value) / 96, graphId);
    await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
    copyExport.dialog.close();
    showCanvasToast(`${svg ? "SVG" : "PNG"} ${graphId ? "graph" : "canvas"} copied to clipboard`);
  } catch (error) {
    status.textContent = `Could not copy export: ${error.message}`;
    status.className = "status error";
  }
});
const saveExportDialog = document.querySelector("#save-export-dialog");
const saveExportFormat = document.querySelector("#save-export-format");
const saveExportDpi = document.querySelector("#save-export-dpi");
const saveExport = configureExportDialog("save");
document.querySelector("#save-export-form").addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel" || !diagram) return;
  event.preventDefault();
  const graphId = saveExport.target.value;
  if (saveExportFormat.value === "svg") diagram.saveSVG(exportFilename("svg", graphId), graphId);
  else diagram.savePNG(exportFilename("png", graphId), Number(saveExportDpi.value) / 96, graphId);
  saveExportDialog.close();
});

updateSourceFileNames();
activateDocument(activeDocument, true);
window.addEventListener("pugflow-math-ready", update);
