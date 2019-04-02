const fs = require('fs');
const path = require('path');

const loadFile = file => {
    for (const f of [file, path.join(__dirname, file), path.join(path.dirname(require.main.filename), file)]) {
        try {
            if (fs.existsSync(f)) {
                return require(f);
            } else if (require.resolve(f)) {
                return require(f);
            }
        } catch (err) {
            // ignored;
        }
    }
    throw new Error(`Failed to load ${file}, file not found`);
}

const clone = data => {
    if (typeof data === 'undefined') {
        return data;
    }
    try {
        return JSON.parse(JSON.stringify(data));
    } catch (err) {
        throw new Error(`Failed to parse json: ${data}`);
    }
}

module.exports = {
    loadFile,
    clone,
}