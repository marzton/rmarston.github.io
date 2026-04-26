'use strict';

const { transformSync } = require('@babel/core');

function toCommonJs(sourceText) {
  let transformed = sourceText;

  // Replace imports with requires
  transformed = transformed.replace(
    /^import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"];?/gm,
    (match, imports, path) => {
      return `const { ${imports} } = require('${path}');`;
    }
  );

  transformed = transformed.replace(/^export function\s+/gm, 'function ');
  transformed = transformed.replace(
    /^export default\s+/m,
    'const __default_export__ = ',
  );

  // Find all function names that are defined (potentially exported)
  const exportedFunctions = [];
  const functionRegex = /^function\s+([a-zA-Z0-9_]+)/gm;
  let match;
  while ((match = functionRegex.exec(transformed)) !== null) {
    exportedFunctions.push(match[1]);
  }

  const exportsObj = exportedFunctions.length > 0 ? `{ ${exportedFunctions.join(', ')} }` : '{}';

  return `${transformed}\nmodule.exports = ${exportsObj};\n`;
}

module.exports = {
  process(sourceText, sourcePath) {
    const stripped = transformSync(sourceText, {
      filename: sourcePath,
      babelrc: false,
      configFile: false,
      sourceMaps: 'inline',
      plugins: [
        ['@babel/plugin-syntax-typescript', { isTS: true }],
        function stripTypesPlugin() {
          return {
            visitor: {
              TSInterfaceDeclaration(path) {
                path.remove();
              },
              TSTypeAliasDeclaration(path) {
                path.remove();
              },
              TSAsExpression(path) {
                path.replaceWith(path.node.expression);
              },
              Identifier(path) {
                if (path.node.typeAnnotation) {
                  path.node.typeAnnotation = null;
                }
                if (path.node.optional) {
                  path.node.optional = false;
                }
              },
              Function(path) {
                if (path.node.returnType) {
                  path.node.returnType = null;
                }
                if (path.node.typeParameters) {
                  path.node.typeParameters = null;
                }
              },
            },
          };
        },
      ],
    });

    return {
      code: toCommonJs(stripped && stripped.code ? stripped.code : sourceText),
    };
  },
};
