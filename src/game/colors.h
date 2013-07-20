#ifndef COLORS_H_N3RQ7DA
#define COLORS_H_N3RQ7DA

#include "./shaders.h"

static struct glcolor clearColor = { 10, 22, 31, 255 };

static struct glcolor homeAsteroidColor = { 145, 255, 85, 255 };
static struct glcolor resourceAsteroidColor = { 27, 43, 204, 255 };
static struct glcolor normalAsteroidColor = { 138, 85, 63, 255 };

static struct glcolor leaperOxygenBarForeColor = { 145, 255, 85, 255 };
static struct glcolor leaperOxygenBarBackColor = { 145, 255, 85, 64 };
static struct glcolor leaperResourceBarForeColor = { 27, 43, 204, 255 };
static struct glcolor leaperResourceBarBackColor = { 27, 43, 204, 64 };

static struct glcolor leaperColor = { 255, 116, 59, 255 };

static struct glcolor SL_lerpColor( struct glcolor a, struct glcolor b, float t ) {
  return (struct glcolor) {
    ( a.r - b.r ) * t + b.r,
    ( a.g - b.g ) * t + b.g,
    ( a.b - b.b ) * t + b.b,
    ( a.a - b.a ) * t + b.a
  };
}

#endif /* end of include guard: COLORS_H_N3RQ7DA */
