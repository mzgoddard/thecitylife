#include <stdio.h>
#include <math.h>

#include "src/pphys/index.h"
#include "test/runner/runner.h"

void test_stick_exists( Result **result ) {
  AQStick *s = aqinit( aqalloc( &AQStickType ));
  ok( s->object.type == &AQStickType, "is AQStick" );
  aqfree( s );
}

void test_stick_update( Result **result ) {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));

  AQParticle *p = aqcreate( &AQParticleType );
  p->position = aqvec2_make( 0, 0 );
  AQParticle *q = aqcreate( &AQParticleType );
  q->position = aqvec2_make( 1, 0 );

  AQStick *stick = AQStick_create( p, q );

  q->position.x = 2;
  AQStick_update( stick );

  ok( aqvec2_eq( p->position, (aqvec2) { 0.5, 0 }), "p updated" );
  ok( aqvec2_eq( q->position, (aqvec2) { 1.5, 0 }), "q updated" );

  p->position.x = 0;
  AQStick_update( stick );

  aqfree( pool );
}

void suite_pphys_stick() {
  suite( "pphys/stick" );
  test( "exists", test_stick_exists );
  test( "update", test_stick_update );
}
