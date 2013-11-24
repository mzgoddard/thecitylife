#include "test/runner/runner.h"

#include "src/pphys/math.h"

void test_angle( Result **result ) {
  ok( aqangle_absDiff( 0, M_PI ) == M_PI, "positive max distance is positive" );
  ok(
    aqangle_absDiff( 0, -M_PI ) == M_PI,
    "negative max distance is positive"
  );
  ok(
    aqangle_absDiff( 0, M_PI / 2 ) == M_PI / 2,
    "positive half pi is positive"
  );
  ok(
    aqangle_absDiff( 0, -M_PI / 2 ) == M_PI / 2,
    "negative half pi is positive"
  );
  ok(
    aqangle_absDiff( M_PI / 4, M_PI * 1.75 ) == M_PI / 2,
    "diff over boundary is correct"
  );

  ok( aqangle_diff( 0, M_PI / 2 ) == -M_PI / 2, "0 - pi/2 = -pi/2" );
  ok( aqangle_diff( 0, -M_PI / 2 ) == M_PI / 2, "0 - -pi/2 = pi/2" );
  ok( aqangle_diff( 0, M_PI * 1.5 ) == M_PI / 2, "0 - pi1.5 = pi/2" );
  ok( aqangle_diff( 0, M_PI * 2.5 ) == -M_PI / 2, "0 - pi2.5 = -pi/2" );
  ok( aqangle_diff( 0, M_PI * 3.5 ) == M_PI / 2, "0 - pi3.5 = pi/2" );
  ok(
    fabs( aqangle_diff( M_PI / 4, M_PI * 1.75 ) - M_PI / 2 ) < AQEPS,
    "pi/4 - pi1.75 = pi/2"
  );
  ok(
    fabs( aqangle_diff( M_PI * 1.75, M_PI / 4 ) - -M_PI / 2 ) < AQEPS,
    "pi1.75 - pi/4 = -pi/2"
  );

  ok(
    aqangle_diff( 3.166085, 1.694948 ) > -M_PI &&
      aqangle_diff( 3.166085, 1.694948 ) < M_PI,
    "diff > -PI and diff < PI"
  );
}

void test_vec2( Result **result ) {
  aqvec2 v1 = aqvec2_make( 1, 2 );
  ok( v1.x == 1, "vec2.x is 1." );
  ok( v1.y == 2, "vec2.y is 2." );
}

void test_transforms( Result **result ) {
  aqvec2 v1 = aqvec2_make( 1, 0 );
  aqvec2 v2 = aqvec2_rotate( v1, AQPI2 );
  ok( aqvec2_eq( v2, aqvec2_make( 0, 1 )), "vec2 rotated correctly" );

  aqmat22 m1 = aqmat22_make( 2, 0, 0, 2 );
  aqvec2 v3 = aqvec2_make( 1, 1 );
  aqvec2 v4 = aqmat22_transform( m1, v3 );
  ok( aqvec2_eq( v4, aqvec2_make( 2, 2 )), "vec2 scaled by transform." );
}

void test_aabb( Result **result ) {
  aqaabb ab1 = aqaabb_make( 1, 1, 0, 0 );
  ok(
    aqaabb_containsPt( ab1, aqvec2_zero()),
    "aabb contains exclusive point."
  );

  ok(
    aqaabb_containsPt( ab1, aqvec2_make( 1, 1 )),
    "aqaabb contains non-zero exclusive point."
  );
}

void suite_pphys_math() {
  suite( "pphys/math" );
  test( "angle", test_angle );
  test( "vec2", test_vec2 );
  test( "transforms", test_transforms );
  test( "aabb", test_aabb );
}
