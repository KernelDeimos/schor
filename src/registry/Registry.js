const { Base } = require("emod");

class Registry extends Base {
    init () {
        this.interfaces_ = {};
        this.implicators_ = {};
        if ( ! this.tracer ) this.tracer = new NullTracer();
    }

    async put (type, id, value) {
        if ( ! this.interfaces_[type] ) {
            this.interfaces_[type] = {};
        }
        this.interfaces_[type][id] = value;
    }

    async get (type, id) {
        this.tracer.log('registry.get.invoked', { type, id });
        const contextOfGet = { id, registry: this, values: {} };

        // TODO: initial value can be done in a Proxy getter
        const allOfType = this.interfaces_[type] ||
            ( this.interfaces_[type] = {} );
        if ( allOfType.hasOwnProperty(id) ) {
            this.tracer.log('registry.get.returned', {
                type, id, value: allOfType[id]
            });
            return allOfType[id];
        }

        // Find an implication
        const implicators = this.implicators_[type] || [];
        for ( let implicator of implicators ) {
            const success = await implicator.run(contextOfGet);
            if ( success ) {
                const value = contextOfGet.values[type];
                this.tracer.log('registry.get.returned', {
                    type, id, implicator, value
                });
                return value;
            }
        }

        this.tracer.log('registry.get.returned', {
            type, id, value: undefined
        });
        // return undefined
    }

    imply (...args) {
        const usageError = `Usage: Registry.imply(Array,Array,Function)`;
        if ( args.length < 3 ) {
            throw new Error(usageError);
        }
        if ( ! Array.isArray(args[0]) ) throw new Error(usageError);
        if ( ! Array.isArray(args[1]) ) throw new Error(usageError);
        if ( typeof args.slice(-1)[0] !== 'function' ) {
            throw new Error(usageError);
        }

        return this.imply_(new Implicator({
            inputTypes: args[0],
            outputTypes: args[1],
            functions: args.slice(2),
        }));
    }

    imply_ (implicator) {
        for ( let outputType of implicator.outputTypes ) {
            // TODO: this can be done in a Proxy getter
            if ( ! this.implicators_[outputType] ) {
                this.implicators_[outputType] = [];
            }

            this.implicators_[outputType].push(implicator);
        }
    }
}

const ProxyRegistry = Registry.toProxyClass();

module.exports = { Registry, ProxyRegistry };
