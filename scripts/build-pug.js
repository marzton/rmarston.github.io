'use strict';
const upath = require('upath');
const sh = require('shelljs');
const renderPug = require('./render-pug');

const srcPath = upath.resolve(upath.dirname(__filename), '../src');

async function main() {
    const files = sh.find(srcPath);

    for (const filePath of files) {
        if (
            filePath.match(/\.pug$/)
            && !filePath.match(/include/)
            && !filePath.match(/mixin/)
            && !filePath.match(/\/pug\/layouts\//)
        ) {
            await renderPug(filePath);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
