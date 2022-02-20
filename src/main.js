class ImplicatorNotApplicableError extends Error {
    constructor () {
        super(ImplicatorNotApplicableError.name)
    }
}

class ImplicatorContext {
    constructor (implicator, { values, registry, id }) {
        this.implicator = implicator;
        this.values = {...values};
        this.outputValues = {};
        this.registry = registry;
        this.id = id;
        this.stillValid = true;
    }
    get (type) {
        if ( ! this.implicator.inputTypes.includes(type) ) {
            throw new ImplicatorNotApplicableError();
        }
        return this.values[type];
    }
    put (type, value) {
        this.registry.tracer.log('implicator.put', {
            type, value, implicator: this.implicator,
        });

        // Future 'get's should get this new value
        this.values[type] = value;
        // Store 'put's to update the real values later
        this.outputValues[type] = value;
    }
    cancel () {
        this.stillValid = false;
    }
}

class Implicator {
    constructor ({ inputTypes, outputTypes, functions }) {
        this.inputTypes = inputTypes;
        this.outputTypes = outputTypes;
        this.functions = functions;
    }

    async run (state) {
        const { values, registry, id } = state;

        const conditions = [...this.functions];
        const implicatorFn = conditions.pop();

        // Populate values cache
        for ( const inputType of this.inputTypes ) {
            if ( values[inputType] !== undefined ) continue;
            values[inputType] = await registry.get(inputType, id);
            if ( values[inputType] === undefined ) {
                return false;
            }
        }

        // Create 'ctx' object used by user-defined implicator functions
        const ctx_ = new ImplicatorContext(this, state);
        const ctx = new Proxy(ctx_, {
            get (ctx, prop) {
                if ( prop === 'set' ) console.warn('getting "ctx.set"; did you mean "ctx.put"?');
                return ctx[prop] !== undefined ? ctx[prop] : ctx.get(prop);
            },
            set (ctx, prop, val) {
                if ( ctx.hasOwnProperty(prop) ) {
                    ctx[prop] = val;
                    return true;
                }
                ctx.put(prop, val);
                return true;
            }
        });

        // TODO: Provide a way for conditions to specify a subset
        //       of input values as an optimization.
        for ( const condition of conditions ) {
            await condition(ctx);
            if ( ! ctx_.stillValid ) break;
        }

        if ( ! ctx_.stillValid ) return false;

        // Run the actual implicator function
        await implicatorFn(ctx);

        // Conditions were true and implicator was run; values can be updated now
        for ( let [k, v] of Object.entries(ctx_.outputValues) ) {
            values[k] = v;
        }

        return true;
    }
}

class NullTracer {
    log () {}
}

class DebugTracer {
    log (eventId, values) {
        values = { ...values };
        if ( values.implicator ) {
            values.implicator = [
                values.implicator.inputTypes,
                values.implicator.outputTypes
            ];
        }
        if ( values.value && values.value.constructor ) {
            values.value = `Class::${values.value.constructor.name}`;
        }
        console.log(`[${eventId}]`, values);
    }
}

class Registry {
    constructor (opt_options) {
        this.interfaces_ = {};
        this.implicators_ = {};
        const { tracer } = opt_options || {};
        this.tracer = tracer || new NullTracer();
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

class DefinitionsUtil {
    constructor (defs) {
        this.defs = defs;
    }
    toString() {
        let output = '';
        for ( const def of this.defs ) {
            output += def.toString() + '\n';
        }
        return output;
    }
}

module.exports = {
    Registry,
    Implicator,
    definitions: new DefinitionsUtil ([
        ImplicatorNotApplicableError,
        ImplicatorContext,
        Implicator,
        DebugTracer,
        NullTracer,
        Registry,
    ]),
};