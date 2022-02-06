# SCHOR: SCHema-Overloaded Registry
A lot of the behaviour of a program can be defined by structured data.
SCHOR makes it easy to organize the data that describes your application
and prevents redundant code from creeping in with the "implies" feature.

```javascript
const { Registry } = require('schor');
const r = new Registry();

const path = require('path');

// Register data (type, name, value)
r.put('FilePath', 'mainConfig', 'myfile.json5');

// Define an implicator
r.imply(
    ['FilePath'], // Consume these values...
    ['FileExt'],  // ...to produce these values...

    // ...using this function
    ctx => {
        ctx.FileExt = path.extname(ctx.FilePath);
    }
);

// Get implied data
r.get('FileExt', 'mainConfig') // .json5

// Override implied data
r.put('FileExt', 'mainConfig', '.json');
```

## SCHOR Conventions

1. Use dotted path names for identifiers
   ```javascript
   r.put('FilePath', 'com.example.config.init', 'init.json5');
   ```
2. Use dotted path names for types when applicable
   ```javascript
   r.put('com.github.Username', 'com.example.author', 'KernelDeimos');
   ```
