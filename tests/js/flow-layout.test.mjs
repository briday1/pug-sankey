import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutFlowField } from '../../src/pug_sankey/web/flow-layout.mjs';
import { parseDiagram } from '../../src/pug_sankey/web/parser.mjs';
import { ADDITIONAL_DEMOS } from '../../src/pug_sankey/web/demo-sources.mjs';
import { readFileSync } from 'node:fs';

const nodes = ['a','b','c'].map(id => ({ id, label: id }));
const edges = [{ from:'a', to:'b', value:80 }, { from:'a', to:'c', value:20 }];

test('exchange ports preserve exact flow ratios, including tiny channels', () => {
  const layout = layoutFlowField(nodes, [...edges, {from:'a',to:'c',value:.001}]);
  assert.equal(layout.edges[0].thickness / layout.edges[1].thickness, 4);
  assert.ok(Math.abs(layout.edges[2].thickness / layout.edges[1].thickness - .00005) < 1e-12);
  assert.equal(layout.nodes.find(n => n.id === 'a').outgoing, 100.001);
  for (const node of layout.nodes) {
    for (const side of ['source','target']) {
      const ports = layout.edges.filter(e => e[side === 'source' ? 'from' : 'to'] === node.id)
        .sort((a,b) => a[side+'Y'] - b[side+'Y']);
      for (let i=1;i<ports.length;i++) assert.ok(ports[i][side+'Y']-ports[i].thickness/2 >= ports[i-1][side+'Y']+ports[i-1].thickness/2 - 1e-9);
    }
  }
});

test('feedback and self loops have dedicated lanes and remain inside the view', () => {
  const layout = layoutFlowField(nodes, [...edges, {from:'b',to:'a',value:5}, {from:'b',to:'b',value:3}]);
  const feedback = layout.edges.filter(e => e.feedback);
  assert.equal(feedback.length, 2);
  assert.notEqual(feedback[0].labelY, feedback[1].labelY);
  for (const edge of layout.edges) for (const [x,y] of edge.points) {
    assert.ok(x >= layout.viewX && x <= layout.viewX+layout.width);
    assert.ok(y >= 0 && y <= layout.height);
  }
});

test('layout is deterministic and does not mutate caller data', () => {
  const snapshot = JSON.stringify({nodes,edges});
  assert.deepEqual(layoutFlowField(nodes,edges), layoutFlowField(nodes,edges));
  assert.equal(JSON.stringify({nodes,edges}), snapshot);
});

test('hidden endpoints and flows do not contribute to totals', () => {
  const layout = layoutFlowField(nodes.map(n => ({...n,hidden:n.id==='b'})), edges);
  assert.equal(layout.edges.length,1);
  assert.equal(layout.nodes.find(n => n.id==='a').outgoing,20);
});

test('showcase and every bundled demo work with the new engine', () => {
  const app = readFileSync(new URL('../../src/pug_sankey/web/app.mjs',import.meta.url),'utf8');
  const showcase = app.match(/const SHOWCASE = `([\s\S]*?)`;/)[1];
  for (const source of [showcase,...ADDITIONAL_DEMOS.map(d => d.pug)]) {
    const graph = parseDiagram(source);
    assert.deepEqual(graph.errors,[]);
    const layout = layoutFlowField(graph.nodes,graph.edges);
    assert.ok(layout.edges.length);
    assert.ok(layout.nodes.every(n => [n.x,n.y,n.height].every(Number.isFinite)));
  }
});

test('empty and isolated input have usable view extents', () => {
  assert.ok(layoutFlowField([],[]).width > 0);
  const result = layoutFlowField([{id:'solo',hasDeclaredValue:true,declaredValue:24}],[]);
  assert.equal(result.nodes[0].value,24);
  assert.ok(result.height>0);
});
