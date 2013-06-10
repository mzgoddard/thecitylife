#!/usr/bin/env waf

def options(ctx):
    ctx.load('compiler_c')

def configure(ctx):
    ctx.load('compiler_c')

    ctx.env.CFLAGS = '-g'

def build(bld):
    bld.stlib(
        source=bld.path.ant_glob('src/obj/*.c'),
        includes='.',
        target='libobj'
    )

    bld.stlib(
        source=bld.path.ant_glob('src/pphys/*.c'),
        includes='.',
        target='libpphys',
        use='libobj'
    )

    bld.stlib(
        source='test/runner/runner.c test/runner/resultformatter.c',
        includes='.',
        target='libtest'
    )

    bld.program(
        source=bld.path.ant_glob('test/main.c test/obj/*.c test/pphys/*.c'),
        includes='.',
        target='cmdtest',
        use='libtest libobj libpphys'
    )
