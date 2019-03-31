var jp = require('jsonpath');

const simpleLambdaResource = (resource) => {
    resource = resource.replace('Lambda', '')
    resource = resource.replace('.Arn', '')
    resource = resource.replace('${', '')
    resource = resource.replace('}', '')
    let file = resource.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`);
    if (file.length > 0 && file[0] === '-') {
        file = file.substring(1);
    }
    return {
        file,
        function: 'handler',
    }
}
const clone = data => JSON.parse(JSON.stringify(data));

class Handler {
    constructor(step, context) {
        this.step = step.defenition;
        this.name = step.name
        this.context = context;
    }
    installMock(mock, input) {
        if (Object.keys(this.context.mocks).includes(mock)) {
            const fun = this.context.mocks[mock];
            fun(input);
        }
    }
    installMocks(input) {
        this.installMock('beforeEach', input);
        this.installMock(this.name, input);
    }
    makeResponse(result, next = undefined, end = undefined, extra = {}) {
        return {
            extra,
            next: next || this.step.Next,
            data: result,
            end: end || this.step.End,
        }
    }
}

class Task extends Handler {
    constructor(step, context) {
        super(step, context);
    }
    run(input) {
        this.installMocks(input);
        const lambda = this.context.lambdaResolver(this.step.Resource);
        const file = require(`./${lambda.file}`);
        const fun = file[lambda.function];
        const result = fun(input);
        return this.makeResponse(result);
    }
}

class Wait extends Handler {
    constructor(step, context) {
        super(step, context);
    }
    run(input) {
        return this.makeResponse(input);
    }
}

class Pass extends Handler {
    constructor(step, context) {
        super(step, context);
    }
    run(input) {
        return this.makeResponse(input);
    }
}

class Succeed extends Handler {
    constructor(step, context) {
        super(step, context);
    }
    run(input) {
        return this.makeResponse(input, undefined, true);
    }
}

class Fail extends Handler {
    constructor(step, context) {
        super(step, context);
    }
    run(input) {
        return this.makeResponse(input, undefined, true, { Cause: this.step.Cause, Error: this.step.Error });
    }
}

class Parallel extends Handler {
    constructor(step, context) {
        super(step, context);
    }
    run(input) {
        const branches = this.step.Branches.map(branch => {
            const subStep = new Stepfunction({ 
                states: branch.States, 
                start: branch.StartAt, 
                mocks: this.context.mocks,
                lambdaResolver: this.context.lambdaResolver,
            });
            return subStep.run(clone(input))
        })
        const output = branches.map(branch => branch.output);
        return this.makeResponse(output, this.step.Next, false, { branches });
    }
}

class Choice extends Handler {
    constructor(step, context) {
        super(step, context);
    }
    run(input) {
        for (const choice of this.step.Choices) {
            if (choice.StringEquals) {
                const value = jp.query(input, choice.Variable);
                if (value == choice.StringEquals) {
                    return this.makeResponse(input, choice.Next, false, {selected:choice});
                }
            } else {
                return {
                    data: input,
                    end: true,
                    error: `Unknown operator: ${JSON.stringify(choice)}`
                }
            }
        }
        return this.makeResponse(input, this.step.Default, this.step.End, {selected: 'default'});
    }
}

const Handlers = {
    Task: (step, context) => new Task(step, context),
    Wait: (step, context) => new Wait(step, context),
    Pass: (step, context) => new Pass(step, context),
    Choice: (step, context) => new Choice(step, context),
    Succeed: (step, context) => new Succeed(step, context),
    Fail: (step, context) => new Fail(step, context),
    Parallel: (step, context) => new Parallel(step, context),

    factory: (step, context) => {
        if (!Object.keys(Handlers).includes(step.type)) {
            throw new Error(`No handler for ${step.type}`);
        }
        return Handlers[step.type](step, context);
    }
}
class Stepfunction {
    constructor(params) {
        this.states = params.states;
        this.start = params.start;
        this.mocks = params.mocks;
        this.lambdaResolver = params.lambdaResolver;
    }

    eval(step, input) {
        return Handlers.factory(step, this).run(input);
    }
    getStep(name) {
        if (!Object.keys(this.states).includes(name)) {
            throw new Error(`Failed to find step for: ${name}`);
        }
        return {
            type: this.states[name].Type,
            name,
            defenition: this.states[name],
        }
    }
    run(input) {
        const start = new Date().getTime();
        let currentStep = this.getStep(this.start);
        let data = input;
        const trail = [];
        while (true) {
            const inputClone = clone(data);
            const result = this.eval(currentStep, data);
            trail.push({
                name: currentStep.name,
                input: inputClone,
                output: clone(result.data),
                result: result.extra,
            });
            if (result.end) {
                return {
                    trail: trail,
                    output: result.data,
                };
            }
            data = result.data;
            currentStep = this.getStep(result.next);
            const duration = new Date().getTime() - start;
            if (duration > 5000) {
                throw new Error(`Test timedout after ${duration}ms`);
            }
        }
    }    
}
const load = (params) => {
    if (params.file) {
        return require(params.file);
    } else {
        throw new Error(`Need a stepfunction file`);
    }
}
class StepfunctionTest {

    constructor(params) {
        const stepfunction = load(params);
        this.stepfunction = new Stepfunction({
            states: stepfunction.States, 
            start: stepfunction.StartAt, 
            mocks: params.mocks,
            lambdaResolver: params.lambdaResolver,
        });
    }

    run(input) {
        return this.stepfunction.run(input);
    }
}

StepfunctionTest.simpleLambdaResource = simpleLambdaResource;

module.exports = StepfunctionTest;