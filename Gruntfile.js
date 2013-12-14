var stylus = require( 'grunt-contrib-stylus/node_modules/stylus' );

module.exports = function(grunt) {
  grunt.initConfig({
    browserify: {
      options: {
        alias: [
          'build/emcc/spaceleap.jst.js:jst'
        ],
        aliasMappings: {
          'src': 'src/**/*.js'
        },
        debug: true,
        ignore: [
          'src/platform/mac/**/*.js',
          'src/platform/web/library_*.js'
        ]
      },

      spaceleap: {
        files: {
          'build/emcc/spaceleap.ui.js': [
            'src/platform/web/spaceleap.ui.js'
          ]
        }
      }
    },

    command: {
      dedataurisourcemap: {
        cmd: 'bin/dedataurisourcemap.py --file build/emcc/spaceleap.ui.js'
      },

      postuglifyfix: {
        cmd: 'bin/postuglifyfix.py --file dist/emcc/spaceleap.js'
      }
    },

    concat_sourcemap: {
      spaceleap: {
        options: {
          sourcesContent: true
        },
        files: {
          'build/emcc/spaceleap.js': [
            'src/platform/web/spaceleap.module.js',
            'src/platform/web/when_shim.js',
            'vendor/diskettejs/node_modules/when/when.js',
            'vendor/diskettejs/diskette.js',
            'src/platform/web/audiocontext.js',
            'build/emcc/spaceleaper.js',
            'vendor/jquery-1.7.1.min.js',
            'node_modules/grunt-contrib-handlebars/node_modules/handlebars/dist/handlebars.runtime.js',
            'build/emcc/spaceleap.jst.js',
            'src/platform/web/spaceleap.shim.missing.js',
            'src/platform/web/spaceleap.shim.emscripten.js',
            'build/emcc/spaceleap.ui.js'
          ]
        }
      },

      spaceleap_native: {
        options: {
          sourcesContent: true
        },
        files: {
          'build/native/spaceleap.js': [
            'src/platform/web/when_shim.js',
            'vendor/diskettejs/node_modules/when/when.js',
            'vendor/diskettejs/diskette.js',
            'vendor/jquery-1.7.1.min.js',
            'node_modules/grunt-contrib-handlebars/node_modules/handlebars/dist/handlebars.runtime.js',
            'build/emcc/spaceleap.jst.js',
            'src/platform/web/spaceleap.shim.missing.js',
            'src/platform/web/spaceleap.ui.js'
          ]
        }
      }
    },

    handlebars: {
      options: {
        processName: function( filepath ) {
          return filepath.substring( filepath.lastIndexOf( '/' ) + 1 );
        }
      },
      spaceleap: {
        files: {
          'build/emcc/spaceleap.jst.js': [
            'src/ui/*.hbs'
          ]
        }
      }
    },

    jshint: {
      spaceleap: [ 'src/platform/web/*.js' ]
    },

    stylus: {
      options: {
        paths: [ 'src/ui' ]
      },

      spaceleap: {
        options: {
          define: {
            bgColor: '#0a161f'
          }
        },

        files: {
          'build/emcc/index.css': [
            'src/ui/index.css'
          ]
        }
      },

      spaceleap_native: {
        options: {
          define: {
            bgColor: 'transparent'
          }
        },

        files: {
          'build/native/index.css': [
            'src/ui/index.css'
          ]
        }
      }
    },

    uglify: {
      spaceleap: {
        options: {
          sourceMapIn: 'build/emcc/spaceleap.js.map',
          sourceMapRoot: '/',
          sourceMappingURL: 'spaceleap.js.map',
          sourceMap: 'dist/emcc/spaceleap.js.map',
          mangle: false,
          compress: false,
          report: 'min'
        },
        src: 'build/emcc/spaceleap.js',
        dest: 'dist/emcc/spaceleap.js'
      }
    }
  });

  grunt.loadTasks( 'tasks' );

  grunt.loadNpmTasks( 'grunt-browserify' );
  grunt.loadNpmTasks( 'grunt-concat-sourcemap' );
  grunt.loadNpmTasks( 'grunt-contrib-handlebars' );
  grunt.loadNpmTasks( 'grunt-contrib-jshint' );
  grunt.loadNpmTasks( 'grunt-contrib-stylus' );
  grunt.loadNpmTasks( 'grunt-contrib-uglify' );

  grunt.registerTask( 'default', [
    'handlebars',
    'stylus',
    'browserify',
    'command:dedataurisourcemap',
    'concat_sourcemap'
  ]);

  grunt.registerTask( 'release', [
    'uglify',
    'command:postuglifyfix'
  ]);
};
