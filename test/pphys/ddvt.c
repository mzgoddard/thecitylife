#include <stdio.h>

#include "src/pphys/index.h"
#include "test/runner/runner.h"

void test_ddvt_exists( Result **result ) {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
  AQDdvt *ddvt = AQDdvt_create( aqaabb_make( 16, 16, 0, 0 ));
  ok( ddvt->object.type == &AQDdvtType, "is AQDdvtType" );
  aqfree( pool );
}

void ddvt_pairtIterator( AQParticle *a, AQParticle *b, int *ctx ) {
  (*ctx)++;
}

void test_tree( Result **result ) {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));

  AQDdvt *ddvt = AQDdvt_create( aqaabb_make( 16, 16, -16, -16 ));
  AQParticle *p;

  int i;
  for ( i = 0; i < MAX_DDVT_PARTICLES * 2; i++ ) {
    p = aqcreate( &AQParticleType );
    p->position = (aqvec2) {
      i / 2.0 / MAX_DDVT_PARTICLES * 24 - 12,
      i / 2.0 / MAX_DDVT_PARTICLES * 24 - 12 };
    AQDdvt_addParticle( ddvt, p );

    ok( p->object.refCount > 1, "ddvt is referenced" );

    if ( i >= MAX_DDVT_PARTICLES ) {
      ok ( !!ddvt->tl, "switched to children mode" );
    }

    aqaabb aabb = AQParticle_aabb( p );
    ok( aqaabb_intersectsBox( ddvt->aabb, aabb ), "intersect particle" );
    ok( i <= MAX_DDVT_PARTICLES ?
        aqaabb_intersectsBox( ddvt->bl ? ddvt->bl->aabb : ddvt->aabb, aabb ) :
        aqaabb_intersectsBox( ddvt->tr ? ddvt->tr->aabb : ddvt->aabb, aabb ),
      "particle intersects a corner" );
    ok( i + 1 == ddvt->length, "length matches" );
  }

  int pairCount = 0;
  AQDdvt_iteratePairs(
    ddvt,
    (AQDdvt_pairIterator) ddvt_pairtIterator,
    &pairCount
  );

  ok( pairCount == 202, "correct number of pairs" );

  aqretain( p );

  aqfree( pool );

  ok( p->object.refCount == 1, "particle released" );
  aqrelease( p );
}

void suite_pphys_ddvt() {
  suite( "pphys/ddvt" );
  test( "exists", test_ddvt_exists );
  test( "tree", test_tree );
}
