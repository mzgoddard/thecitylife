# The City Life

## Dependencies

- cmake
- node
  - grunt
- python

## Build Instructions

1. `git submodule init && git submodule update`
2. ```sh -c 'cd vendor/freealut && \
    cmake CMakeLists.txt && \
    make && \
    cmake "-DBUILD_STATIC:BOOL=ON" && \
    make'
  ```
3. ```sh -c 'cd vendor/diskettejs && \
    npm install'
  ```
4. `npm install`
5. `./waf configure`
6. `./waf emcc`
7. `open build/emcc/spaceleaper.html`

## Dist Instructions

1. `grunt uglify && ./bin/postuglifyfix.py -f dist/emcc/spaceleap.js`
2. Copy `spaceleaper.html, data0, diskette.json` to `dist/emcc`.
