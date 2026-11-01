// NativeWind creates this file during bundling; Metro must index it beforehand.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname,'..');
const output = path.join(root,'node_modules/react-native-css-interop/.cache/web.css');
fs.mkdirSync(path.dirname(output),{recursive:true});
const result = spawnSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i',path.join(root,'global.css'),'-o',output,'--minify'],{cwd:root,env:{...process.env,NATIVEWIND_OS:'web'},stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
