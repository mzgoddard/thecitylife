#include "test/runner/runner.h"

#include "src/pphys/math.h"

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
  test( "vec2", test_vec2 );
  test( "transforms", test_transforms );
  test( "aabb", test_aabb );
}
