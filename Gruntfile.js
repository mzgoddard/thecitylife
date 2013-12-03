module.exports = function(grunt) {
  grunt.initConfig({
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
            'src/platform/web/spaceleap.ui.js'
          ]
        }
      }
    },

    jshint: {
      spaceleap: [ 'src/platform/web/*.js' ]
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

  grunt.loadNpmTasks( 'grunt-concat-sourcemap' );
  grunt.loadNpmTasks( 'grunt-contrib-jshint' );
  grunt.loadNpmTasks( 'grunt-contrib-uglify' );

  grunt.registerTask( 'default', [ 'concat_sourcemap' ]);
};
