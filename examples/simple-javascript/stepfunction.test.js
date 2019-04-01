const StepfunctionTester = require('../../index');

const lambdas = {
    'arn:aws:lambda:region:account-id:function:step1': 'mock.js',
    'arn:aws:lambda:region:account-id:function:step2': 'mock.js',
    'arn:aws:lambda:region:account-id:function:step3': 'mock.js',
}

describe('This is a test', () => {
    test('Should work', async () => {
        const step = new StepfunctionTester({
            file: __dirname + '/stepfunction.json', 
            lambdaResolver: (arn) => ({ file: lambdas[arn]})
        });

        const result = await step.run({
            value: 1
        }); 
        expect(result.output).toEqual({
            "value": 4
        })
    })
})