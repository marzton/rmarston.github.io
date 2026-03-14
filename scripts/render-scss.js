'use strict';
const autoprefixer = require('autoprefixer')
const fs = require('fs');
const packageJSON = require('../package.json');
const upath = require('upath');
const postcss = require('postcss')
const sass = require('sass');
const sh = require('shelljs');

const stylesPath = '../src/scss/styles.scss';
const destPath = upath.resolve(upath.dirname(__filename), '../dist/css/styles.css');

module.exports = function renderSCSS() {
    
    sass.render({
        data: entryPoint,
        includePaths: [
            upath.resolve(upath.dirname(__filename), '../node_modules')
        ],
    }, (err, results) => {
        if (err) {
            console.error(err);
            return;
        }

        const destPathDirname = upath.dirname(destPath);
        if (!sh.test('-e', destPathDirname)) {
            sh.mkdir('-p', destPathDirname);
        }

        postcss([ autoprefixer ]).process(results.css, {from: 'styles.css', to: 'styles.css'}).then(result => {
            result.warnings().forEach(warn => {
                console.warn(warn.toString())
            })
            fs.writeFileSync(destPath, result.css.toString());
        }).catch(err => {
            console.error(err);
        });
    });

};

const entryPoint = `/*!
* Start Bootstrap - ${packageJSON.title} v${packageJSON.version} (${packageJSON.homepage})
* Copyright 2013-${new Date().getFullYear()} ${packageJSON.author}
* Licensed under ${packageJSON.license} (https://github.com/StartBootstrap/${packageJSON.name}/blob/master/LICENSE)
*/
@import "${stylesPath}"
`