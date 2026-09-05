import test from 'node:test';
import assert from 'node:assert/strict';
import { sweepChannel, bendFeedback, sharedTrunk } from '../../src/pug_sankey/web/flow-geometry.mjs';

test('sweeps retain endpoints and horizontal tangents for flat and steep flows', () => {
  for (const dy of [0,2,-2,400,-400]) {
    const {points,path} = sweepChannel(20,500,224,500+dy,80);
    assert.deepEqual(points[0],[20,500]);
    assert.deepEqual(points.at(-1),[224,500+dy]);
    assert.ok(Math.abs(points[1][1]-500)<1e-9);
    assert.ok(Math.abs(points.at(-2)[1]-(500+dy))<1e-9);
    assert.ok(points.flat().every(Number.isFinite));
    assert.ok(!path.includes(' L '));
    for(let i=1;i<points.length;i++) assert.ok(points[i][0]>=points[i-1][0]);
  }
});

test('every cubic segment has the same incoming and outgoing tangent at its join', () => {
  const {points} = sweepChannel(0,0,204,160,50);
  for(let i=3;i<points.length-1;i+=3) {
    for (let axis=0;axis<2;axis++) {
      assert.ok(Math.abs((points[i][axis]-points[i-1][axis])-(points[i+1][axis]-points[i][axis]))<1e-8);
    }
  }
});

test('feedback bends and terminal silhouettes keep their connection coordinates', () => {
  const path=bendFeedback([[0,100],[30,100],[30,0],[-30,0],[-30,100],[0,100]]);
  assert.ok(path.startsWith('M 0 100'));
  assert.ok(path.endsWith('L 0 100'));
  assert.ok(path.includes(' Q '));
  const terminal=sharedTrunk(0,116,50,40,40,true);
  assert.ok(terminal.startsWith('M 0 30'));
  assert.ok(terminal.includes('L 116 50'));
  assert.ok(terminal.endsWith('0 70 Z'));
});
