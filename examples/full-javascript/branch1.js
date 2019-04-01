const client = require('./client');

const handler = (input) => {
    input.branch = "branch 1";
    return input;
}

module.exports = {
    handler,
};