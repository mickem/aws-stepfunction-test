const { Task, Wait, Pass, Choice, Succeed, Fail, Parallel } = require('./lib/handlers');
const Stepfunction = require('./lib/stepfunction');
const { loadFile } = require('./lib/helpers');

const simpleLambdaResource = resource => {
    resource = resource.replace('Lambda', '');
    resource = resource.replace('.Arn', '');
    resource = resource.replace('${', '');
    resource = resource.replace('}', '');
    let file = resource.replace(/([A-Z])/g, g => `-${g[0].toLowerCase()}`);
    if (file.length > 0 && file[0] === '-') {
        file = file.substring(1);
    }
    return {
        file,
        function: 'handler',
    };
};

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
    },
};

const load = params => {
    if (params.file) {
        return loadFile(params.file);
    } else {
        throw new Error(`Need a stepfunction file`);
    }
};
class StepfunctionTester {
    constructor(params) {
        const stepfunction = load(params);
        const handlerFactory = params.handlerFactory || Handlers.factory;
        let lambdaResolver = params.lambdaResolver || simpleLambdaResource;
        if (lambdaResolver === 'simple') {
            lambdaResolver = simpleLambdaResource;
        }
        const mocks = params.mocks || {};
        this.stepfunction = new Stepfunction({
            states: stepfunction.States,
            start: stepfunction.StartAt,
            mocks,
            handlerFactory,
            lambdaResolver,
        });
    }

    async run(input) {
        return await this.stepfunction.run(input);
    }
}

module.exports = StepfunctionTester;
