const fs = require('fs');
const path = require('path');

const src = path.join(process.cwd(), 'public', 'signatures');
const dest = path.join(process.cwd(), 'deploy', 'public', 'signatures');

if (fs.existsSync(src)) {
    console.log('Copying processed signatures to deploy folder...');
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    fs.cpSync(src, dest, { recursive: true });
    console.log('✅ Signatures copied to deploy/public/signatures');
} else {
    console.error('❌ Source signatures not found!');
}
