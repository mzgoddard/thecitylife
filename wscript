#!/usr/bin/env waf

import os
from waflib.Scripting import run_command
from waflib.Build import BuildContext, CleanContext, \
    InstallContext, UninstallContext

def options(ctx):
    ctx.load('compiler_c')

def configure(ctx):
    env = ctx.env
    ctx.setenv('debug', env)
    ctx.load('compiler_c')
    try:
        ctx.find_program( 'clang' )
        ctx.env.CC = 'clang'
        ctx.env.LINK_CC = 'clang'
    except:
        pass

    ctx.check_cfg(
        path='sdl-config', args='--cflags --libs',
        package='', uselib_store='SDL'
    )
    ctx.check_cfg(
        path='pkg-config', args='SDL_gfx --cflags --libs',
        package='', uselib_store='SDL_gfx'
    )
    ctx.check_cfg(
        path='pkg-config', args='SDL_image --cflags --libs',
        package='', uselib_store='SDL_image'
    )

    ctx.env.FRAMEWORK = [ 'Cocoa', 'OpenGL' ]

    cc_env = ctx.env
    ctx.env.CFLAGS = [ '-g' ]
    ctx.env.DEFINES = [ 'ANSI_COLOR=1' ]

    ctx.setenv('release', cc_env)
    ctx.env.CFLAGS = [ '-g', '-O4', '-std=gnu99' ]
    ctx.env.LINKFLAGS = [ '-O4' ]
    ctx.env.DEFINES = [ 'ANSI_COLOR=1', 'kParticleCount=8192' ]

    ctx.setenv('emcc', env)
    ctx.load('compiler_c')
    ctx.env.CC = ctx.find_program(
        'emcc',
        path_list=os.path.abspath('vendor/emscripten')
    )
    ctx.env.IS_EMSCRIPTEN = True
    ctx.env.LINK_CC = ctx.env.CC
    ctx.env.CFLAGS = [ '-O2' ]
    ctx.env.LINKFLAGS = [ '-O2' ]
    ctx.env.DEFINES = [ 'ANSI_COLOR=1' ]
    ctx.env.cprogram_PATTERN = '%s.js'

    emcc_env = ctx.env

    ctx.setenv('emcc_html', emcc_env)
    ctx.env.CFLAGS = [ '-O2', '-s', 'ASM_JS=1' ]
    ctx.env.LINKFLAGS = [ '-O2', '-s', 'ASM_JS=1' ]
    ctx.env.DEFINES = [ 'kParticleCount=8192' ]
    ctx.env.cprogram_PATTERN = '%s.html'
    print ctx.env

from waflib.TaskGen import after_method,before_method,feature,taskgen_method,extension

from waflib.Node import Node

# relative include paths for emcc
@feature('c','cxx','d','asm','fc','includes')
@after_method('propagate_uselib_vars','process_source','apply_incpaths')
def apply_incpaths_emcc(self):
    if self.env.CC.endswith('emcc'):
        lst=self.to_incnodes(
            self.to_list(getattr(self,'includes',[])) +
                self.env['INCLUDES']
        )
        self.includes_nodes=lst
        self.env['INCPATHS'] = [x.path_from(self.bld.bldnode) for x in lst]

def build(bld):
    # Force emscripten to optimize compiled objects.
    os.environ['EMCC_OPTIMIZE_NORMALLY'] = '1'

    if bld.variant == '' and bld.cmd == 'build':
        for x in 'debug release emcc emcc_html'.split():
            run_command(x)
        return

    bld.objects(
        source=bld.path.ant_glob('src/obj/*.c'),
        includes='.',
        target='libobj'
    )

    bld.objects(
        source=bld.path.ant_glob('src/pphys/*.c'),
        includes=['./src', '.'],
        target='libpphys',
        use='libobj'
    )

    bld.objects(
        source=bld.path.ant_glob('src/input/*.c'),
        includes=['./src', '.'],
        target='libinput',
        use='libobj'
    )

    bld.objects(
        source=bld.path.ant_glob('src/pphys/*.c'),
        includes=['./test', '.'],
        target='libpphystest',
        use='libobj'
    )

    bld.objects(
        source='test/runner/runner.c test/runner/resultformatter.c',
        includes='.',
        target='libtest'
    )

    bld.program(
        source=bld.path.ant_glob('test/main.c test/obj/*.c test/pphys/*.c'),
        includes=['./test', '.'],
        target='cmdtest',
        use='libtest libobj libpphystest'
    )

    if bld.cmd == 'emcc':
        bld(
            rule='cp ${SRC} ${TGT}',
            source='src/platform/web/watertest.html',
            target='watertest.html'
        )

        bld(
            rule='cp ${SRC} ${TGT}',
            source='src/platform/web/spaceleaper.html',
            target='spaceleaper.html'
        )

    watertestSource = bld.path.ant_glob(
        'src/game/flowline.c src/game/watertest.c ' +
        'src/platform/sdl/*.c'
    )

    spaceLeaperSource = bld.path.ant_glob(
        'src/game/camera.c ' +
        'src/game/flowline.c src/game/asteroid.c src/game/spaceleaper.c ' +
        'src/platform/sdl/*.c'
    )

    if bld.cmd in [ 'emcc', 'emcc_html' ]:
        bld.program(
            source=watertestSource,
            includes=['./src', '.'],
            target='watertest',
            use='libobj libpphys libinput'
        )

        bld.program(
            source=spaceLeaperSource,
            includes=['./src', '.'],
            target='spaceleaper',
            use='libobj libpphys libinput'
        )

    if bld.cmd in [ 'debug', 'release' ]:
        bld.program(
            source=watertestSource,
            includes=['./src', '.'],
            target='watertest',
            framework=[ 'Cocoa', 'OpenGL' ],
            use='libobj libpphys libinput SDL SDL_gfx SDL_image'
        )

        bld.program(
            source=spaceLeaperSource,
            includes=['./src', '.'],
            target='spaceleaper',
            framework=[ 'Cocoa', 'OpenGL' ],
            use='libobj libpphys libinput SDL SDL_gfx SDL_image'
        )

for x in 'debug release emcc emcc_html'.split():
    for y in (BuildContext, CleanContext, InstallContext, UninstallContext):
        if y != BuildContext:
            name = y.__name__.replace('Context','').lower() + '_'
        else:
            name = ''
        class tmp(y): 
            cmd = name + x
            variant = x
