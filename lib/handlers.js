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

const getCaster = (type) => {
    if (type === 'String') {
        return v => String(v);
    } else if (type === 'Numeric') {
        return v => Number(v);
    } else if (type === 'Boolean') {
        return v => Boolean(v);
    } else if (type === 'Timestamp') {
        return v => Date.parse(v);
    } else {
        throw new Error(`Unknown type in Choice: ${type}`)
    }
}
const getOperator = (op) => {
    if (op === 'Equals') {
        return (v1, v2) => v1 == v2;
    } else if (op === 'GreaterThan') {
        return (v1, v2) => v1 > v2;
    } else if (op === 'GreaterThanEquals') {
        return (v1, v2) => v1 >= v2;
    } else if (op === 'LessThan') {
        return (v1, v2) => v1 < v2;
    } else if (op === 'LessThanEquals') {
        return (v1, v2) => v1 <= v2;
    } else {
        throw new Error(`Unknown operator in Choice: ${op}`)
    }
}
class Choice extends Handler {
    constructor(step, context) {
        super(step, context);
    }
    evalChoice(input, choice) {
        if (choice.Not) {
            return !this.evalChoice(input, choice.Not);
        }
        if (choice.Or) {
            for (const c of choice.Or) {
                if (this.evalChoice(input, c)) {
                    return true;
                }
            }
            return false;
        }
        if (choice.And) {
            for (const c of choice.And) {
                if (!this.evalChoice(input, c)) {
                    return false;
                }
            }
            return true;
        }
        const keys = Object.keys(choice).map(k => k.match(/(String|Numeric|Boolean|Timestamp)(.*)/)).filter(k => k && k.length == 3);
        if (!keys || keys.length !== 1) {
            throw new Error(`Unsupported operator used in choice: ${JSON.stringify(choice)}`);
        }
        const key = keys[0];
        const value2 = choice[key[0]];
        const caster = getCaster(key[1]);
        const op = getOperator(key[2]);
        const value1 = jp.query(input, choice.Variable);
        if (op(caster(value1), value2)) {
            return true;
        }
        return false;
    }
    async run(input) {
        for (const choice of this.step.Choices) {
            if (this.evalChoice(input, choice)) {
                return this.makeResponse(input, choice.Next, false, { selected: choice });
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