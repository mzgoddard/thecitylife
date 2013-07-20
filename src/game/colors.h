#ifndef COLORS_H_N3RQ7DA
#define COLORS_H_N3RQ7DA

#include "./shaders.h"

static struct glcolor clearColor = { 10, 22, 31, 255 };

static struct glcolor homeAsteroidColor = { 255, 211, 193, 255 };
static struct glcolor resourceAsteroidColor = { 127, 105, 96, 255 };
static struct glcolor normalAsteroidColor = { 138, 85, 63, 255 };

static struct glcolor leaperOxygenBarForeColor = { 255, 211, 193, 255 };
static struct glcolor leaperOxygenBarBackColor = { 255, 211, 193, 64 };
static struct glcolor leaperResourceBarForeColor = { 127, 105, 96, 255 };
static struct glcolor leaperResourceBarBackColor = { 127, 105, 96, 64 };

static struct glcolor leaperColor = { 204, 126, 93, 255 };

static struct glcolor SL_lerpColor( struct glcolor a, struct glcolor b, float t ) {
  return (struct glcolor) {
    ( a.r - b.r ) * t + b.r,
    ( a.g - b.g ) * t + b.g,
    ( a.b - b.b ) * t + b.b,
    ( a.a - b.a ) * t + b.a
  };
}

#endif /* end of include guard: COLORS_H_N3RQ7DA */
