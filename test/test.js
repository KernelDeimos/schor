const { assert } = require('chai');

const { Registry } = require('../src/main');

// A simple transformation function for testing
const extname = filePath => filePath.split('.').slice(-1)[0];

describe('Registry', () => {
    it('should put() without throwing an Error', async () => {
        let r = new Registry();
        await r.put('FilePath', 'test', 'name.json5');
    })
    it('should imply() without throwing an Error', async () => {
        let r = new Registry();
        await r.imply(['a'], ['b'], ctx => {
            ctx.b = ctx.a;
        });
    })
    describe('#get()', () => {
        let r;
        beforeEach(() => {
            r = new Registry();
            r.put('FilePath', 'test', 'name.json5');
        });
        it('should get an explicit value', async () => {
            const value = await r.get('FilePath', 'test');
            assert.equal(value, 'name.json5');
        })
        it('should get an implied value', async () => {
            r.imply(['FilePath'], ['FileExt'], ctx => {
                ctx.FileExt = extname(ctx.FilePath);
            });
            const value = await r.get('FileExt', 'test');
            assert.equal(value, 'json5');
        })
    })
    describe('#imply()', () => {
        let r;
        beforeEach(() => {
            r = new Registry();
            r.put('FilePath', 'test', 'name.json5');
        });
        it('provides ctx.get() and ctx.put()', async () => {
            r.imply(['FilePath'], ['FileExt'], ctx => {
                ctx.put('FileExt', extname(ctx.get('FilePath')));
            });
            const value = await r.get('FileExt', 'test');
            assert.equal(value, 'json5');
        })
        it('works when a condition passes', async () => {
            r.imply(
                ['FilePath'], ['FileExt'],
                ctx => {
                    (() => {})(ctx);
                },
                ctx => {
                    ctx.FileExt = extname(ctx.FilePath);
                }
            );
            const value = await r.get('FileExt', 'test');
            assert.equal(value, 'json5');
        })
        it('does not provide a value when a condition fails', async () => {
            r.imply(
                ['FilePath'], ['FileExt'],
                ctx => {
                    ctx.cancel();
                },
                ctx => {
                    ctx.FileExt = extname(ctx.FilePath);
                }
            );
            const value = await r.get('FileExt', 'test');
            assert.equal(value, undefined);
        })
        it('works when implicators are chained', async () => {
            r.put('TypeA', 'name', 'a');
            r.imply(
                ['TypeA'], ['TypeB'],
                ctx => { ctx.TypeB = ctx.TypeA + 'b'; }
            )
            r.imply(
                ['TypeB'], ['TypeC'],
                ctx => { ctx.TypeC = ctx.TypeB + 'c'; }
            )
            const value = await r.get('TypeC', 'name');
            assert.equal(value, 'abc');
        })
        it('works when implicators are async', async () => {
            r.put('TypeA', 'name', 'a');
            r.imply(
                ['TypeA'], ['TypeB'],
                async ctx => { ctx.TypeB = ctx.TypeA + 'b'; }
            )
            r.imply(
                ['TypeB'], ['TypeC'],
                async ctx => { ctx.TypeC = ctx.TypeB + 'c'; }
            )
            const value = await r.get('TypeC', 'name');
            assert.equal(value, 'abc');
        })
        it('works with multiple input and multiple output implicators', async () => {
            r.put('TypeA', 'name', 'a');
            r.imply(
                ['TypeA'], ['Capitalized', 'Parenthesized'],
                ctx => {
                    ctx.Capitalized = ctx.TypeA.toUpperCase();
                    ctx.Parenthesized = `(${ctx.TypeA})`;
                }
            )
            r.imply(
                ['Capitalized'], ['DuploCapitalized'],
                ctx => {
                    ctx.DuploCapitalized = ctx.Capitalized + '' + ctx.Capitalized;
                }
            )
            r.imply(
                ['Parenthesized', 'DuploCapitalized'], ['DuploCapitalCall'],
                ctx => {
                    ctx.DuploCapitalCall = ctx.DuploCapitalized + ctx.Parenthesized;
                }
            )
            const value = await r.get('DuploCapitalCall', 'name');
            assert.equal(value, 'AA(a)');
        })
    })
});
