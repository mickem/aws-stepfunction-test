const { clone } = require('./helpers');

class Stepfunction {
    constructor(params) {
        this.states = params.states;
        this.start = params.start;
        this.mocks = params.mocks;
        this.count = params.count || false;
        this.handlerFactory = params.handlerFactory;
        this.lambdaResolver = params.lambdaResolver;
    }

    async evaluate(step, input) {
        const handler = this.handlerFactory(step, this);
        return await handler.run(input);
    }
    getStep(name) {
        if (!Object.keys(this.states).includes(name)) {
            throw new Error(`Failed to find step for: ${name}`);
        }
        return {
            type: this.states[name].Type,
            name,
            definition: this.states[name],
        };
    }
    async run(input) {
        const start = new Date().getTime();
        let currentStep = this.getStep(this.start);
        let data = input;
        const trail = [];
        let count = 0;
        /*eslint-disable no-constant-condition*/
        while (true) {
            const inputClone = clone(data);
            let result = undefined;
            try {
                result = await this.evaluate(currentStep, data);
            } catch (err) {
                console.error(`Input which caused exception in ${currentStep.name} was: ${JSON.stringify(data)}`);
                console.error(`Exception in ${currentStep.name} after: ${trail.map(t => t.name).join(', ')}, ${err.message}`, err);
                throw err;
            }
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
                    getSteps: name => trail.filter(t => t.name === name),
                };
            }
            data = result.data;
            currentStep = this.getStep(result.next);
            const duration = new Date().getTime() - start;
            if (duration > 5000) {
                throw new Error(`Test timedout after ${duration}ms`);
            }
            if (this.count && ++count >= this.count) {
                return {
                    trail: trail,
                    output: result.data,
                    getSteps: name => trail.filter(t => t.name === name),
                };
            }
        }
    }
}

module.exports = Stepfunction;