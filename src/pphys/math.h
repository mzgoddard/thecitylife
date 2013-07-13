#ifndef VEC2_H_KF1Q5ETP
#define VEC2_H_KF1Q5ETP

#include <math.h>

#define AQDOUBLE double
#define AQPI 3.14159265359
#define AQPI2 AQPI / 2
#define AQTAU AQPI * 2
#define AQEPS 0.00001

typedef struct aqvec2 {
  AQDOUBLE x;
  AQDOUBLE y;
} aqvec2;

typedef struct aqmat22 {
  AQDOUBLE aa, ab, ba, bb;
} aqmat22;

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

static aqvec2 aqvec2_add(aqvec2 a, aqvec2 b) {
  return aqvec2_make(a.x + b.x, a.y + b.y);
}
static aqvec2 aqvec2_sub(aqvec2 a, aqvec2 b) {
  return aqvec2_make(a.x - b.x, a.y - b.y);
}
static aqvec2 aqvec2_mul(aqvec2 a, aqvec2 b) {
  return aqvec2_make(a.x * b.x, a.y * b.y);
}
static aqvec2 aqvec2_div(aqvec2 a, aqvec2 b) {
  return aqvec2_make(a.x / b.x, a.y / b.y);
}
static aqvec2 aqvec2_scale(aqvec2 a, AQDOUBLE s) {
  return aqvec2_make(a.x * s, a.y * s);
}
static AQDOUBLE aqvec2_cross(aqvec2 a, aqvec2 b) {
  return a.x * b.y - a.y * b.x;
}

static AQDOUBLE aqvec2_dot(aqvec2 a, aqvec2 b) {
  return a.x * b.x + a.y * b.y;
}

static AQDOUBLE aqvec2_mag2(aqvec2 a) {
  return aqmath_hypot2(a.x, a.y);
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
  return fdim( a.x, b.x ) < AQEPS && fdim( a.y, b.y ) < AQEPS;
}

static aqvec2 aqmat22_transform(aqmat22 m, aqvec2 v) {
  return aqvec2_make(m.aa * v.x + m.ab * v.y, m.ba * v.x + m.bb * v.y);
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
  return a.left < b.right && a.right > b.left &&
    a.bottom < b.top && a.top > b.bottom;
}

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
