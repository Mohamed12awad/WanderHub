const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pairs = [
  ['backend/.env.development.example', 'backend/.env.development'],
  ['backend/.env.production.example', 'backend/.env.production'],
  ['frontend/.env.development.example', 'frontend/.env.development'],
  ['frontend/.env.production.example', 'frontend/.env.production'],
];

for (const [source, target] of pairs) {
  const sourcePath = path.join(root, source);
  const targetPath = path.join(root, target);

  if (fs.existsSync(targetPath)) {
    console.log(`exists  ${target}`);
    continue;
  }

  fs.copyFileSync(sourcePath, targetPath);
  console.log(`created ${target}`);
}

console.log('Fill in secrets before using production commands.');
