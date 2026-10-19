// 모든 CSS·JS를 한 파일로 묶는다.
//   node tools/bundle.mjs                → ../dist/two-notebooks.html (단독 실행 파일)
//   node tools/bundle.mjs --fragment OUT → <html>/<head>/<body> 껍데기 없이 OUT에 저장
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const fragIdx = args.indexOf('--fragment');
const fragment = fragIdx >= 0;
const out = fragment ? args[fragIdx + 1] : join(root, '..', 'dist', 'two-notebooks.html');
if (!out) { console.error('사용법: node tools/bundle.mjs [--fragment 출력경로]'); process.exit(1); }

let html = readFileSync(join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, p) => '<style>\n' + readFileSync(join(root, p), 'utf8') + '</style>');
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, p) => '<script>\n' + readFileSync(join(root, p), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>');

if (fragment) {
  html = html
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<html[^>]*>\s*/i, '')
    .replace(/<\/html>\s*/i, '')
    .replace(/<head>\s*/i, '')
    .replace(/<\/head>\s*/i, '')
    .replace(/<body>\s*/i, '')
    .replace(/<\/body>\s*/i, '')
    .replace(/<meta charset="utf-8">\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '');
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log((fragment ? 'fragment' : 'bundle') + ' → ' + out + ' (' + (html.length / 1024).toFixed(0) + ' KB)');
