import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
fs.writeFileSync('package.json.bak', JSON.stringify(pkg, null, 2));

delete pkg.devDependencies;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('Stripped devDependencies from package.json for publish');
