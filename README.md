# Pug Sankey

A source-first **flow diagram** editor and command-line renderer. Diagrams stay editable as readable `.pug` files, and SVG/PNG are export formats. Solid ribbons gather into shared trunks and separate into branches, ending in pointed destination silhouettes. Ribbon width represents quantity on one common linear scale. There are no interior carets or striped strands.

The plotting engine is implemented here in `flow-layout.mjs` and `flowfield.mjs`, with connectivity tracing in `flow-fabric.mjs`. Hover or keyboard-focus a branch to trace its upstream and downstream routes. Click to pin the trace; click again, click the background, or press Escape to reset it. Exports always show the full overview. Tracing describes connectivity, not an inferred allocation of inputs to outputs after a merge.

`flow-geometry.mjs` supplies smooth routes with horizontal tangents at their joins, without decorative waves.

Names and totals sit together outside the flow. Branch values are shown quietly inside their channels; details on channels narrower than 12 pixels appear on hover or keyboard focus to avoid colliding labels. Exports keep the uncluttered overview. All values remain in the Pug source and SVG accessibility descriptions.

Use **Settings → Diagram labels & values** to hide totals or branch values independently, change their colors, and adjust font family and sizes. These options are stored directly in Pug, so they work in the CLI and exports too:

```pug
.node-values hide
.flow-values hide
.label-color #dce4e7
.node-value-color #8f9fa8
.flow-value-color #f2c879
.label-font-size 11
.value-font-size 9
```

**[Try the online editor on GitHub Pages →](https://briday1.github.io/pug-sankey/)**

## What it does

- **Value-driven sizing** — every channel uses the same linear quantity scale. Logical nodes describe shared trunks; their `.value`, if declared, must agree with their flow totals. Very small channels keep their exact visual width but have larger invisible selection targets.
- **Per-flow color, blended** — give any `flow` a `.color`, or leave it unset and the ribbon blends from its source node's color toward its target node's color (controlled by `.blend`).
- **Arbitrary branching and merging** — a node may feed many nodes and be fed by many nodes; the layout stacks and reconfigures columns automatically.
- **Annotation options** — toggle node labels, node values, flow labels, and flow values independently.
- **Source, canvas, or both** — work entirely in the text editor, entirely on the canvas, or side by side. The source is the single editable representation; the canvas is a live preview that can click-to-select source lines, drag to nudge, and build new nodes/flows. The source editor syntax-highlights keywords, fields, colors, numbers, and comments.
- **Command line** — render `.pug` files to PNG/SVG headlessly.

## Install as a Python application

For development, install the checkout in editable mode:

```powershell
python -m pip install -e .
pug-sankey
```

The installed command opens the editor. Add `--vim` to begin in Vim mode:

```powershell
python -m pug_sankey --vim
```

The server opens <http://127.0.0.1:4173> automatically. Examples of server options:

```powershell
pug-sankey --no-browser
pug-sankey serve --no-browser       # explicit local server command
pug-sankey serve diagram.pug        # serve and open a Pug file
pug-sankey --host 0.0.0.0 --port 8080 --vim
pug-sankey --demo                  # demo 1
pug-sankey --demo 5                # choose any demo from 1–8
pug-sankey --gui diagram.pug
pug-sankey --version
```

## Command-line rendering

Render directly from the command line. Pug Sankey uses an installed Edge, Chrome, or Chromium browser for exact parity with the editor; set `PUG_SANKEY_BROWSER` when it is not discovered automatically.

```powershell
pug-sankey diagram.pug
pug-sankey diagram.pug --output diagram.png --scale 2
```

`GET /healthz` returns server status and version as JSON.

## Basic Sankey definition

The canvas is implied; an empty file is a valid empty diagram. Declare nodes and weighted flows at the source root:

```pug
node
  .id sources
  .label Sources
  .color #2e6ba7
node
  .id electricity
  .label Electricity
  .color #3fa06b
node
  .id homes
  .label Homes
  .color #b04a8a
flow
  .from sources
  .to electricity
  .value 45
flow
  .from electricity
  .to homes
  .value 26
```

This renders a two-column Sankey: `Sources` feeds `Electricity`, which feeds `Homes`. The `45` and `26` values size the ribbons and the node bars.

### Branching and merging

Declare as many flows as you like. A node with several outgoing flows branches; a node with several incoming flows merges:

```pug
node
  .id a
node
  .id b
node
  .id hub
node
  .id out
flow
  .from a
  .to hub
  .value 40
flow
  .from b
  .to hub
  .value 25
flow
  .from hub
  .to out
  .value 65
```

The layout assigns each node to a column from the flow topology and stacks nodes so ribbons do not cross unnecessarily. Feedback loops are tolerated — the layout stays stable.

## Colors and blending

- `.color` on a `node` sets the bar color.
- `.color` on a `flow` overrides the ribbon color.
- `.blend N` (0–100) at the source root controls how much a ribbon with no explicit color blends from its source node's color toward its target node's color. `0` keeps the source color; `100` reaches the target color; the default `60` is a pleasing gradient.

```pug
.blend 70
node
  .id in
  .label In
  .color #2e6ba7
node
  .id out
  .label Out
  .color #3fa06b
flow
  .from in
  .to out
  .value 30
  .color #22c55e   // explicit color wins over blending
```

## Annotations, labels, and values

Toggle what the canvas draws with root settings:

| Setting | Values | Default | Controls |
| --- | --- | --- | --- |
| `.node-labels` | `show` / `hide` | `show` | Text labels beside node bars |
| `.node-values` | `show` / `hide` | `show` | Throughput value beside node bars |
| `.flow-labels` | `show` / `hide` | `hide` | Text label centered on each ribbon |
| `.flow-values` | `show` / `hide` | `show` | Numeric value centered on each ribbon |
| `.blend` | `0`–`100` | `60` | Source→target ribbon color blend |

Add a free-text note above or below any node:

```pug
node
  .id industry
  .label Industry
  .annotation
    .above
      | Largest single consumer
```

## Reusable styles

Define a styled type at the source root, then apply it by nesting its dotted class inside a bare declaration:

```pug
@node accent
  .color #245886

@flow warning
  .color #ef4444

node
  .accent
  .id api
  .label API
flow
  .warning
  .from api
  .to homes
  .value 12
```

## Editing on the canvas

- **Click** any bar, ribbon, or label to focus and select its source line.
- **Drag** a node or label to nudge it; the editor writes the resulting `.offset (x, y)` back into the source. A translucent ghost marks the original position.
- **Select** a node or flow to open the inspector and edit its ID, label, color, layer, value, and more — every change edits the Pug source directly.
- **New → Node / Flow** opens a builder that inserts ordinary Pug.
- **Clean Up** snaps accidental offsets back to tidy values.
- The **Objects** panel lists every node and flow for quick navigation.

## Embed in another page

Copy the files in `src/pug_sankey/web/`, then:

```html
<link rel="stylesheet" href="./sankey.css">
<div id="diagram"></div>

<script type="module">
  import { createBlockDiagram } from "./pugflow.mjs";

  const source = `node
    .id a
    .label A
  node
    .id b
    .label B
  flow
    .from a
    .to b
    .value 12`;

  const diagram = createBlockDiagram(document.querySelector("#diagram"), source);
  diagram.render(updatedSource);
  diagram.saveSource("diagram.pug");
  diagram.saveSVG("diagram.svg");
  await diagram.savePNG("diagram.png", 2);
</script>
```

The returned object exposes `render(source)`, `toSVGString()`, `saveSource(filename)`, `saveSVG(filename)`, and `savePNG(filename, scale)`.

## Theme and layout

Override CSS variables on the diagram container for an embedded diagram:

```css
#diagram {
  --diagram-background: #2e6ba7;
  --diagram-label: #eee9dc;
  --diagram-text: #eee9dc;
  --diagram-annotation: #dbeafe;
  --diagram-font: Verdana, sans-serif;
}
```

Pass layout spacing when creating the diagram:

```js
createBlockDiagram(element, source, {
  layout: { columnGutter: 204, nodeGutter: 84, padding: 62, nodeWidth: 116, targetHeight: 108 },
});
```

## Project layout

```text
src/pug_sankey/
  cli.py                 Python command-line interface
  server.py              HTTP server and health endpoint
  render.py              Headless browser PNG rendering
  web/                   Browser application and reusable ES modules
tests/
  python/                Server tests
  js/                    Parser, layout, editor-source, and example tests
examples/                Loadable Sankey diagram definitions
dist/                    Generated PyInstaller output (gitignored)
```

The browser source under `web/` is package data and is served directly as ES modules. There is no generated JavaScript bundle or frontend build step.

## Build a standalone executable

The included PyInstaller spec embeds the web frontend alongside the Python server:

```powershell
python -m pip install pyinstaller
pyinstaller pug_sankey.spec
```

The resulting `dist/pug-sankey.exe` runs the same web application and opens it in the default browser. PyInstaller is a build-time dependency only; it is not required by the installed application.

## Tests

```powershell
node --test tests/js/*.test.mjs
PYTHONPATH=src python -m unittest discover -s tests/python -v
```

The JavaScript tests use the Node.js 18+ built-in runner directly; no npm project or packages are involved. Python server tests use only the standard library. The application itself has no third-party runtime dependencies.

## Continuous deployment

A GitHub Actions workflow runs the test suite on every push and publishes the editor to **GitHub Pages** whenever `main` is updated.
