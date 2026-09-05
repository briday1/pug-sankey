// Quiet stream geometry with horizontal mouths and continuous tangents.
// The fabric follows these routes without decorative waves.
const point = ([x,y]) => `${x} ${y}`;

export function sweepChannel(x0, y0, x1, y1, thickness = 0) {
  const span = x1-x0, rise = y1-y0;
  function sample(t) {
    const ease = t*t*t*(10+t*(-15+6*t));
    const easeSlope = 30*t*t*(1-t)*(1-t);
    return { p:[x0+span*t,y0+rise*ease], d:[span,rise*easeSlope] };
  }
  const points = [[x0,y0]];
  let path = `M ${x0} ${y0}`;
  // Hermite segments preserve the analytic tangent at every join, including
  // the mouths, so the strands join the shared trunks without a kink.
  for (let i=0;i<8;i++) {
    const a=sample(i/8), b=sample((i+1)/8), dt=1/24;
    const c0=[a.p[0]+a.d[0]*dt,a.p[1]+a.d[1]*dt];
    const c1=[b.p[0]-b.d[0]*dt,b.p[1]-b.d[1]*dt];
    const end=i===7 ? [x1,y1] : b.p;
    path += ` C ${point(c0)} ${point(c1)} ${point(end)}`;
    points.push(c0,c1,end);
  }
  return { path, points };
}

export function bendFeedback(points, desiredRadius = 30) {
  let path = `M ${point(points[0])}`;
  for (let i=1;i<points.length-1;i++) {
    const a=points[i-1], b=points[i], c=points[i+1];
    const before=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const after=Math.hypot(c[0]-b[0],c[1]-b[1]);
    if (!before || !after) continue;
    const radius=Math.min(desiredRadius,before/2,after/2);
    const enter=[b[0]+(a[0]-b[0])*radius/before,b[1]+(a[1]-b[1])*radius/before];
    const exit=[b[0]+(c[0]-b[0])*radius/after,b[1]+(c[1]-b[1])*radius/after];
    path += ` L ${point(enter)} Q ${point(b)} ${point(exit)}`;
  }
  return path+` L ${point(points.at(-1))}`;
}

export function sharedTrunk(left, right, center, inlet, outlet, terminal) {
  const end=terminal ? right-28 : right;
  const span=end-left, bow=0;
  const top0=center-inlet/2, top1=center-outlet/2;
  const bottom0=center+inlet/2, bottom1=center+outlet/2;
  const middle=(left+end)/2;
  // The same bow on both boundaries keeps the shared trunk's width intact.
  const topMid=(top0+top1)/2+bow, bottomMid=(bottom0+bottom1)/2+bow;
  let path=`M ${left} ${top0} C ${left+span*.22} ${top0} ${left+span*.28} ${topMid} ${middle} ${topMid}`;
  path+=` C ${left+span*.72} ${topMid} ${left+span*.78} ${top1} ${end} ${top1}`;
  path+=terminal ? ` L ${right} ${center} L ${end} ${bottom1}` : ` L ${end} ${bottom1}`;
  path+=` C ${left+span*.78} ${bottom1} ${left+span*.72} ${bottomMid} ${middle} ${bottomMid}`;
  path+=` C ${left+span*.28} ${bottomMid} ${left+span*.22} ${bottom0} ${left} ${bottom0} Z`;
  return path;
}
