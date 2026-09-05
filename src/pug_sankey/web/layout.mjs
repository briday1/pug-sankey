// Compatibility exports. All plotting geometry now uses the continuous flow engine.
export { FLOW_LAYOUT as DEFAULT_LAYOUT, layoutFlowField as layoutDiagram } from "./flow-layout.mjs";

/** Translate structural flow descendants with their manually moved ancestors. */
export function inheritedFlowOffsets(nodes, edges) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const parentByTarget = new Map();
  edges.forEach((edge) => {
    if (!parentByTarget.has(edge.to)) parentByTarget.set(edge.to, edge.from);
  });
  const memo = new Map();
  const resolve = (id, visiting = new Set()) => {
    if (memo.has(id)) return memo.get(id);
    const parentId = parentByTarget.get(id);
    if (!parentId || visiting.has(id)) return { x: 0, y: 0 };
    const parent = nodesById.get(parentId);
    if (!parent) return { x: 0, y: 0 };
    const inherited = resolve(parentId, new Set([...visiting, id]));
    const result = { x: inherited.x + (parent.offsetX ?? 0), y: inherited.y + (parent.offsetY ?? 0) };
    memo.set(id, result);
    return result;
  };
  nodes.forEach((node) => { if (!memo.has(node.id)) memo.set(node.id, resolve(node.id)); });
  return memo;
}

/** Apply a drag delta only to explicitly selected nodes. */
export function independentMoveOffsets(nodes, _edges, selectedIds, dx, dy) {
  const selected = new Set(selectedIds);
  return nodes.filter((node) => selected.has(node.id)).map((node) => ({
    ...node,
    offsetX: (node.offsetX ?? 0) + dx,
    offsetY: (node.offsetY ?? 0) + dy,
  }));
}

/** Snap near-zero manual offsets back to clean values (used by Clean Up). */
export function cleanupAlignmentOffsets(nodes, _edges) {
  const changes = [];
  nodes.forEach((node) => {
    let touched = false;
    const next = { ...node };
    for (const axis of ["X", "Y"]) {
      const key = `offset${axis}`;
      const offset = next[key] ?? 0;
      if (Math.abs(offset) >= 0.05 && Math.abs(offset) <= 2) {
        next[key] = 0;
        touched = true;
      } else {
        const rounded = Math.round(offset * 10) / 10;
        next[key] = Math.abs(rounded) < 0.05 ? 0 : rounded;
        if (next[key] !== offset) touched = true;
      }
    }
    if (touched) {
      changes.push({ kind: "offset", id: node.id, lineNumber: node.lineNumber, offsetX: next.offsetX ?? 0, offsetY: next.offsetY ?? 0 });
    }
  });
  return changes;
}

/** No graph frames in a Sankey diagram; kept for the app's Clean Up action. */
export function cleanupGraphOffsets() {
  return [];
}

/** Order sibling nodes for tidy ribbon stacking (kept API compatibility). */
export function arrangeNodeOffsets(nodes) {
  return nodes;
}
