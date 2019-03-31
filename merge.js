const client = require('./client');

const handler = (input) => {
    return {
        branches: input.map(b => b.branch).join(', '),
        foo: input[0].foo,
        something: input[0].something,
        flag: input[0].flag,
    }
}

module.exports = {
    handler,
};