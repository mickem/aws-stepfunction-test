const client = require('./client');

const handler = (input) => {
    input.branch = "branch 2";
    return input;
}

module.exports = {
    handler,
};