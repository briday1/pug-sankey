import { createBlockDiagram } from "./pugflow.mjs";

async function run() {
  try {
    const [source, styles] = await Promise.all([
      fetch("/__render_source.pug").then((response) => response.text()),
      fetch("/__render_styles.css").then((response) => response.text()),
    ]);
    const diagram = createBlockDiagram(document.querySelector("#diagram"), source, { styles });
    const svg = document.querySelector("svg");
    const scale = Number(new URLSearchParams(location.search).get("scale") ?? 2);
    const image = new Image();
    const url = URL.createObjectURL(new Blob([diagram.toSVGString()], { type: "image/svg+xml;charset=utf-8" }));
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error("Could not rasterize the generated SVG.")); image.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(svg.viewBox.baseVal.width * scale);
    canvas.height = Math.ceil(svg.viewBox.baseVal.height * scale);
    const context = canvas.getContext("2d");
    context.scale(scale, scale);
    context.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    const png = await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create PNG.")), "image/png"));
    await fetch("/__render_output", { method: "POST", body: png });
    window.close();
  } catch (error) {
    await fetch("/__render_error", { method: "POST", body: error?.stack ?? String(error) });
  }
}
run();
