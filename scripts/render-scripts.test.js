'use strict';

const mockFs = {
    readFileSync: jest.fn(),
    writeFileSync: jest.fn()
};
const mockSh = {
    cp: jest.fn()
};
const mockUpath = {
    resolve: jest.fn((...args) => args.join('/')),
    dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/') || '.'),
};

jest.mock('fs', () => mockFs);
jest.mock('shelljs', () => mockSh, { virtual: true });
jest.mock('upath', () => mockUpath, { virtual: true });

// Mock package.json
const mockPackageJSON = {
    title: 'Test Title',
    version: '1.0.0',
    homepage: 'https://test.com',
    author: 'Test Author',
    license: 'MIT',
    name: 'test-name'
};
jest.mock('../package.json', () => mockPackageJSON, { virtual: true });

const renderScripts = require('./render-scripts');

describe('renderScripts', () => {
    const currentYear = new Date().getFullYear();
    const mockScriptsContent = 'console.log("test");';
    const expectedCopyright = `/*!
* Start Bootstrap - Test Title v1.0.0 (https://test.com)
* Copyright 2013-${currentYear} Test Author
* Licensed under MIT (https://github.com/StartBootstrap/test-name/blob/master/LICENSE)
*/
`;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFs.readFileSync.mockReturnValue(Buffer.from(mockScriptsContent));
    });

    test('should copy scripts from src to dist and add copyright header to scripts.js', () => {
        renderScripts();

        // Check if shelljs.cp was called correctly
        // sourcePath = ../src/js, destPath = ../dist/. (based on mockUpath.resolve)
        expect(mockSh.cp).toHaveBeenCalledWith('-R', expect.stringContaining('src/js'), expect.stringContaining('dist/.'));

        // Check if fs.readFileSync was called for scripts.js
        expect(mockFs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('src/js/scripts.js'));

        // Check if fs.writeFileSync was called for scripts.js with copyright
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
            expect.stringContaining('dist/js/scripts.js'),
            expectedCopyright + mockScriptsContent
        );
    });
});
