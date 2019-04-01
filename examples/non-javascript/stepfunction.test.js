const StepfunctionTester = require('../../index');

// Since we can not "execute" non javascript code, we can mock the behaviour based on the input.
const lambdas = {
    'arn:aws:lambda:region:account-id:function:step1': (input) => {
        if (input.value > 0) {
            return {
                value: 5,
            }
        } 
        return input;
    },
    'arn:aws:lambda:region:account-id:function:step2': (input) => input,
    'arn:aws:lambda:region:account-id:function:step3': (input) => input,
}

describe('This is a test', () => {
    test('Should work', async () => {
        const step = new StepfunctionTester({
            file: __dirname + '/stepfunction.json',
            // Return a function in the lambdaResolver
            lambdaResolver: (arn) => ({ function: lambdas[arn]})
        });

        // Validate the stepfunction given different inputs
        expect(await step.run({ value: 0 })).toHaveProperty('output', { "value": 0 })

        expect(await step.run({ value: 10 })).toHaveProperty('output', { "value": 5 })
    })
})