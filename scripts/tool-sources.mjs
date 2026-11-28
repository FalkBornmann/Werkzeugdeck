import {copyFileSync, mkdirSync, realpathSync, statSync} from 'node:fs';
import {join, relative, resolve, isAbsolute} from 'node:path';

function requireInside(parent, target) {
  const rel = relative(parent, target);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Source must remain inside its directory: ${target}`);
}

// A fresh checkout is sufficient: no tool clones, Git subprocesses or network access.
export function copyToolAssets(root, tool, destination) {
  const realRoot = realpathSync(root);
  const source = realpathSync(resolve(root, tool.sourceDirectory));
  requireInside(realRoot, source);
  mkdirSync(destination, {recursive:true});
  for (const asset of tool.assets) {
    if (!/^[\w.-]+$/.test(asset) || asset==='.' || asset==='..') throw new Error(`Invalid asset: ${asset}`);
    const file = realpathSync(join(source, asset));
    requireInside(source, file);
    if (!statSync(file).isFile()) throw new Error(`Source asset is not a file: ${asset}`);
    copyFileSync(file, join(destination, asset));
  }
}
