# AWS Stepfunction unit tester

This is intended to allow unit testing of stepfunctions.
This is not intended to replace integration test but instead allow for quick unit testing in a mocked scenarios.
It is aimed at stepfunctions written in node.js (Javascript and Typescript et.al.). 
Test are intended to be executed from within a Javascript test frmework such as Jest.
Lambda functions have to be resolved locally.

[![Build Status](https://travis-ci.org/mickem/aws-stepfunction-test.svg?branch=master)](https://travis-ci.org/mickem/aws-stepfunction-test) [![npm version](https://badge.fury.io/js/aws-stepfunction-test.svg)](https://badge.fury.io/js/aws-stepfunction-test)

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

### Mocking

It also supports mocking function (both entire functions and mocking inside lambdas) to faciliate easy testing.

```javascript
// ...

describe('This is a test', () => {
    test('Should work', async () => {
        const step = new StepfunctionTester({
            file: 'stepfunction.json', 
            lambdaResolver: (arn) => ({ file: lambdas[arn]}),
            mocks: {
                beforeEach: () => {
                    // Using before each we can mock things for all States.
                    jest.spyOn(client, 'foo').mockImplementation(() => 'test1')
                },
                afterEach: () => {
                    jest.restoreAllMocks();
                },
                step1: (input) => {
                    // You can also create a spcific mock step for each State
                    if (input.flag === 'test1') {
                        // We can also use the input to determine what we should mock to mock different outcomes
                        jest.spyOn(client, 'bar').mockImplementation(() => 'test2')
                    } else {
                        jest.spyOn(client, 'bar').mockImplementation(() => 'end')
                    }
                }
            }
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

* [Simple javascript example](./examples/simple-javascript/stepfunction.test.js).
* [A complete javascript example which uses mocks and similar features](./examples/full-javascript/stepfunction.test.js)
* [An example where we have lambdas in another language and we mock them away](./examples/non-javascript/stepfunction.test.js)

## Unsupported things

As this is an early prototype there are some things which are not supported (yet).
 * Loading stepfunctions/Lambdas from cloudformation templates
 * All: InputPath, OutputPath (planned next)
 * Pass: Result, ResultPath, Parameters 
 * Task: Parameters, ResultPath, Retry, Catch, TimeoutSeconds, HeartbeatSeconds 

**Unsupported by intent:**

A few features are ignored by intent as the idea is not to be a stepfunction runner but a way to test stepfunctions.
 * All: Comment: As they do not affect logic ignoring them seems the best option.
 * Wait: Seconds, Timestamp, SecondsPath, TimestampPath. For unit testing it does not make sense to wait (use time mocking and validating input/outout) instead.
