const client = require('./client');

const handler = (input) => {
    console.log(input);
    input.foo = "bar";
    input.flag = client.foo();
    return input;
}

module.exports = {
    handler,
};