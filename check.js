const client = require('./client');

const handler = (input) => {
    console.log(input);
    input.foo = "bar";
    input.flag = client.foo();
    if (input.flag === 'end') {
        console.log('end');
    } else if (input.flag === 'xxx') {
        console.log('xx');
    }
    return input;
}

module.exports = {
    handler,
};