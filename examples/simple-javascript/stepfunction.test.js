const StepfunctionTester = require('../../index');

const lambdas = {
    'arn:aws:lambda:region:account-id:function:step1': 'mock.js',
    'arn:aws:lambda:region:account-id:function:step2': 'mock.js',
    'arn:aws:lambda:region:account-id:function:step3': 'mock.js',
}

describe('This is a test', () => {
    test('Should work', async () => {
        const step = new StepfunctionTester({
            code: {
                "StartAt": "Step1",
                "States": {
                    "Step1": {
                        "Type": "Task",
                        "Resource": "arn:aws:lambda:region:account-id:function:step1",
                        "Next": "Step2"
                    },
                    "Step2": {
                        "Type": "Task",
                        "Resource": "arn:aws:lambda:region:account-id:function:step2",
                        "Next": "Step3"
                    },
                    "Step3": {
                        "Type": "Task",
                        "Next": "Done",
                        "Resource": "arn:aws:lambda:region:account-id:function:step3"
                    },
                    "Done": {
                        "Type": "Succeed"
                    }
                }
            }, 
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