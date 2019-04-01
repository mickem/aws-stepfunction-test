# AWS Stepfunction unit tester

This is intended to allow unit testing of stepfunctions.
This is not intended to replace integration test but instead allow for quick unit testing in a mocked scenarios.
It is aimed at stepfunctions written in node.js (Javascript and Typescript et.al.). 
Test are intended to be executed from within a Javascript test frmework such as Jest.
Lambda functions have to be resolved locally.

## Usage

```bash
npm install --save-dev aws-stepfunction-test
```
Then assuming you have your stepfunction in `stepfunction.json` you can create the following test runner (`stepfunction.test.js`):
```javascript
const StepfunctionTester = require('aws-stepfunction-test');

// Map various lambda references to javascript functions.
const lambdas = {
    'arn:aws:lambda:region:account-id:function:step1': 'mock.js',
    'arn:aws:lambda:region:account-id:function:step2': 'mock.js',
    'arn:aws:lambda:region:account-id:function:step3': 'mock.js',
}

describe('This is a test', () => {
    test('Should work', async () => {
        const step = new StepfunctionTester({
            file: 'stepfunction.json', 
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
```

Some more details examples:

* [Simple javascript example](./examples/simple-javascript).
* [A complete javascript example which uses mocks and similar features](./examples/full-javascript)
* [AN example where we have lambdas in another language and we mock them away](./examples/non-javascript)

## Unsupported things

As this is an early prototype there are some things which are not supported (yet).
 * Loading stepfunctions/Lambdas from cloudformation templates
 * All: InputPath, OutputPath 
 * Pass: Result, ResultPath, Parameters 
 * Task: Parameters, ResultPath, Retry, Catch, TimeoutSeconds, HeartbeatSeconds 
 * Choice: All operators except StringEquals (will be added next)

**Unsupported by intent:**

A few features are ignored by intent as the idea is not to be a stepfunction runner but a way to test stepfunctions.
 * All: Comment: As they do not affect logic ignoring them seems the best option.
 * Wait: Seconds, Timestamp, SecondsPath, TimestampPath. For unit testing it does not make sense to wait (use time mocking and validating input/outout) instead.
