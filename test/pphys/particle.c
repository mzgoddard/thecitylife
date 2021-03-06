#include <stdio.h>
#include <math.h>

#include "src/pphys/index.h"
#include "test/runner/runner.h"

void test_particle_exists( Result **result ) {
  AQParticle *p = aqinit( aqalloc( &AQParticleType ));
  ok( p->object.type == &AQParticleType, "is AQParticle" );
  aqfree( p );
}

void test_particle_integrate( Result **result ) {
  AQParticle *p = aqinit( aqalloc( &AQParticleType ));
  p->position = (aqvec2) { 2, 2 };
  p->lastPosition = (aqvec2) { 1, 1 };

  AQParticle_integrate( p, 1 );
  ok( aqvec2_eq( p->position, (aqvec2) { 3, 3 }), "position updated" );
  ok( aqvec2_eq( p->lastPosition, (aqvec2) { 2, 2 }), "lastPosition updated" );

  p->acceleration = (aqvec2) { -1, -1 };
  AQParticle_integrate( p, 1 );
  ok( aqvec2_eq( p->position, (aqvec2) { 3, 3 }), "position updated" );
  ok( aqvec2_eq( p->lastPosition, (aqvec2) { 3, 3 }), "lastPosition updated" );
  ok( aqvec2_eq( p->acceleration, (aqvec2) { 0, 0 }), "acceleration zeroed" );

  aqfree( p );
}

void test_collision( Result **result ) {
  AQParticle *p = aqinit( aqalloc( &AQParticleType ));
  p->radius = 2;
  p->mass = 1;
  p->friction = 0;

  AQParticle *q = aqinit( aqalloc( &AQParticleType ));
  q->radius = 2;
  q->mass = 1;
  q->friction = 0;

  aqcollision collision;

  int i;
  AQDOUBLE pPositions[] = {
    0, 0, -1.5, 0,
    0, 0, 0, -1.5,
    0, 0, 0, 1.5
  };
  AQDOUBLE qPositions[] = {
    1, 0, 2.5, 0,
    0, 1, 0, 2.5,
    0, -1, 0, -2.5
  };
  AQDOUBLE lValues[] = {
    3, 0,
    0, 3,
    0, 3
  };

  for ( i = 0; i < 12; i += 4 ) {
    p->position = (aqvec2) { pPositions[ i ], pPositions[ i + 1 ] };
    q->position = (aqvec2) { qPositions[ i ], qPositions[ i + 1 ] };

    AQParticle_testPrep( p );
    AQParticle_testPrep( q );
    ok( AQParticle_test( p, q, &collision ), "particles collide" );
    ok( fdim(
      #if !__SSE__
      collision.lambx,
      #else
      collision.lamb.x,
      #endif
      lValues[ i / 4 * 2 ]
    ) < AQEPS, "lamb x is accurate" );
    ok( fdim(
      #if !__SSE__
      collision.lamby,
      #else
      collision.lamb.y,
      #endif
      lValues[ i / 4 * 2 + 1 ]
    ) < AQEPS, "lamb y is accurate" );

    AQParticle_solve( collision.a, collision.b, &collision );

    ok( aqvec2_eq(
      p->position, (aqvec2){ pPositions[ i + 2 ], pPositions[ i + 3 ]}
    ), "first particle correct" );
    ok( aqvec2_eq(
      q->position, (aqvec2){ qPositions[ i + 2 ], qPositions[ i + 3 ]}
    ), "second particle correct" );
  }

  aqfree( p );
  aqfree( q );
}

void test_doubleTest( Result **result ) {
  AQParticle p, q;
  p.object.type = q.object.type = &AQParticleType;
  p.object.refCount = q.object.refCount = 1;
  aqinit( &p ); aqinit( &q );
  p.position = (aqvec2) { 1, 0 };
  q.position = (aqvec2) { 2, 0 };

  aqcollision col;
  ok( AQParticle_test( &p, &q, &col ), "collides" );
  ok( !AQParticle_test( &p, &q, &col ), "doesn't collide twice" );

  aqdone( &p ); aqdone( &q );
}

void suite_pphys_particle() {
  suite( "pphys/particle" );
  test( "exists", test_particle_exists );
  test( "integrate", test_particle_integrate );
  test( "collision", test_collision );
  // test( "no double test", test_doubleTest );
}
