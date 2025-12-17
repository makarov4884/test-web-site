const fs = require('fs');
const path = require('path');

const sourceDir = process.cwd();
const destDir = path.join(sourceDir, 'deploy');

// List of files/folders to copy
const includeList = [
    'app',
    'components',
    'context',
    'data',
    'lib',
    'public',
    'scripts',
    'package.json',
    'package-lock.json',
    'next.config.ts',
    'tsconfig.json',
    'postcss.config.mjs',
    'Dockerfile',
    '.dockerignore',
    '.env.local',
    'notelink.json', // Essential map file
    'notices-cache.json', // Cache file to prevent crawling on startup
    '.eslintignore',
    'tailwind.config.ts'
];

// Clean or create deploy directory
if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir);

console.log(`📂 Preparing deployment files in: ${destDir}`);

includeList.forEach(item => {
    const srcPath = path.join(sourceDir, item);
    const destPath = path.join(destDir, item);

    if (fs.existsSync(srcPath)) {
        console.log(`Copying ${item}...`);
        fs.cpSync(srcPath, destPath, { recursive: true });
    } else {
        console.warn(`⚠️ Warning: ${item} not found.`);
    }
});

// Create README.md for Hugging Face Spaces
const readmeContent = `---
title: Team Jinu Support
emoji: 🚀
colorFrom: pink
colorTo: purple
sdk: docker
app_port: 3000
pinned: false
---

# Team Jinu Support Site

This is a Next.js application deployed via Docker.
`;

fs.writeFileSync(path.join(destDir, 'README.md'), readmeContent);
console.log('📄 Created README.md for Hugging Face Spaces');

console.log('✅ Ready! Please upload the contents of the "deploy" folder.');
