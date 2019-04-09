jest.mock('./client');
const client = require('./client');
const StepfunctionTester = require('../../index');

describe('Sample test with javascript lambdas', () => {
    test('A simple case with mocks as well as simple lambda resolver', async () => {
        const mocks = {
            beforeEach: () => {
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
        const step = new StepfunctionTester({
            file: 'stepfunction.json', 
            mocks,
            // The simple lambda resolver will translate ${myWickedLambda.Arn} in to my-wicked.handler
            // But you can override to whatever you have.
            lambdaResolver: 'simple',
        });

        const result = await step.run({
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
    test('Same stepfunction in another scenario', async () => {
        // Because stepfunctions are quick (as there are no waits/delays) you can re-run the stepfunction for various scenarios
        const mocks = {
            beforeEach: () => {
                client.foo.mockImplementation(() => 'wicked')
            },
            CheckStatus: () => {
                client.foo.mockImplementation(() => 'error')
            },
            afterEach: () => {
                jest.restoreAllMocks();
            }
        }
        const step = new StepfunctionTester({
            file: 'stepfunction.json', 
            mocks,
            lambdaResolver: 'simple',
        });

        const result = await step.run({
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
    test('Using a lambda map instead of simple resolver', async () => {
        const mocks = {
            beforeEach: () => {
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
        const step = new StepfunctionTester({
            file: 'stepfunction.json', 
            mocks,
            // The simple lambda resolver will translate ${myWickedLambda.Arn} in to my-wicked.handler
            // But you can override to whatever you have.
            lambdas: {
                branch1: 'branch1.js',
                branch2: 'branch2.js',
                check: 'check.js',
                client: 'client.js',
                merge: 'merge.js',
                setup: 'setup.js'
            },
            lambdaResolver: 'map',
        });

        const result = await step.run({
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

})