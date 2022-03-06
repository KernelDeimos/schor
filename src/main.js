const { Base } = require('emod');
const { ImplicatorNotApplicableError, ImplicatorContext, Implicator, ImplicatorRegistry } = require('./registry/ImplicatorRegistry');
const { MemoryRegistry } = require('./registry/MemoryRegistry');
const { ProxyRegistry } = require('./registry/Registry');

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

class Registry extends ImplicatorRegistry {
    init () {
        // TODO: fix grossness of this constructor call (probably in emod itself)
        ImplicatorRegistry.prototype.init.apply(this, arguments);

        this.delegate_ = new MemoryRegistry();
    }
}

module.exports = {
    Registry,
    ProxyRegistry,
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