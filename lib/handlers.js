const jp = require('jsonpath');
const { loadFile } = require('./helpers');
const Stepfunction = require('./stepfunction');
const { clone } = require('./helpers');

class Handler {
    constructor(step, context) {
        this.step = step.definition;
        this.name = step.name;
        this.context = context;
    }
    doMock(mock, input) {
        if (Object.keys(this.context.mocks).includes(mock)) {
            const fun = this.context.mocks[mock];
            fun(input);
        }
    }
    doBeforeMocks(input) {
        this.doMock('beforeEach', input);
        this.doMock(this.name, input);
    }
    doAfterMocks(input) {
        this.doMock('afterEach', input);
    }
    makeResponse(result, next = undefined, end = undefined, extra = {}) {
        return {
            extra,
            next: next || this.step.Next,
            data: result,
            end: end || this.step.End,
        };
    }
}

class Task extends Handler {
    constructor(step, context) {
        super(step, context);
    }
    loadLambda(arn) {
        const lambda = this.context.lambdaResolver(this.step.Resource);
        if (lambda.file) {
            const functionName = lambda.function || 'handler';
            const file = loadFile(lambda.file);
            return file[functionName];
        } else if (lambda.function) {
            return lambda.function;
        } else {
            throw new Error(`Lambda resolver returned invalid value for ${arn}`);
        }
    }
    async run(input) {
        this.doBeforeMocks(input);
        const fun = this.loadLambda(this.step.Resource);
        const result = await fun(input);
        this.doAfterMocks(input);
        return this.makeResponse(result);
    }
}

class Wait extends Handler {
    constructor(step, context) {
        super(step, context);
    }
    async run(input) {
        return this.makeResponse(input);
    }
}

class Pass extends Handler {
    constructor(step, context) {
        super(step, context);
    }
    async run(input) {
        return this.makeResponse(input);
    }
}

class Succeed extends Handler {
    constructor(step, context) {
        super(step, context);
    }
    async run(input) {
        return this.makeResponse(input, undefined, true);
    }
}

class Fail extends Handler {
    constructor(step, context) {
        super(step, context);
    }
    async run(input) {
        return this.makeResponse(input, undefined, true, { Cause: this.step.Cause, Error: this.step.Error });
    }
}

class Choice extends Handler {
    constructor(step, context) {
        super(step, context);
    }
    async run(input) {
        for (const choice of this.step.Choices) {
            if (choice.StringEquals) {
                const value = jp.query(input, choice.Variable);
                if (value == choice.StringEquals) {
                    return this.makeResponse(input, choice.Next, false, { selected: choice });
                }
            } else {
                return {
                    data: input,
                    end: true,
                    error: `Unknown operator: ${JSON.stringify(choice)}`,
                };
            }
        }
        return this.makeResponse(input, this.step.Default, this.step.End, { selected: 'default' });
    }
}

class Parallel extends Handler {
    constructor(step, context) {
        super(step, context);
    }
    async run(input) {
        const branches = [];
        for (const branch of this.step.Branches) {
            const subStep = new Stepfunction({
                states: branch.States,
                start: branch.StartAt,
                mocks: this.context.mocks,
                lambdaResolver: this.context.lambdaResolver,
                handlerFactory: this.context.handlerFactory,
            });
            branches.push(await subStep.run(clone(input)));
        }
        const output = branches.map(branch => branch.output);
        return this.makeResponse(output, this.step.Next, false, { branches });
    }
}

module.exports = {
    Task, Wait, Pass, Choice, Succeed, Fail, Parallel
}