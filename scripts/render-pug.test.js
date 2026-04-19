'use strict';

// Manual mocks with 'mock' prefix
const mockFs = {
    promises: {
        writeFile: jest.fn()
    }
};
const mockPug = {
    renderFile: jest.fn()
};
const mockSh = {
    test: jest.fn(),
    mkdir: jest.fn()
};
const mockPrettier = {
    format: jest.fn()
};

// Use virtual: true to mock modules that don't exist in node_modules
jest.mock('fs', () => mockFs);
jest.mock('pug', () => mockPug, { virtual: true });
jest.mock('shelljs', () => mockSh, { virtual: true });
jest.mock('prettier', () => mockPrettier, { virtual: true });
jest.mock('upath', () => {
    // upath might exist or not, let's try to mock it virtually as well if needed
    // but for now let's just mock what we use
    return {
        resolve: jest.fn((...args) => args.join('/')),
        dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/') || '.'),
    };
}, { virtual: true });

const renderPug = require('./render-pug');

describe('renderPug', () => {
    const filePath = 'src/pug/index.pug';
    const expectedDestPath = 'dist/index.html';

    beforeEach(() => {
        jest.clearAllMocks();
        mockPug.renderFile.mockReturnValue('<html></html>');
        mockPrettier.format.mockReturnValue('<html>\n</html>');
        mockSh.test.mockReturnValue(true);
    });

    test('should render pug to html and write to destination', async () => {
        await renderPug(filePath);

        expect(mockPug.renderFile).toHaveBeenCalledWith(filePath, expect.objectContaining({
            doctype: 'html',
            filename: filePath
        }));
        expect(mockPrettier.format).toHaveBeenCalledWith('<html></html>', expect.any(Object));
        expect(mockFs.promises.writeFile).toHaveBeenCalledWith(expectedDestPath, '<html>\n</html>');
    });

    test('should create destination directory if it does not exist', async () => {
        mockSh.test.mockReturnValue(false);

        await renderPug(filePath);

        expect(mockSh.mkdir).toHaveBeenCalledWith('-p', 'dist');
    });

    test('should handle nested pug files correctly', async () => {
        const nestedFilePath = 'src/pug/blog/post.pug';
        const expectedNestedDestPath = 'dist/blog/post.html';

        await renderPug(nestedFilePath);

        expect(mockFs.promises.writeFile).toHaveBeenCalledWith(expectedNestedDestPath, expect.any(String));
        expect(mockSh.test).toHaveBeenCalledWith('-e', 'dist/blog');
    });
});
