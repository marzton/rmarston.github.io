'use strict';
const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

function deleteRecursiveSync(target) {
    if (fs.existsSync(target)) {
        const stats = fs.statSync(target);
        if (stats.isDirectory()) {
            fs.readdirSync(target).forEach((childItemName) => {
                deleteRecursiveSync(path.join(target, childItemName));
            });
            fs.rmdirSync(target);
        } else {
            fs.unlinkSync(target);
        }
    }
}

console.log('### INFO: Syncing src to dist...');

if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}

fs.readdirSync('dist').forEach((file) => {
    deleteRecursiveSync(path.join('dist', file));
});

fs.readdirSync('src').forEach((file) => {
    copyRecursiveSync(path.join('src', file), path.join('dist', file));
});

console.log('### SUCCESS: Build complete.');
