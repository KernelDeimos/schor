const { Base } = require("emod");

class MemoryRegistry extends Base  {
    init () {
        this.interfaces_ = {};
    }

    async put (type, id, value) {
        if ( ! this.interfaces_[type] ) {
            this.interfaces_[type] = {};
        }
        this.interfaces_[type][id] = value;
    }

    async get (type, id) {
        const contextOfGet = { id, registry: this, values: {} };

        // TODO: initial value can be done in a Proxy getter
        const allOfType = this.interfaces_[type] ||
            ( this.interfaces_[type] = {} );
        if ( allOfType.hasOwnProperty(id) ) {
            return allOfType[id];
        }
    }

    imply (...args) {
    }
}

module.exports = { MemoryRegistry };
