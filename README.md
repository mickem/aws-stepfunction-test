# AWS Stepfunction unit tester

This is intended to allow unit testing of stepfunctions.
This is not intended to replace integration test but instead allow for quick unit testing in a mocked scenarios.
It is aimed at stepfunctions written in node.js (Javascript and Typescript et.al.). 
Test are intended to be executed from within a Javascript test framework such as Jest.
Lambda functions have to be resolved locally.

[![Build Status](https://travis-ci.org/mickem/aws-stepfunction-test.svg?branch=master)](https://travis-ci.org/mickem/aws-stepfunction-test) [![npm version](https://badge.fury.io/js/aws-stepfunction-test.svg)](https://badge.fury.io/js/aws-stepfunction-test)

## Usage

```bash
npm install --save-dev aws-stepfunction-test
```
Then you can create a test case by in lining the stepfunction code and simulating the mock functions internally.
```javascript
const StepfunctionTester = require('../../index');

const mock = (input) => {
    return {
        value: input.value + 1,
    }
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
```

### Load step function code from a file

If you instead want to load the step-function code from a file you can place the step function code in a json file.
To load this file you can change the call to the constructor like so:

```javascript
const StepfunctionTester = require('../../index');

const mock = (input) => {
    return {
        value: input.value + 1,
    }
}

describe('This is a test', () => {
    test('Should work', async () => {
        const step = new StepfunctionTester({
            file: 'stepfunction.json', 
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
```
### Resolving actual lambdas

Often you might want to use the actual lambda functions which is used by the stepfunction.
The stepfunctions only specify the ARN or depending on if you load the json from a cloudformation template the replacement variable.
In either case you need to resolve the variable (ARN) into either (as we did above) the code or the file of the lambda function handler.

The simplest way to do this is to use the `simple` resolver which will strip off any control characters and try to find the files on the filesystem.
To use the simple resolver to resolve `Step-1.js`, `s-t-e-p-2.js` and `step3.js`:

```javascript
const StepfunctionTester = require('../../index');

describe('This is a test', () => {
    test('Should work', async () => {
        const step = new StepfunctionTester({
            file: 'stepfunction.json', 
            lambdaPath: '.',
            lambdaResolver: 'simple',
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

Yet another way to turn a lambda ARN into a function file is to use a map:

```javascript
const lambdas = {
    step1: 'step1.js'
    step2: 'step2.js'
    step3: 'step3.js'
}
```

This can then be used in the constructor like so:

```javascript
const StepfunctionTester = require('../../index');

const lambdas = {
    step1: 'step1.js'
    step2: 'step2.js'
    step3: 'step3.js'
}

describe('This is a test', () => {
    test('Should work', async () => {
        const step = new StepfunctionTester({
            file: 'stepfunction.json', 
            lambdas: lambdas,
            lambdaResolver: 'map',
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

### Testing certain steps

Often you do not want to integration test the entire step function instead focusing on a specific part.
This can be achieved by setting `startStep` and `stepsCount` which will set the start step and the number of steps to execute.

```javascript
const StepfunctionTester = require('../../index');

describe('This is a test', () => {
    test('Should work', async () => {
        const step = new StepfunctionTester({
            file: 'stepfunction.json', 
            lambdaResolver: 'simple',
            startStep: 'step2',
            stepsCount: 1
        });

        const result = await step.run({
            value: 1
        }); 
        expect(result.output).toEqual({
            "value": 2
        })
    })
})
```

### Mocking

It also supports mocking function (both entire functions and mocking inside lambdas) to facilitate easy testing.

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

## Examples

Some more details examples:

* [Inline example](./examples/inline-test/stepfunction.test.js).
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
 * Wait: Seconds, Timestamp, SecondsPath, TimestampPath. For unit testing it does not make sense to wait (use time mocking and validating input/output) instead.
