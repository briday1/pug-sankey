import test from 'node:test';
import assert from 'node:assert/strict';
import { setDiagramSettings } from '../../src/pug_sankey/web/diagram-settings.mjs';
import { parseDiagram } from '../../src/pug_sankey/web/parser.mjs';

test('appearance round trips through Pug without changing node properties', () => {
  const source = '.node-values show\nnode\n  .id a\n  .value 12\n  .color #abc\n';
  const edited = setDiagramSettings(source, { 'node-values':'hide', 'flow-values':'hide', 'node-value-color':'#123456', 'flow-value-color':'tomato', 'label-font-size':'14', 'value-font-size':'10' });
  const graph = parseDiagram(edited);
  assert.deepEqual(graph.errors,[]);
  assert.equal(graph.figure.nodeValues,false);
  assert.equal(graph.figure.flowValues,false);
  assert.equal(graph.figure.nodeValueColor,'#123456');
  assert.equal(graph.figure.flowValueColor,'tomato');
  assert.equal(graph.figure.labelFontSize,14);
  assert.equal(graph.figure.valueFontSize,10);
  assert.equal(graph.nodes[0].color,'#abc');
  assert.equal(graph.nodes[0].declaredValue,12);
  assert.equal(edited.match(/\.node-values /g).length,1);
});

test('explicit canvas settings are edited at the right indentation', () => {
  const source = '#canvas\n  .node-values show\n  node\n    .id a\n    .color red\n';
  const edited = setDiagramSettings(source, { 'node-values':'hide', 'label-color':'white' });
  const graph = parseDiagram(edited);
  assert.deepEqual(graph.errors,[]);
  assert.equal(graph.figure.nodeValues,false);
  assert.equal(graph.figure.labelColor,'white');
  assert.equal(graph.nodes[0].color,'red');
});

test('empty style values restore defaults and invalid sizes are rejected', () => {
  const source = setDiagramSettings('.value-font-size 18\n',{'value-font-size':''});
  assert.equal(parseDiagram(source).figure.valueFontSize,9);
  for (const size of ['0','-1','NaN','97']) assert.ok(parseDiagram('.value-font-size '+size).errors.length);
});
