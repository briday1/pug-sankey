/** Update only the figure's direct settings, preserving node/style fields. */
export function setDiagramSettings(source, settings) {
  const lines = source.split('\n');
  const canvas = lines.findIndex(line => /^#canvas\s*$/.test(line));
  const prefix = canvas < 0 ? '' : '  ';
  const keys = new Set(Object.keys(settings));
  const result = lines.filter((line,index) => {
    if (canvas >= 0 && index <= canvas) return true;
    const match = line.match(/^(\s*)\.([\w-]+)(?:\s|$)/);
    return !(match && match[1] === prefix && keys.has(match[2]));
  });
  const additions = Object.entries(settings).filter(([,value]) => value !== '' && value != null)
    .map(([name,value]) => `${prefix}.${name} ${value}`);
  result.splice(canvas < 0 ? 0 : canvas+1, 0, ...additions);
  return result.join('\n');
}
