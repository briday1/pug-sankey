// Sankey layout engine.
//
// Takes parsed Sankey nodes (bars) and edges (weighted flows) and assigns
// columns (depth), vertical stacking, and per-link thickness so that the
// rendered ribbon heights are proportional to flow values. Supports arbitrary
// branching and merging: a node may feed many nodes and be fed by many nodes.
//
// The layout is "smart": node columns are derived from the flow topology
// (longest-path layering with cycle fallback), node heights come from the
// largest of incoming/outgoing throughput, and links attach stacked in a
// stable order so ribbons do not cross unnecessarily.

export const DEFAULT_LAYOUT = Object.freeze({
  // Horizontal spacing between node columns (the gap the ribbons span).
  columnGutter: 110,
  // Vertical spacing between stacked nodes in the same column.
  nodeGutter: 28,
  // Canvas padding around the whole diagram.
  padding: 54,
  // Node bar thickness (horizontal width of a Sankey node rectangle).
  nodeWidth: 16,
  // Vertical pixels of ribbon height per unit of flow value. When null the
  // layout auto-scales so the tallest column fits a sensible height.
  valueScale: null,
  // Target height used for auto value scaling.
  targetHeight: 420,
  // Minimum node bar height so tiny flows stay clickable.
  minNodeHeight: 6,
});

function sanitizeValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

/** Index edges per endpoint and compute per-node throughput. */
function analyze(nodes, edges) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map(nodes.map((node) => [node.id, []]));
  const incoming = new Map(nodes.map((node) => [node.id, []]));
  const liveEdges = edges.filter((edge) => nodesById.has(edge.from) && nodesById.has(edge.to) && !edge.hidden);
  liveEdges.forEach((edge) => {
    edge.value = sanitizeValue(edge.value);
    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);
  });
  const throughput = new Map(nodes.map((node) => {
    const computed = Math.max(
      outgoing.get(node.id).reduce((sum, edge) => sum + edge.value, 0),
      incoming.get(node.id).reduce((sum, edge) => sum + edge.value, 0),
    );
    // A node's own declared .value is authoritative when present (the parser
    // already rejects sources where it conflicts with the flow totals), so
    // isolated or under-connected nodes still render at their intended size.
    const value = node.hasDeclaredValue ? node.declaredValue : computed;
    return [node.id, value];
  }));
  return { nodesById, outgoing, incoming, liveEdges, throughput };
}

/**
 * Assign a column (depth) to every node using longest-path layering.
 * Cycles are broken by treating back-edges as zero-depth links, which keeps
 * the layout total and stable for arbitrary branching/merging/feedback.
 */
function assignColumns(nodes, edges) {
  const { nodesById, outgoing } = analyze(nodes, edges);
  const depth = new Map();
  const visiting = new Set();
  const resolve = (id) => {
    if (depth.has(id)) return depth.get(id);
    if (visiting.has(id)) return 0; // cycle fallback: keep it total
    visiting.add(id);
    const outs = outgoing.get(id) ?? [];
    let best = 0;
    outs.forEach((edge) => {
      if (edge.to === id) return; // self-loop stays in place
      best = Math.max(best, resolve(edge.to) + 1);
    });
    visiting.delete(id);
    // depth measured from the right: sinks are 0. Convert below.
    depth.set(id, best);
    return best;
  };
  nodes.forEach((node) => resolve(node.id));
  const maxDepth = Math.max(0, ...depth.values());
  const column = new Map([...depth.entries()].map(([id, d]) => [id, maxDepth - d]));
  // Place nodes with no edges at all in column 0 so nothing is dropped.
  nodes.forEach((node) => { if (!column.has(node.id)) column.set(node.id, 0); });
  return { column, maxDepth, nodesById };
}

/** Stable vertical order within each column: source order, then id. */
function orderColumns(nodes, column) {
  const byColumn = new Map();
  nodes.forEach((node) => {
    const col = column.get(node.id) ?? 0;
    if (!byColumn.has(col)) byColumn.set(col, []);
    byColumn.get(col).push(node);
  });
  byColumn.forEach((list) => list.sort((a, b) => (a.sourceIndex ?? 0) - (b.sourceIndex ?? 0) || String(a.id).localeCompare(String(b.id))));
  return byColumn;
}

/**
 * Compute the Sankey layout.
 * Returns { nodes, edges, width, height, options, valueScale } where nodes have
 * x/y/width/height and edges have source/target anchor y-coordinates and a
 * proportional thickness.
 */
export function layoutDiagram(nodes, edges, overrides = {}) {
  const options = { ...DEFAULT_LAYOUT, ...overrides };
  const visibleNodes = nodes.filter((node) => !node.hidden);
  if (!visibleNodes.length) {
    return { nodes: [], edges: [], width: options.padding * 2, height: options.padding * 2, options, valueScale: 1 };
  }

  const { column, maxDepth } = assignColumns(visibleNodes, edges);
  const { liveEdges, throughput } = analyze(visibleNodes, edges);
  const byColumn = orderColumns(visibleNodes, column);

  // Determine the value scale (px per unit). Auto-scale to the tallest column.
  const columnTotals = new Map();
  byColumn.forEach((list, col) => {
    const total = list.reduce((sum, node) => sum + throughput.get(node.id), 0);
    columnTotals.set(col, total);
  });
  const gutterAllowance = (col) => Math.max(0, (byColumn.get(col).length - 1) * options.nodeGutter);
  let valueScale = options.valueScale;
  if (!valueScale) {
    let tightest = Infinity;
    columnTotals.forEach((total, col) => {
      if (total <= 0) return;
      const available = options.targetHeight - gutterAllowance(col);
      tightest = Math.min(tightest, available / total);
    });
    valueScale = Number.isFinite(tightest) && tightest > 0 ? tightest : 1;
  }

  // Column x positions.
  const columnLeft = new Map();
  for (let col = 0; col <= maxDepth; col += 1) {
    columnLeft.set(col, options.padding + col * (options.nodeWidth + options.columnGutter));
  }

  // Stack nodes vertically within each column, centered as a group.
  const maxColumnHeight = Math.max(0, ...[...byColumn.entries()].map(([col, list]) => (
    list.reduce((sum, node) => sum + Math.max(options.minNodeHeight, throughput.get(node.id) * valueScale), 0)
    + gutterAllowance(col)
  )));

  const placed = [];
  const placedById = new Map();
  byColumn.forEach((list, col) => {
    const columnHeight = list.reduce((sum, node) => sum + Math.max(options.minNodeHeight, throughput.get(node.id) * valueScale), 0)
      + gutterAllowance(col);
    let cursorY = options.padding + Math.max(0, (maxColumnHeight - columnHeight) / 2);
    list.forEach((node) => {
      const height = Math.max(options.minNodeHeight, throughput.get(node.id) * valueScale);
      const placedNode = {
        ...node,
        column: col,
        x: columnLeft.get(col),
        y: cursorY,
        width: options.nodeWidth,
        height,
        value: throughput.get(node.id),
      };
      placed.push(placedNode);
      placedById.set(node.id, placedNode);
      cursorY += height + options.nodeGutter;
    });
  });

  // Attach links: stack outgoing links top-down at the source ordered by the
  // target's vertical position, and incoming links top-down at the target
  // ordered by the source's vertical position. This keeps ribbons parallel and
  // minimizes crossings for arbitrary branching and merging.
  const placedLinkOrder = (list, otherKey) => [...list].sort((a, b) => {
    const aOther = placedById.get(a[otherKey]);
    const bOther = placedById.get(b[otherKey]);
    return ((aOther?.column ?? 0) - (bOther?.column ?? 0))
      || ((aOther?.y ?? 0) - (bOther?.y ?? 0))
      || ((a.sourceIndex ?? 0) - (b.sourceIndex ?? 0));
  });
  const outgoingByNode = new Map(placed.map((node) => [node.id, []]));
  const incomingByNode = new Map(placed.map((node) => [node.id, []]));
  liveEdges.forEach((edge) => {
    if (placedById.has(edge.from) && placedById.has(edge.to)) {
      outgoingByNode.get(edge.from).push(edge);
      incomingByNode.get(edge.to).push(edge);
    }
  });
  outgoingByNode.forEach((list, id) => outgoingByNode.set(id, placedLinkOrder(list, "to")));
  incomingByNode.forEach((list, id) => incomingByNode.set(id, placedLinkOrder(list, "from")));

  const sourceCursor = new Map(placed.map((node) => [node.id, node.y]));
  const targetCursor = new Map(placed.map((node) => [node.id, node.y]));
  const thickness = (edge) => Math.max(1, edge.value * valueScale);

  // Assign each link its anchor offsets, one node at a time so both cursors
  // advance consistently. Iterate links via the source side; the per-node lists
  // are already in crossing-minimizing order.
  const offsets = new Map();
  placed.forEach((node) => {
    (outgoingByNode.get(node.id) ?? []).forEach((edge) => {
      const t = thickness(edge);
      const y0 = sourceCursor.get(edge.from);
      sourceCursor.set(edge.from, y0 + t);
      offsets.set(edge, { ...(offsets.get(edge) ?? {}), sourceY: y0, thickness: t });
    });
  });
  placed.forEach((node) => {
    (incomingByNode.get(node.id) ?? []).forEach((edge) => {
      const t = offsets.get(edge)?.thickness ?? thickness(edge);
      const y1 = targetCursor.get(edge.to);
      targetCursor.set(edge.to, y1 + t);
      offsets.set(edge, { ...(offsets.get(edge) ?? {}), targetY: y1, thickness: t });
    });
  });

  const routedEdges = liveEdges
    .filter((edge) => offsets.has(edge) && placedById.has(edge.from) && placedById.has(edge.to))
    .map((edge) => {
      const source = placedById.get(edge.from);
      const target = placedById.get(edge.to);
      const slot = offsets.get(edge);
      return {
        ...edge,
        thickness: slot.thickness,
        sourceX: source.x + source.width,
        sourceY: slot.sourceY,
        targetX: target.x,
        targetY: slot.targetY,
        sourceColumn: source.column,
        targetColumn: target.column,
      };
    });

  const width = options.padding * 2 + (maxDepth + 1) * options.nodeWidth + maxDepth * options.columnGutter;
  const height = options.padding * 2 + maxColumnHeight;
  return { nodes: placed, edges: routedEdges, width, height, options, valueScale };
}

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
