# AWS Stepfunction unit tester

This is intended to allow unit testing of stepfunctions.
This is not intended to replace integration test but instead allow for quick unit testing in a mocked scenarios.
It is aimed at stepfunctions written in node.js (Javascript and Typescript et.al.). 
Test are intended to be executed from within a Javascript test frmework such as Jest.
Lambda functions have to be resolved locally.

## Usage

Quick example of using the tester to validate running a stepfunction with various mocked responses.
Here we do not mock the lambda instead we mock the remote client the lambda function is using. Thus we are including the logic in the lambdas in the test.
You can opt to mock the lambda instead using the similar methods.

```javascript
jest.mock('./client');
const client = require('./client');
const StepfunctionTest = require('./stepfunction-tester');

describe('This is a test', () => {
    test('Should work', async () => {
        const mocks = {
            beforeEach: (input) => {
                // Using before each we can mock things for all States.
                client.foo.mockImplementation(() => 'test1')
            },
            CheckStatus: (input) => {
                // You can also create a spcific mock step for each State
                if (input.flag === 'test1') {
                    // We can also use the input to determine what we should mock to mock different outcomes
                    client.foo.mockImplementation(() => 'test2')
                } else {
                    client.foo.mockImplementation(() => 'end')
                }
            }
        }
        const step = new StepfunctionTest({
            file: './stepfunction.json', 
            mocks,
            // The simple lambda resolver will translate ${myWickedLambda.Arn} in to my-wicked.handler
            // But you can override to whatever you have.
            lambdaResolver: StepfunctionTest.simpleLambdaResource,
        });

        const result = step.run({
            something: 'else',
        }); 
        // The result is quite large
        expect(result).toMatchSnapshot();
        // We assert on anything that happened by using the trail output variable.
        expect(result.trail.map(t => t.name)).toEqual([
            "Start",
            "SetupStuff",
            "MergeIt",
            "WhatShouldWeDo",
            "TryAgain",
            "CheckStatus",
            "WhatShouldWeDo",
            "TryAgain",
            "CheckStatus",
            "WhatShouldWeDo",
            "Done",
        ]);
        // We can also asser on the actual rsulting output
        expect(result.output).toEqual({
            "branches": "branch 1, branch 2",
            "flag": "end",
            "foo": "bar",
            "something": "else",
        })
    })
    test('Should fail', async () => {
        // Because stepfunctions are quick (as there are no waits/delays) you can re-run the stepfunction for various scenarios
        const mocks = {
            beforeEach: (input) => {
                client.foo.mockImplementation(() => 'wicked')
            },
            CheckStatus: (input) => {
                client.foo.mockImplementation(() => 'error')
            }
        }
        const step = new StepfunctionTest({
            file: './stepfunction.json', 
            mocks,
            lambdaResolver: StepfunctionTest.simpleLambdaResource,
        });

        const result = step.run({
            something: 'else',
        });
        expect(result).toMatchSnapshot();
        expect(result.trail.map(t => t.name)).toEqual([
            "Start",
            "SetupStuff",
            "MergeIt",
            "WhatShouldWeDo",
            "TryAgain",
            "CheckStatus",
            "WhatShouldWeDo",
            "Fail"
        ]);
        expect(result.output).toEqual({
            "branches": "branch 1, branch 2",
            "flag": "error",
            "foo": "bar",
            "something": "else",
        })
    })
})
```

## Unsupported things

As this is an early prototype there are many things which are not supported (yet).
 * Loading stepfunctions/Lambdas from cloudformation templates
 * All: InputPath, OutputPath 
 * Pass: Result, ResultPath, Parameters 
 * Task: Parameters, ResultPath, Retry, Catch, TimeoutSeconds, HeartbeatSeconds 
 * Choice: All operators except StringEquals (will be added next)

**Unsupported by intent:**

 * All: Comment: Does not affect logic.
 * Wait: Seconds, Timestamp, SecondsPath, TimestampPath. For unit testing it does not make sense to wait.
