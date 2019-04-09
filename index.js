const { Task, Wait, Pass, Choice, Succeed, Fail, Parallel } = require('./lib/handlers');
const Stepfunction = require('./lib/stepfunction');
const { loadFile } = require('./lib/helpers');
const SimpleResolver = require('./lib/simple-resolver');
const MapResolver = require('./lib/map-resolver');

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
    } else if (params.code) {
        return params.code;
    } else {
        throw new Error(`Need a stepfunction file or code`);
    }
};
class StepfunctionTester {
    constructor(params) {
        const stepfunction = load(params);
        const handlerFactory = params.handlerFactory || Handlers.factory;
        let lambdaResolver = params.lambdaResolver;
        if (lambdaResolver === 'simple') {
            lambdaResolver = SimpleResolver(params.lambdaPath || '.');
        } else if (lambdaResolver === 'map') {
            lambdaResolver = MapResolver(params.lambdas || '.');
        }
        const mocks = params.mocks || {};
        this.stepfunction = new Stepfunction({
            states: stepfunction.States,
            start: params.startStep ? params.startStep : stepfunction.StartAt,
            count: params.stepCount ? params.stepCount : false,
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
