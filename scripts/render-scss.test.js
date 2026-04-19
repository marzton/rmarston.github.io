'use strict';

const mockFs = {
    writeFileSync: jest.fn()
};
const mockSh = {
    test: jest.fn(),
    mkdir: jest.fn()
};
const mockUpath = {
    resolve: jest.fn((...args) => args.join('/')),
    dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/') || '.'),
};
const mockSass = {
    compileString: jest.fn()
};
const mockPostcss = jest.fn();
const mockAutoprefixer = {};

jest.mock('fs', () => mockFs);
jest.mock('shelljs', () => mockSh, { virtual: true });
jest.mock('upath', () => mockUpath, { virtual: true });
jest.mock('sass', () => mockSass, { virtual: true });
jest.mock('postcss', () => mockPostcss, { virtual: true });
jest.mock('autoprefixer', () => mockAutoprefixer, { virtual: true });

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

const renderSCSS = require('./render-scss');

describe('renderSCSS', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should render SCSS using compileString and process with postcss', (done) => {
        const mockCss = 'body { color: red; }';
        const mockResultCss = 'body { color: red; -webkit-hyphens: auto; }';

        mockSass.compileString.mockReturnValue({ css: mockCss });

        const mockProcess = jest.fn().mockReturnValue(Promise.resolve({
            css: mockResultCss,
            warnings: () => []
        }));
        mockPostcss.mockReturnValue({ process: mockProcess });

        mockSh.test.mockReturnValue(false);

        renderSCSS();

        // Use setImmediate to wait for the postcss promise to resolve
        setImmediate(() => {
            try {
                expect(mockSass.compileString).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                    loadPaths: expect.arrayContaining([expect.stringContaining('node_modules')])
                }));
                expect(mockSh.mkdir).toHaveBeenCalled();
                expect(mockPostcss).toHaveBeenCalledWith([mockAutoprefixer]);
                expect(mockProcess).toHaveBeenCalledWith(mockCss, expect.any(Object));
                expect(mockFs.writeFileSync).toHaveBeenCalledWith(expect.any(String), mockResultCss);
                done();
            } catch (error) {
                done(error);
            }
        });
    });

    test('should handle sass compileString error', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        mockSass.compileString.mockImplementation(() => {
            throw new Error('Sass error');
        });

        renderSCSS();

        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        consoleSpy.mockRestore();
    });
});
