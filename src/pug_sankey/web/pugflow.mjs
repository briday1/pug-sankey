// Public Pug diagram API; continuous Sankey flows with pointed destinations.
import { parseDiagram } from "./parser.mjs";
import { renderFlowField } from "./flowfield.mjs";

function serialize(svg) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg)}`;
}

function exportSvgClone(svg) {
  const clone = svg.cloneNode(true);
  clone.classList.remove("interactive");
  clone.querySelectorAll(".interaction-highlight").forEach(element => element.remove());
  clone.querySelectorAll(".axis-active").forEach(element => element.classList.remove("axis-active"));
  clone.querySelectorAll(".selected-element, .dimmed, .revealed, .route-active").forEach((element) => element.classList.remove("selected-element", "dimmed", "revealed", "route-active"));
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
    currentSvg = renderFlowField(container, graph, options);
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
