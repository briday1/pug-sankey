# Pugflow

A source-first diagram editor and command-line renderer. Diagrams stay editable as readable `.pug` files, reusable presentation can live in a `.css` file, and SVG/PNG are export formats.

**[Try the online editor on GitHub Pages →](https://briday1.github.io/pugflow/)**

## Install as a Python application

For development, install the checkout in editable mode:

```powershell
python -m pip install -e .
pugflow
```

The installed command opens the editor. Add `--vim` to begin in Vim mode:

```powershell
python -m pugflow --vim
```

The server opens <http://127.0.0.1:4173> automatically. Examples of server options:

```powershell
pugflow --no-browser
pugflow --host 0.0.0.0 --port 8080 --vim
pugflow --demo                  # demo 1
pugflow --demo 7                # choose any demo from 1–10
pugflow --gui diagram.pug --css diagram.css
pugflow --version
```

Render directly from the command line. Pugflow uses an installed Edge, Chrome, or Chromium browser for exact parity with the editor; set `PUGFLOW_BROWSER` when it is not discovered automatically.

```powershell
pugflow diagram.pug
pugflow diagram.pug --css styles.css --output diagram.png --scale 2
```

`GET /healthz` returns server status and version as JSON.

The compact application toolbar groups source and export actions under **File**, canvas creation under **New**, and theme and Vim controls under **Settings**. Click **Pugflow** for the installed version and links to the repository, PyPI, and documentation. Reusable styles use CSS-shaped rules:

```css
@node card {
  shape: rounded;
  fill: #ffffff;
  outline: #94a3b8;
}

@flow warning {
  color: #dc2626;
  stroke-style: dashed;
}
```

The editor opens with truly blank source; the canvas is always implied. Use `pugflow --demo` for the full feature tour, or `pugflow --demo N` to open any of 10 examples spanning architecture, hiring, storytelling, recipes, family trees, roadmaps, science, math, travel, and home networking. The same examples are available in a hosted editor with `?demo=1` through `?demo=10`. The editor provides live rendering, line numbers, highlighting, completions, a **File** menu for new/open/save actions using system files, a collapsible source panel, high-DPI PNG clipboard copying, and image export dialogs. A project requires one Pug file. CSS is optional unless the Pug uses custom classes such as `.card`; select both files in the Open dialog or create CSS from the File menu. Each source tab shows its loaded filename. Source is not stored in the browser.

Drag the divider beside the source panel to resize it; the width is remembered.
Click any visible block in the preview to focus and select its corresponding source line.
Enable **Vim mode** from **Settings** for Normal, Insert, and Visual modes. It starts off on every launch and supports standard movement, editing, yanking, pasting, marks, and undo/redo commands. Escape, Ctrl+[ and Ctrl+C return to Normal mode.

## Basic Pug definition

```pug
graph
  .id main
  node
    .id root
    .label Root
  node
    .id left
    .label Left path
  node
    .id right
    .label Right path
  flow
    .from root
    .to left
    .arrow-style forward
  flow
    .from root
    .to right
```

The common structure is intentionally small:

- The canvas is implied; an empty file is a valid empty canvas. Put canvas settings and sibling `graph` components directly at the source root. Graphs never nest.
- Nodes are declared directly inside their graph and have explicit IDs when flows reference them.
- Every connection is an explicit bare `flow` with `.from` and `.to`.
- Put a flow inside a graph when both endpoints belong to that graph. Put cross-graph flows directly at the source root.
- Flow style fields such as `.color`, `.label`, and `.arrow-style` are dotted properties directly beneath `flow`; there is no nested `.line` group.
- Blank lines and `//` comment lines are ignored.

For a long pipeline, declare each node and each connection at graph level:

```pug
graph
  node
    .id start
    .label Start
  node
    .id validate
    .label Validate
  node
    .id publish
    .label Publish
  flow
    .from start
    .to validate
  flow
    .from validate
    .to publish
```

This creates `Start -> Validate -> Publish`. A reusable flow class or local properties on each `flow` style the connector.

Flows accept `.direction right`, `.direction left`, `.direction up`, or `.direction down`. Multiple flows may start at the same node—even in the same direction. Multiple outgoing flows are rendered as branches and multiple incoming flows are rendered as a merge. The layout assigns competing paths separate lanes so their nodes do not overlap. Arrowheads are controlled independently with `.arrow-style`.

```pug
graph
  node
    .id dispatcher
    .label Dispatcher
  node
    .id main
    .label Main work
  node
    .id audit
    .label Audit work
  flow
    .from dispatcher
    .to main
    .direction right
  flow
    .from dispatcher
    .to audit
    .direction down
```

Each node face accepts its own port setting: `.top-ports`, `.right-ports`, `.bottom-ports`, and `.left-ports`. Use `shared` (the default) to attach connections at the face center or `distributed` to space them uniformly.

```pug
node
  .id source-id
  .right-ports distributed
  .label Source
```

## Reusable style classes

Define a styled node type at the source root, then apply it by nesting its dotted class inside a bare `node` declaration, exactly as flows nest `.warning_flow` inside bare `flow`. It inherits the canvas node defaults and overrides only the properties in its definition. Legacy dotted structural declarations still parse so existing documents keep working.

```pug
@node my_node
  .shape pill
  .fill #245886
  .color #ffffff

@flow warning_flow
  .color #ef4444
  .stroke-style dashed

@annotation warning_note
  .color #f59e0b

.defaults
  node
    .outline #111111
graph
  node
    .my_node
    .id root
    .label Reusable styled node
    .annotation
      .above
        .warning_note
        | Styled annotation
  node
    .id child
    .label Child
  flow
    .from root
    .to child
    .warning_flow
```

Reusable definitions create dotted classes such as `.my_node`, `.warning_flow`, and `.warning_note`. Nest the class inside bare `node`, bare `flow`, or the annotation entry it styles. Local properties override the reusable style, and properties nested under the class itself override it too. Names must be unique across node, flow, and annotation definitions.

The complete original definition is preserved in [examples/original.pug](examples/original.pug).

## ID-based flows

Give nodes IDs, then use the same bare `flow` keyword for convergence, feedback, cross-graph links, or a target that appears later in the source:

```pug
graph
  node
    .id api
    .label API
  node
    .id cache
    .label Cache
  node
    .id result
    .label Result
    .annotation
      .above Paths converge here
    .shape hexagon
  flow
    .from api
    .to result
    .label live
  flow
    .from cache
    .to result
    .label hit
```

The parser resolves `.from` and `.to` after reading all nodes, so either endpoint may appear before or after the flow declaration. When several flows share a target, Pugflow automatically applies convergence layout and distributed merge routing.

For a feedback path, specify the endpoint directions independently:

```pug
flow
  .from archived
  .from-direction left
  .to styled-text
  .to-direction up
  .label feedback
```

The source and target must have explicit `.id` fields, but may appear before or after the flow declaration. `.from-direction` controls how the flow leaves the source; `.to-direction` independently controls how it enters the target.

## Figure defaults

Pugflow has a small built-in rendering theme: white background with black blocks, text, annotations, and connections. Project CSS is optional and additive. Put per-document defaults directly at the source root:

```pug
.background #fffaf0
.font Arial
.defaults
  node
    .shape rounded
    .fill #ffffff
    .color #202020
    .outline-width 2
    .align center
  flow
    .color #303030
  .annotation
    .color #606060
graph
  node
    .label Root
```

`.background`, `.font`, and `.defaults` belong directly at the source root. Reusable node, flow, and annotation defaults are grouped under `.defaults`. Direct dotted properties on a bare `flow` override inherited defaults. Legacy files containing dotted structural declarations or an explicit `#canvas` or `#diagram` root remain supported, but new source and editor actions emit bare structure.

## Block options

Node identity, text, layout, and appearance use separate readable fields. For easy scanning, keep them in that order:

```pug
node
  .id service
  .layer 1
  .label
    | Service name
    | A clear multiline description
  .width 220
  .height auto
  .align left
  .vertical-align middle
  .shape pill
  .fill #1e4f7a
  .color #ffffff
  .outline #93c5fd
  .outline-style dashed
  .outline-width 3
```

Supported options:

| Field | Values |
| --- | --- |
| `.id` | A letter followed by letters, numbers, `_`, or `-` |
| `.layer` | Optional integer override; otherwise declaration order sets stacking within the graph |
| `.label` | Inline text, or indented `|` lines for explicit multiline text |
| `.shape` | `square`, `round`, `rounded`, `pill`, `diamond`, `hexagon` |
| `.fill`, `.color`, `.outline` | Any SVG/CSS color |
| `.outline-style` | `solid`, `dashed`, `dotted` |
| `.outline-width` | Number, in SVG pixels |
| `.width`, `.height` | Number or `auto` |
| `.align` | `left`, `center`, `right` |
| `.vertical-align` | `top`, `middle`, `bottom` |

Auto-sized blocks measure their content, wrap long labels, and grow vertically. Indented `|` lines create intentional line breaks and keep longer descriptions readable in the source. The old escaped-`\n` form is not supported.

## Block annotations

Place any number of annotations above or below a node:

```pug
node
  .label Controller
  .annotation
    .above
      .color #bfdbfe
      | Control plane
      | Handles orchestration
    .below Optional subsystem
```

## Hide items without changing layout

Add `.hidden` beside the node's other fields:

```pug
node
  .annotation
    .above Removed in the after diagram
  .id legacy
  .hidden
  .label Legacy service
```

The block still participates in measurement and layout, so every other block keeps the exact same position. The hidden block, its annotations, and all incoming/outgoing connections (including their labels and arrowheads) are omitted.

## Click, locate, and manually offset

Click a block, block label, annotation, connection, or connection label in the preview to select its exact declaration in the editor. Drag boxes and text when the automatic result needs a visual nudge; the editor writes the resulting offsets back into the source. A translucent ghost marks the original position while dragging. Hold Cmd on macOS or Ctrl on other platforms to constrain movement to the dominant horizontal or vertical axis; Shift remains supported as an alternative.

Selecting a node or flow also opens the canvas inspector. Ctrl-click (Cmd-click on macOS) toggles additional items into the selection. The inspector shows only controls applicable to every selected item. Every inspector operation edits the Pug source directly.

Graphs are packed without overlap by default. Graph titles support `.label-position inside|outside`, horizontal `.align left|center|right`, vertical `.vertical-align top|middle|bottom`, `.label-offset (x, y)`, `.color`, and the standard font fields. The defaults are inside, horizontally centered, and at the top. Drag a graph title to write its `.label-offset`. Use `.x-spacing` and `.y-spacing` to tune a graph's layout. Drag a graph to write its `.offset`; explicit offsets may overlap graph frames. **Clean Up** removes small accidental flow kinks within and between graphs while preserving deliberate bends; cross-graph corrections translate whole graphs rather than altering their internal layouts. Set `.layer 1` (or any integer) in source, use the inspector's **Graph Layer** selector, or reorder graphs in the collapsible **Graphs** section of the right-side **Graphs** panel. Higher layers render in front and equal layers retain source order. A flow renders at the higher layer of its two endpoint graphs, so it remains visible over both endpoints but may be obscured by an unrelated graph on a higher layer. Choose a graph in that panel to browse its nodes and flows; selecting an item opens its normal property inspector. The node list is ordered front to back. Initially, node declaration order determines that stacking without adding `.layer` fields. Dragging nodes or using **Node Layer** to send selected nodes to the front or back persists explicit `.layer` values in the source.

The **Node** builder adds an independent node to the chosen graph. The **Flow** builder places graph-filtered **From** and **To** endpoints side by side with independent directions.

Use **+ New** above the canvas to add a Graph, Node, Image, or Flow without hand-writing its initial structure. Branching, merging, and feedback are inferred from explicit flows. Images and nodes can both be flow endpoints. **Add Connected Node** in a selected node's inspector creates and connects a new node above, below, left, or right; **Add Flow** connects existing objects. These actions insert ordinary Pug; the source remains the single editable representation.

- Dragging a box writes `.offset (x, y)` inside its node.
- Dragging its label writes `.label-offset (x, y)` inside its node.
- Dragging an image writes `.offset (x, y)` on its standalone declaration.
- Dragging a block annotation writes an indented `.offset (x, y)` field.
- Dragging a flow label writes `.label-offset (x, y)` directly inside its `flow` declaration.

Offsets affect only the rendered position. The node's automatic layout slot remains fixed.

Use **Clean up** above the canvas after manual positioning to align connected flow nodes and collapse unnecessary bends. It writes corrected `.offset` tuples back into the source without changing flow faces or moving untouched sibling branches.

Nodes support SVG drop shadows through `.shadow-color`, `.shadow-offset-x`, `.shadow-offset-y`, `.shadow-blur`, and `.shadow-opacity`. A shadow is enabled when `shadow-color` is present; these fields work in `@node` definitions, diagram defaults, local nodes, and the canvas inspector.

Images are standalone graph objects rather than node contents. They have no label, retain above/below annotations, and can be used in `.from` and `.to` just like nodes. Use `.source` for a URL or file location, or browse for a local image in the inspector. `.fit` accepts `contain`, `cover`, or `fill`; `.opacity` controls the image, and `.padding` adds optional space between it and its border. Padding defaults to zero. The border and fill default to transparent, and the fill is rendered over the image so translucent overlays are possible. Nodes default to black borders and transparent fills.

```pug
image
  .id profile
  .source photos/sample.png
  .width 72
  .height 72
  .fit cover
  .annotation
    .below Profile
```

## Flows, arrows, and annotations

Set appearance and annotation properties directly on a bare `flow`. Use a reusable `@flow` class when several flows need identical styling.

```pug
flow
  .from service-a
  .to service-b
  .arrow-style both
  .stroke-style dashed
  .color #ffffff
  .width 3
  .annotation-above synchronizes
  .annotation-below retry path
```

| Field | Values |
| --- | --- |
| `.arrow-style` | `forward` (default), `backward`, `both`, `none` |
| `.color` | Any SVG/CSS color |
| `.stroke-style` | `solid`, `dashed`, `dotted` |
| `.width` | Positive number |
| `.annotation-above` | Annotation above the flow |
| `.annotation-below` | Annotation below the flow |
| `.annotation-above-hidden`, `.annotation-below-hidden` | Hide either annotation independently |
| `.label-offset` | Manual `(x, y)` offset |

## Math

Use `$...$` for inline math and `$$...$$` for a display equation on its own line. Pugflow uses a bundled MathJax renderer to produce real TeX as SVG paths, including in nodes, node annotations, and connection annotations. Equation dimensions participate in node sizing and diagram layout, and SVG/PNG/CLI exports remain self-contained and offline.

```pug
node
  .label Transfer $x_i^2 \\rightarrow y_i$
```

Display math can be mixed with ordinary multiline labels:

```pug
.label
  | Quadratic formula
  | $$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$
```

## Embed in another page

Copy the files in `src/pugflow/web/`, then:

```html
<link rel="stylesheet" href="./pugflow.css">
<div id="diagram"></div>

<script type="module">
  import { createBlockDiagram } from "./pugflow.mjs";

  const source = `graph
    node
      .label Root
    node
      .label Child`;

  const diagram = createBlockDiagram(document.querySelector("#diagram"), source);
  diagram.render(updatedSource);
  diagram.saveSource("architecture.pug");
  diagram.saveSVG("architecture.svg");
  await diagram.savePNG("architecture.png", 2);
</script>
```

The returned object exposes `render(source)`, `toSVGString()`, `saveSource(filename)`, `saveSVG(filename)`, and `savePNG(filename, scale)`.

## Theme and layout

Saved Pug figure defaults are usually the most portable option. You can still override CSS properties on the diagram container for an embedded diagram:

```css
#diagram {
  --diagram-background: #2e6ba7;
  --diagram-label: #eee9dc;
  --diagram-text: #eee9dc;
  --diagram-merge: #ffd166;
  --diagram-annotation: #dbeafe;
  --diagram-font: Verdana, sans-serif;
}
```

Pass layout spacing when creating the diagram:

```js
createBlockDiagram(element, source, {
  layout: { horizontalGutter: 120, verticalGutter: 36, padding: 60 },
});
```

## Project layout

```text
src/pugflow/
  cli.py                 Python command-line interface
  server.py              HTTP server and health endpoint
  web/                   Browser application and reusable ES modules
tests/
  python/                Server tests
  js/                    Parser, layout, and math tests
examples/                Loadable Pug diagram definitions
dist/                    Generated PyInstaller output (gitignored)
```

The browser source under `web/` is package data and is served directly as ES modules. There is no generated JavaScript bundle or frontend build step.

## Build a standalone executable

The included PyInstaller spec embeds the web frontend alongside the Python server:

```powershell
python -m pip install pyinstaller
pyinstaller pugflow.spec
```

The resulting `dist/pugflow.exe` runs the same web application and opens it in the default browser. PyInstaller is a build-time dependency only; it is not required by the installed application.

## Tests

```powershell
node --test tests/js
python -m unittest tests.python.test_server -v
```

The optional JavaScript tests use the Node.js 18+ built-in runner directly; no npm project or packages are involved. Python server tests use only the standard library. The application itself has no third-party runtime dependencies.
