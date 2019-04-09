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

const mapResource = (lambdas) => (resource) => {
    const name = cleanName(resource);
    const file = lambdas[name];
    if (file) {
        return {
            file,
            function: 'handler',
        };
    }
    throw new Error(`Failed to find file matching: ${name} in map for (${resource})`);
};

module.exports = mapResource;
