#include <stdlib.h>

#include "src/pphys/index.h"
#include "test/runner/runner.h"

void test_ray_particle( Result **result ) {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));

  AQRay *ray = AQRay_create( aqvec2_zero(), aqvec2_makeAngle( M_PI / 4 ), 10 );

  AQParticle *particle = aqcreate( &AQParticleType );

  particle->position = aqvec2_make( 5, 5 );
  ok( AQRay_testParticle( ray, particle ), "Ray intersects particle." );

  particle->position = aqvec2_make( 10, 10 );
  ok(
    AQRay_testParticle( ray, particle ) == 0,
    "Ray does not intersect particle."
  );

  aqfree( pool );
}

void test_ray_world( Result **result ) {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));

  AQRay *ray = AQRay_create( aqvec2_zero(), aqvec2_makeAngle( M_PI / 4 ), 10 );

  AQWorld *world = aqcreate( &AQWorldType );
  AQWorld_setAabb( world, (aqaabb){ 16, 16, -16, -16 });

  AQParticle *particle = aqcreate( &AQParticleType );
  particle->position = aqvec2_make( 5, 5 );

  AQWorld_addParticle( world, particle );

  ok(
    AQRay_testWorld( ray, world, 0 ) == particle, "Ray intersects particle."
  );

  int n = 6;
  for ( int i = 1; i < n; i++ ) {
    for ( int j = 1; j < n; j++ ) {
      AQParticle *p = aqcreate( &AQParticleType );
      p->position = aqvec2_make( 16 / n * i, 16 / n * j );
      AQWorld_addParticle( world, p );

      if ( i == 1 && j == 1 ) {
        particle = p;
      }
    }
  }

  ray->position = aqvec2_make( -2, -2 );

  ok( AQRay_testWorld( ray, world, 0 ) != NULL, "Ray intersects a particle." );
  ok(
    AQRay_testWorld( ray, world, 0 ) == particle, "Ray intersects particle."
  );

  aqfree( pool );
}

void suite_pphys_ray() {
  suite( "pphys/ray" );
  test( "particle", test_ray_particle );
  test( "world", test_ray_world );
}
