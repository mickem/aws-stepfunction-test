const StepfunctionTester = require('../../index');

const mock = (input) => {
    return {
        value: input.value + 1,
    }
}

describe('Simple inline test with single mocked function', () => {
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
            lambdaResolver: () => ({ function: mock })
        });

        const result = await step.run({
            value: 1
        }); 
        expect(result.output).toEqual({
            "value": 4
        })
    })
})

describe('Testing startStep and stepCount', () => {
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
            lambdaResolver: () => ({ function: mock }),
            startStep: 'Step2',
            stepCount: 1
        });

        const result = await step.run({
            value: 1
        }); 
        expect(result.output).toEqual({
            "value": 2
        })
    })
})