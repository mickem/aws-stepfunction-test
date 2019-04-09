const fs = require('fs');
const path = require('path');

const cleanName = resource => {
    if (resource.startsWith('arn:')) {
        const m = resource.match(/function:(.*)[:^]/);
        if (m) {
            return m[1].toLowerCase();
        } else {
            throw new Error(`Failed to parse arn: ${resource}`);
        }
    } else if (resource.startsWith('$')) {
        resource = resource.replace('Lambda', '');
        resource = resource.replace('.Arn', '');
        resource = resource.replace('${', '');
        resource = resource.replace('}', '');
        return resource.replace(/\W/g, '').toLowerCase();
    }
    return resource.replace(/\W/g, '').toLowerCase();
}

const stripExt = filename => filename.split('.').slice(0, -1).join('.')
const findFile = (lambdaPath, file) => {
    for (const currentPath of [lambdaPath, path.join(__dirname, lambdaPath), path.join(path.dirname(require.main.filename), lambdaPath)]) {
        for (const f of fs.readdirSync(currentPath)) {
            if (stripExt(f).replace(/\W/g, '').toLowerCase() === file) {
                return path.join(currentPath, f);
            }
        }
    }
    return undefined;
}
const simpleResource = (lambdaPath) => (resource) => {
    const name = cleanName(resource);
    const file = findFile(lambdaPath, name);
    if (file) {
        return {
            file,
            function: 'handler',
        };
    }
    throw new Error(`Failed to find file matching: ${name} in ${lambdaPath} for (${resource})`);
};

module.exports = simpleResource;
