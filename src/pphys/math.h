#ifndef VEC2_H_KF1Q5ETP
#define VEC2_H_KF1Q5ETP

#include <math.h>

#include "appdefines.h"

#ifndef AQDOUBLE
#define AQDOUBLE double
#endif

#define AQPI 3.14159265359
#define AQPI2 AQPI / 2
#define AQTAU AQPI * 2
#define AQEPS 0.00001

#if !__SSE__
typedef struct aqvec2 {
  AQDOUBLE x;
  AQDOUBLE y;
} aqvec2;
#else
typedef float aqvec2 __attribute__((ext_vector_type(2)));
typedef int aqivec2 __attribute__((ext_vector_type(2)));
#endif

#if !__SSE__
typedef struct aqmat22 {
  AQDOUBLE aa, ab, ba, bb;
} aqmat22;
#else
typedef float aqmat22 __attribute__((ext_vector_type(4)));
#endif

typedef struct aqtf {
  aqvec2 position;
  aqmat22 rotation;
} aqtf;

typedef struct aqaabb {
  AQDOUBLE top;
  AQDOUBLE right;
  AQDOUBLE bottom;
  AQDOUBLE left;
} aqaabb;

#if __SSE__
typedef float _aqaabb __attribute__((ext_vector_type(4)));
typedef int _aqiaabb __attribute__((ext_vector_type(4)));
#endif

static aqvec2 aqvec2_make(AQDOUBLE x, AQDOUBLE y) { return (aqvec2){ x, y }; }
static aqvec2 aqvec2_zero() { return (aqvec2){ 0, 0 }; }
static aqmat22 aqmat22_make(AQDOUBLE aa, AQDOUBLE ab, AQDOUBLE ba, AQDOUBLE bb) {
  return (aqmat22){ aa, ab, ba, bb };
}
static aqmat22 aqmat22_makeRotation(AQDOUBLE a) {
  return (aqmat22){ cos( a ), -sin( a ), sin( a ), cos( a ) };
}
static aqmat22 aqmat22_identity() { return (aqmat22){ 1, 0, 0, 1 }; }
static aqtf aqtf_make(aqvec2 p, aqmat22 r) {
  return (aqtf){ p, r };
}
static aqaabb aqaabb_make(
  AQDOUBLE top, AQDOUBLE right, AQDOUBLE bottom, AQDOUBLE left
) {
  return (aqaabb){ top, right, bottom, left };
}
static aqaabb aqaabb_makeTlSize(aqvec2 tl, aqvec2 size) {
  return aqaabb_make(tl.y, tl.x+size.x, tl.y-size.y, tl.x);
}
static aqaabb aqaabb_makeCenterExtents(aqvec2 c, aqvec2 ex) {
  return aqaabb_make(c.y + ex.y, c.x + ex.x, c.y - ex.y, c.x - ex.x);
}
static aqaabb aqaabb_makeCenterRadius(aqvec2 c, AQDOUBLE r) {
  return aqaabb_makeCenterExtents(c, aqvec2_make(r, r));
}

static AQDOUBLE aqmath_hypot2(AQDOUBLE a, AQDOUBLE b) {
  return a * a + b * b;
}
static AQDOUBLE aqmath_hypot(AQDOUBLE a, AQDOUBLE b) {
  return sqrt(aqmath_hypot2(a, b));
}

static AQDOUBLE aqangle_absDiff( double a, double b ) {
  double v = fmod( fabs( a - b ), 2 * M_PI );

  if ( v > M_PI ) {
    v = 2 * M_PI - v;
  }

  return v;
}

static AQDOUBLE aqangle_diff( double a, double b ) {
  double v;
  a = fmod( a + M_PI, 2 * M_PI ) - M_PI;
  b = fmod( b + M_PI, 2 * M_PI ) - M_PI;

  v = a - b;
  v = fmod( v + M_PI, 2 * M_PI ) - M_PI;
  if ( v < -M_PI ) {
    v += 2 * M_PI;
  }
  if ( v > M_PI ) {
    v -= 2 * M_PI;
  }

  return v;
}

static aqvec2 aqvec2_add(aqvec2 a, aqvec2 b) {
  #if !__SSE__
  return aqvec2_make(a.x + b.x, a.y + b.y);
  #else
  return a + b;
  #endif
}
static aqvec2 aqvec2_sub(aqvec2 a, aqvec2 b) {
  #if !__SSE__
  return aqvec2_make(a.x - b.x, a.y - b.y);
  #else
  return a - b;
  #endif
}
static aqvec2 aqvec2_mul(aqvec2 a, aqvec2 b) {
  #if !__SSE__
  return aqvec2_make(a.x * b.x, a.y * b.y);
  #else
  return a * b;
  #endif
}
static aqvec2 aqvec2_div(aqvec2 a, aqvec2 b) {
  #if !__SSE__
  return aqvec2_make(a.x / b.x, a.y / b.y);
  #else
  return a / b;
  #endif
}
static aqvec2 aqvec2_scale(aqvec2 a, AQDOUBLE s) {
  #if !__SSE__
  return aqvec2_make(a.x * s, a.y * s);
  #else
  aqvec2 _s = { s, s };
  return a * _s;
  #endif
}
static AQDOUBLE aqvec2_cross(aqvec2 a, aqvec2 b) {
  return a.x * b.y - a.y * b.x;
}

static AQDOUBLE aqvec2_sum(aqvec2 a) {
  return a.x + a.y;
}

static AQDOUBLE aqvec2_dot(aqvec2 a, aqvec2 b) {
  #if !__SSE__
  return a.x * b.x + a.y * b.y;
  #else
  aqvec2 c = a * b;
  return c.x + c.y;
  #endif
}

static AQDOUBLE aqvec2_mag2(aqvec2 a) {
  #if !__SSE__
  return aqmath_hypot2(a.x, a.y);
  #else
  a *= a;
  return a.x + a.y;
  #endif
}

static AQDOUBLE aqvec2_mag(aqvec2 a) {
  return sqrt(aqvec2_mag2(a));
}

static AQDOUBLE aqvec2_angle(aqvec2 a, aqvec2 b) {
  return acos(aqvec2_dot(a, b) / sqrt(aqvec2_mag2(a) * aqvec2_mag2(b)));
}

static aqvec2 aqvec2_normalized(aqvec2 a) {
  AQDOUBLE mag = aqvec2_mag( a );
  return aqvec2_scale( a, 1 / mag );
}

static int aqvec2_eq( aqvec2 a, aqvec2 b ) {
  return fabs( a.x - b.x ) < AQEPS && fabs( a.y - b.y ) < AQEPS;
}

static aqvec2 aqvec2_lerp( aqvec2 a, aqvec2 b, float t ) {
  #if !__SSE__
  return (aqvec2) { ( b.x - a.x ) * t + a.x, ( b.y - a.y ) * t + a.y };
  #else
  return aqvec2_scale( b - a, t ) + a;
  // return (aqvec2) ( ( b - a ) * (aqvec2) { t, t } + a );
  #endif
}

static aqvec2 aqmat22_transform(aqmat22 m, aqvec2 v) {
  #if !__SSE__
  return aqvec2_make(m.aa * v.x + m.ab * v.y, m.ba * v.x + m.bb * v.y);
  #else
  return (aqvec2) { aqvec2_sum( m.xy * v ), aqvec2_sum( m.zw * v ) };
  #endif
}

static aqvec2 aqvec2_rotate(aqvec2 a, AQDOUBLE r) {
  return aqmat22_transform(aqmat22_makeRotation(r), a);
}

static int aqaabb_containsCircle(aqaabb ab, aqvec2 v, AQDOUBLE r) {
  return
    ab.left <= v.x - r && v.x + r <= ab.right &&
      ab.bottom <= v.y - r && v.y + r <= ab.top;
}

static int aqaabb_containsPt(aqaabb ab, aqvec2 v) {
  return aqaabb_containsCircle(ab, v, 0);
}

static int aqaabb_containsBox(aqaabb a, aqaabb b) {
  return (
    a.left <= b.left &&
      b.right <= a.right &&
      a.bottom <= b.bottom &&
      b.top <= a.top
  );
}

static int aqaabb_intersectsCircle(aqaabb ab, aqvec2 v, AQDOUBLE r) {
  return
    ab.left - r <= v.x && v.x <= ab.right + r &&
      ab.bottom - r <= v.y && v.y <= ab.top + r;
}

static int aqaabb_intersectsPt(aqaabb ab, aqvec2 v) {
  return aqaabb_intersectsCircle(ab, v, 0);
}

static int aqaabb_intersectsBox(aqaabb a, aqaabb b) {
  // #if !__SSE__
  return a.left < b.right && a.right > b.left &&
    a.bottom < b.top && a.top > b.bottom;
  // #else
  // _aqaabb _a = { b.bottom, b.left, a.bottom, a.left };
  // _aqaabb _b = { a.top, a.right, b.top, b.right };
  // _aqiaabb _c = _a < _b;
  // return _c.x && _c.y && _c.z && _c.w;
  // #endif
}

#if __SSE__
static int _aqaabb_intersectsBox(_aqaabb a, _aqaabb b) {
  // _aqaabb _a = { b.bottom, b.left, a.bottom, a.left };
  // _aqaabb _b = { a.top, a.right, b.top, b.right };
  // _aqiaabb _c = _a < _b;
  _aqiaabb _c = b < a;
  // _c.xy = b.zw < a.xy;
  // _c.zw = a.zw < b.xy,
  // _c.zw = -b.xy < -a.zw,
  return _c.x && _c.y && ( _c.z ) && _c.w;
}
#endif

static aqvec2 aqaabb_size(aqaabb a) {
  return aqvec2_make(a.right - a.left, a.top - a.bottom);
}

static aqvec2 aqaabb_extents(aqaabb a) {
  return aqvec2_scale(aqaabb_size(a), 0.5);
}

static aqvec2 aqaabb_tlvec2(aqaabb a) {
  return aqvec2_make(a.left, a.top);
}

static aqaabb aqaabb_tl(aqaabb a) {
  return aqaabb_makeTlSize(aqaabb_tlvec2(a), aqaabb_extents(a));
}

static aqaabb aqaabb_tr(aqaabb a) {
  aqvec2 extents = aqaabb_extents(a);
  return aqaabb_makeTlSize(
    aqvec2_add(aqaabb_tlvec2(a), aqvec2_make(extents.x, 0)),
    extents
  );
}

static aqaabb aqaabb_bl(aqaabb a) {
  aqvec2 extents = aqaabb_extents(a);
  return aqaabb_makeTlSize(
    aqvec2_sub(aqaabb_tlvec2(a), aqvec2_make(0, extents.y)),
    extents
  );
}

static aqaabb aqaabb_br(aqaabb a) {
  aqvec2 extents = aqaabb_extents(a);
  return aqaabb_makeTlSize(
    aqvec2_add(aqaabb_tlvec2(a), aqvec2_make(extents.x, -extents.y)),
    extents
  );
}

static aqvec2 aqaabb_center(aqaabb a) {
  aqvec2 extents = aqaabb_extents( a );
  return aqvec2_add( aqvec2_make( a.left, a.bottom ), extents );
}

static aqaabb aqaabb_combine(aqaabb a, aqaabb b) {
  return aqaabb_make(
    fmax(a.top, b.top), fmax(a.right, b.right), 
    fmin(a.bottom, b.bottom), fmin(a.left, b.left)
  );
}

static aqaabb aqaabb_translate(aqaabb ab, aqvec2 v) {
  return aqaabb_make(ab.top + v.y, ab.right + v.x, ab.bottom + v.y, ab.left + v.x);
}

#endif /* end of include guard: VEC2_H_KF1Q5ETP */
