#!/usr/bin/env waf

import os
import sys
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
    # ctx.env.CFLAGS = [ '-g', '-O4', '-std=gnu99', '-msse', '-msse2', '-msse3', '-msse4', '-msse4.1', '-msse4.2' ]
    ctx.env.LINKFLAGS = [ '-O4' ]
    # ctx.env.LINKFLAGS = [ '-O4', '-msse', '-msse2', '-msse3', '-msse4', '-msse4.1', '-msse4.2' ]
    ctx.env.DEFINES = [ 'ANSI_COLOR=1', 'kParticleCount=8192' ]

    ctx.setenv('emcc', env)
    ctx.load('compiler_c')
    ctx.env.CC = ctx.find_program(
        'emcc',
        path_list=os.path.abspath('vendor/emscripten')
    )
    ctx.env.IS_EMSCRIPTEN = True
    ctx.env.LINK_CC = ctx.env.CC
    # ctx.env.CFLAGS = []
    ctx.env.CFLAGS = [
        '-g4',
        '-O2',
        '-s', 'ASM_JS=1',
        '-s', 'FUNCTION_POINTER_ALIGNMENT=1',
    ]
    ctx.env.LINKFLAGS = [
        '-g4',
        '-s', 'EXPORTED_FUNCTIONS=[\'_main\',\'_malloc\',\'_pauseSpaceLeaper\',\'_resumeSpaceLeaper\',\'_setSpaceLeaperEndCallback\',\'_setSpaceLeaperVisitedCallback\',\'_setSpaceLeaperResourceCallback\',\'_setEventListener\']',
        '-s', 'TOTAL_MEMORY=67108864',
        '-s', 'RESERVED_FUNCTION_POINTERS=16',
        '-s', 'FUNCTION_POINTER_ALIGNMENT=1',
        '-s', 'ASM_JS=1',
        '-O2',
    ]
    ctx.env.DEFINES = [ 'ANSI_COLOR=1' ]
    ctx.env.cprogram_PATTERN = '%s.js'
    print ctx.env

    emcc_env = ctx.env

    ctx.setenv('emcc_html', emcc_env)
    ctx.env.CFLAGS = []
    ctx.env.LINKFLAGS = []
    ctx.env.DEFINES = [ 'kParticleCount=8192' ]
    ctx.env.cprogram_PATTERN = '%s.html'

from waflib.TaskGen import after_method,before_method,feature,taskgen_method,extension

from waflib import Task

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

once = True
class grunt(Task.Task):
    run_str='grunt'
    shell=True
    # HACK: this will make sure emcc runs before but if we want to run grunt
    # before and after an emcc task, this will need to work another way.
    after='cprogram'

@extension('.hbs')
def process_hbs(self, node):
    pass

@extension('.css')
@extension('.styl')
def process_css(self, node):
    pass

# Let Waf know js is a valid extension. Currently don't anything to it.
@extension('.js')
def process_js(self, node):
    if 'c' in self.features:
        self.js_library_paths=getattr(self,'js_library_paths',[])
        self.js_library_paths.append(node.abspath())

        self.env.append_value('LINKFLAGS', '--js-library')
        self.env.append_value('LINKFLAGS', node.abspath())

@after_method('apply_link','apply_incpaths')
def apply_js_nodes(self):
    if type(self.js_library_paths) is list:
        link_task=getattr(self,'link_task',None)
        if link_task:
            link_task.dep_nodes.extend(self.to_nodes(self.js_library_paths))

        lst=self.includes_nodes
        lst.extend(self.to_incnodes(self.to_list(self.js_library_paths)))
        self.includes_nodes=lst

@feature('grunt')
@after_method('process_source')
def apply_grunt(self):
    self.process_use()
    self.target=self.bld.bldnode.make_node(self.target)

    task=self.create_task('grunt', self.source, self.target)
    task.dep_nodes.append(self.bld.path.find_node('Gruntfile.js'))
    task.dep_nodes.extend(
        [self.bld.bldnode.make_node(x) for x in self.to_list(self.use)]
    )

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
        includes=['./src', './src/game/watertest', '.'],
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
        source=bld.path.ant_glob('src/sys/*.c'),
        includes=['./src', '.'],
        target='libsys',
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

    if bld.cmd in ['debug', 'release']:
        bld(
            rule='cp ${SRC} .',
            source=bld.path.ant_glob('data/sound/*.wav')
        )

    if bld.cmd == 'emcc':
        bld(
            rule='cp ${SRC} .',
            source=bld.path.ant_glob(
                'src/platform/web/watertest.ui.js ' +
                'src/platform/web/*.html src/ui/index.html src/ui/bean.html ' +
                'vendor/stats.js/build/stats.min.js'
            )
        )

        bld(
            rule='cp ${SRC} .',
            source='vendor/jquery-1.7.1.min.js'
        )

        bld(
            rule='../../vendor/diskettejs/bin/convert ' +
                '-c ../../data/diskette.json ' +
                '-I ../../data ' +
                '-O ./',
            source=bld.path.ant_glob(
                'data/**'
            )
        )

    watertestSource = bld.path.ant_glob(
        'src/game/flowline.c src/game/watertest.c ' +
        'src/platform/sdl/*.c'
    )

    spaceLeaperSource = bld.path.ant_glob(
        'src/pphys/*.c ' +
        'src/game/camera.c src/game/shaders.c src/game/renderer.c ' +
        'src/game/view.c src/game/draw.c ' +
        'src/game/cameracontroller.c ' +
        'src/game/updater.c src/game/loop.c ' +
        'src/game/leaper.c src/game/leaperview.c src/game/asteroidview.c ' +
        'src/game/particleview.c src/game/ambientparticle.c ' +
        'src/game/flowline.c src/game/asteroid.c src/game/spaceleaper.c ' +
        'src/platform/sdl/*.c'
    )

    beanSource = bld.path.ant_glob(
        'src/pphys/*.c ' +
        'src/game/camera.c src/game/shaders.c src/game/renderer.c ' +
        'src/game/view.c src/game/draw.c ' +
        'src/game/city.c src/game/block.c src/game/room.c src/game/wall.c ' +
        'src/game/multiwallview.c src/game/pathnode.c ' +
        'src/game/cameracontrollerbean.c ' +
        'src/game/updater.c src/game/loop.c ' +
        'src/game/actor.c src/game/actorview.c ' +
        'src/game/bean.c ' +
        'src/platform/sdl/*.c'
    )

    if bld.cmd in [ 'emcc', 'emcc_html' ]:
        watertestEmccSource = watertestSource
        watertestEmccSource.extend( bld.path.ant_glob(
            'src/platform/web/window.js'
        ))

        bld.program(
            source=watertestEmccSource,
            includes=['./src/game/watertest', './src', '.'],
            # linkflags=['--js-library', '../../src/platform/web/window.js'],
            target='watertest',
            use='libobj libpphys libinput'
        )

        spaceLeaperEmccSource = spaceLeaperSource
        spaceLeaperEmccSource.extend( bld.path.ant_glob(
            'src/audio/audio.c src/platform/web/audio_webaudio.c ' +
            'src/platform/web/library_window.js ' +
            'src/platform/web/library_audio_webaudio.js'
        ))

        bld.program(
            source=spaceLeaperEmccSource,
            includes=['./src/game/spaceleaper', './src', '.'],
            defines=[ 'AUDIO_WEBAUDIO' ],
            # linkflags=['--js-library', '../../src/platform/web/window.js'],
            target='spaceleaper',
            use='libobj libinput libsys'
        )

        beanEmccSource = beanSource
        beanEmccSource.extend( bld.path.ant_glob(
            'src/audio/audio.c src/platform/web/audio_webaudio.c ' +
            'src/platform/web/library_window.js ' +
            'src/platform/web/library_audio_webaudio.js'
        ))

        bld.program(
            source=beanEmccSource,
            includes=['./src/game/bean', './src', '.'],
            defines=[ 'AUDIO_WEBAUDIO' ],
            target='_bean',
            use='libobj libinput libsys'
        )

    if bld.cmd == 'emcc':
        bld(
            features='grunt',
            source=bld.path.ant_glob(
                'src/platform/web/*.js ' +
                'src/ui/*.hbs src/ui/*.css src/ui/*.styl'
            ),
            target='spaceleap.js',
            use='spaceleaper.js'
        )

    if bld.cmd in [ 'debug', 'release' ]:
        platformIncludes = ['./src', '.', './vendor/freealut/include']
        if sys.platform == 'darwin':
            platformIncludes.append('./src/platform/mac/headers')

        spaceleaperPlatformIncludes = ['./src/game/spaceleaper', './src', '.']
        spaceleaperPlatformIncludes.extend(platformIncludes)

        beanPlatformIncludes = ['./src/game/bean', './src', '.']
        beanPlatformIncludes.extend(platformIncludes)

        bld.objects(
            source=bld.path.ant_glob('src/audio/*.c'),
            includes=spaceleaperPlatformIncludes,
            target='libaudiobase_sl',
            use='libobj'
        )

        bld.objects(
            source=bld.path.ant_glob('src/platform/mac/audio/*.c'),
            includes=spaceleaperPlatformIncludes,
            target='libaudioopenal_sl',
            use='libobj libaudiobase_sl'
        )

        bld.objects(
            source=bld.path.ant_glob('src/audio/*.c'),
            includes=spaceleaperPlatformIncludes,
            target='libaudiobase_bean',
            use='libobj'
        )

        bld.objects(
            source=bld.path.ant_glob('src/platform/mac/audio/*.c'),
            includes=spaceleaperPlatformIncludes,
            target='libaudioopenal_bean',
            use='libobj libaudiobase_bean'
        )

        bld.program(
            source=watertestSource,
            includes=['./src/game/watertest', './src', '.'],
            target='watertest',
            framework=[ 'Cocoa', 'OpenGL' ],
            use='libobj libpphys libsys libinput SDL SDL_gfx SDL_image'
        )

        bld.program(
            source=spaceLeaperSource,
            includes=spaceleaperPlatformIncludes,
            target='spaceleaper',
            defines=[ 'AUDIO_OPENAL' ],
            framework=[ 'Cocoa', 'OpenGL', 'OpenAL' ],
            libpath=os.path.abspath('vendor/freealut/src'),
            lib='alut',
            use='libobj libinput libsys libaudiobase_sl libaudioopenal_sl ' +
                'SDL SDL_gfx SDL_image'
        )

        bld.program(
            source=beanSource,
            includes=beanPlatformIncludes,
            target='bean',
            defines=[ 'AUDIO_OPENAL' ],
            framework=[ 'Cocoa', 'OpenGL', 'OpenAL' ],
            libpath=os.path.abspath('vendor/freealut/src'),
            lib='alut',
            use='libobj libinput libsys libaudiobase_bean libaudioopenal_bean ' +
                'SDL SDL_gfx SDL_image'
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
