import test from 'node:test';
import assert from 'node:assert/strict';
import { fabricStrands, traceFlowRoute } from '../../src/pug_sankey/web/flow-fabric.mjs';

test('partial strands preserve quantity without rounding small flows away', () => {
  for (const width of [.001,1,4,5,108,108.01]) {
    const strands=fabricStrands(width);
    assert.ok(strands.length>0);
    assert.ok(Math.abs(strands.reduce((sum,s)=>sum+s.weight*4,0)-width)<1e-8);
    assert.ok(strands.every(s=>s.offset>=-width/2 && s.offset<=width/2));
  }
  assert.deepEqual(fabricStrands(0),[]);
});

const edges = [
  {key:'a',from:'source',to:'split'},
  {key:'b',from:'split',to:'main'},
  {key:'c',from:'split',to:'side'},
  {key:'d',from:'main',to:'sink'},
  {key:'e',from:'elsewhere',to:'sink'},
];

test('branch tracing includes ancestors and descendants without inventing allocation', () => {
  const trace=traceFlowRoute(edges,{edge:edges[1]});
  assert.deepEqual([...trace.edgeKeys].sort(),['a','b','d']);
  assert.ok(!trace.nodeIds.has('side'));
  assert.ok(!trace.nodeIds.has('elsewhere'));
});

test('node tracing shows all routes through a junction and terminates on cycles', () => {
  const trace=traceFlowRoute([...edges,{key:'loop',from:'sink',to:'main'}],{node:{id:'main'}});
  assert.ok(trace.edgeKeys.has('loop'));
  assert.ok(trace.edgeKeys.has('b'));
  assert.ok(trace.edgeKeys.has('d'));
  assert.ok(!trace.edgeKeys.has('c'));
});
