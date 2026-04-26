'use strict';

const mockSh = {
    find: jest.fn()
};
const mockRenderPug = jest.fn();
const mockUpath = {
    resolve: jest.fn((...args) => args.join('/')),
    dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/') || '.'),
};

jest.mock('shelljs', () => mockSh, { virtual: true });
jest.mock('./render-pug', () => mockRenderPug, { virtual: true });
jest.mock('upath', () => mockUpath, { virtual: true });

describe('build-pug script', () => {
    let processExitSpy;
    let consoleErrorSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock process.exit to prevent the test process from exiting
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        processExitSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.resetModules();
    });

    test('should call renderPug for valid pug files and skip others', (done) => {
        const files = [
            'src/index.pug',
            'src/include/nav.pug',
            'src/mixin/button.pug',
            'src/pug/layouts/default.pug',
            'src/assets/logo.png',
            'src/other.pug'
        ];
        mockSh.find.mockReturnValue(files);
        mockRenderPug.mockResolvedValue();

        require('./build-pug');

        // Since build-pug.js calls main() which is async, we need to wait
        setImmediate(() => {
            try {
                expect(mockRenderPug).toHaveBeenCalledTimes(2);
                expect(mockRenderPug).toHaveBeenCalledWith('src/index.pug');
                expect(mockRenderPug).toHaveBeenCalledWith('src/other.pug');
                done();
            } catch (error) {
                done(error);
            }
        });
    });

    test('should handle errors in main', (done) => {
        mockSh.find.mockReturnValue(['src/index.pug']);
        const error = new Error('Render error');
        mockRenderPug.mockRejectedValue(error);

        require('./build-pug');

        setImmediate(() => {
            try {
                expect(consoleErrorSpy).toHaveBeenCalledWith(error);
                expect(processExitSpy).toHaveBeenCalledWith(1);
                done();
            } catch (err) {
                done(err);
            }
        });
    });
});
