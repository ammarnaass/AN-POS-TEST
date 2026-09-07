#!/usr/bin/env node
/**
 * postinstall-patches.js
 *
 * Applies source-level patches to node_modules after npm install.
 * Currently patches:
 *   - react-native-svg: StyleSizeLength → StyleLength (RN 0.76 Yoga API change)
 */

const fs = require('fs');
const path = require('path');

const patches = [
  {
    file: path.join(
      __dirname,
      "node_modules/@react-native-community/cli-server-api/build/statusPageMiddleware.js"
    ),
    find: "res.setHeader('X-React-Native-Project-Root', process.cwd());",
    replace: "res.setHeader('X-React-Native-Project-Root', encodeURI(process.cwd()));",
    description: "cli-server-api: encodeURI for non-ASCII path support in header",
  },
  {
    file: path.join(
      __dirname,
      "node_modules/@react-native-community/cli-tools/build/isPackagerRunning.js"
    ),
    find: "root: headers.get('X-React-Native-Project-Root') ?? ''",
    replace: "root: decodeURI(headers.get('X-React-Native-Project-Root') ?? '')",
    description: "cli-tools: decodeURI for non-ASCII path support in header",
  },
  {
    file: path.join(
      __dirname,
      'node_modules/react-native-svg/common/cpp/react/renderer/components/rnsvg/RNSVGLayoutableShadowNode.cpp'
    ),
    find: 'yoga::StyleSizeLength::percent(100)',
    replace: 'yoga::StyleLength::percent(100)',
    description: 'react-native-svg: StyleSizeLength → StyleLength (RN 0.76)',
  },
];

let anyPatched = false;
for (const patch of patches) {
  if (!fs.existsSync(patch.file)) {
    console.log(`[patch] SKIP (not found): ${patch.file}`);
    continue;
  }
  const original = fs.readFileSync(patch.file, 'utf8');
  if (original.includes(patch.find)) {
    const patched = original.split(patch.find).join(patch.replace);
    fs.writeFileSync(patch.file, patched, 'utf8');
    console.log(`[patch] APPLIED: ${patch.description}`);
    anyPatched = true;
  } else if (original.includes(patch.replace)) {
    console.log(`[patch] ALREADY APPLIED: ${patch.description}`);
  } else {
    console.log(`[patch] NOT FOUND (version changed?): ${patch.description}`);
  }
}

if (!anyPatched) {
  console.log('[patch] All patches already applied or not needed.');
}
