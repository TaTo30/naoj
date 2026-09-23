import { copyFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const assets = [
  ["src/extensions/vim/vim-mode.css", "dist/extensions/vim/vim-mode.css"],
];

for (const [from, to] of assets) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}
