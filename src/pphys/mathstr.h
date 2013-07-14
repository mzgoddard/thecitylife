#ifndef MATHSTR_H_W179BSNX
#define MATHSTR_H_W179BSNX

#include <stdio.h>
#include <string.h>

#include "src/obj/string.h"
#include "src/pphys/math.h"

static AQString * aqvec2_rep(aqvec2 v) {
  char buffer[256];
  memset( buffer, 0, 256 );
  int length = sprintf( buffer, "(aqvec2){%f %f}", v.x, v.y );
  buffer[ length ] = 0;
  return aqstr( buffer );
}

static const char * aqvec2_cstr(aqvec2 v) {
  return AQString_cstr( aqvec2_rep( v ));
}

static AQString * aqaabb_rep(aqaabb ab) {
  char buffer[256];
  sprintf( buffer, "(aqaabb){%f %f %f %f}", ab.top, ab.right, ab.bottom, ab.left );
  return aqstr( buffer );
}

static const char * aqaabb_cstr(aqaabb ab) {
  return AQString_cstr( aqaabb_rep( ab ));
}

#endif /* end of include guard: MATHSTR_H_W179BSNX */
