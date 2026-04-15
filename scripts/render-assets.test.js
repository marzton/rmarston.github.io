'use strict';

const mockSh = {
    cp: jest.fn()
};

const mockUpath = {
    resolve: jest.fn((...args) => args.join('/')),
    dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/') || '.'),
};

jest.mock('shelljs', () => mockSh, { virtual: true });
jest.mock('upath', () => mockUpath, { virtual: true });

const renderAssets = require('./render-assets');

describe('renderAssets', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should copy assets from src to dist', () => {
        renderAssets();

        expect(mockUpath.dirname).toHaveBeenCalled();
        expect(mockUpath.resolve).toHaveBeenCalledTimes(2);

        expect(mockSh.cp).toHaveBeenCalledWith(
            '-R',
            expect.stringContaining('src/assets'),
            expect.stringContaining('dist/.')
        );
    });
});
