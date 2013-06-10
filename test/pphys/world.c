#include <stdio.h>

#include "src/pphys/index.h"

void test_world_new() {
  AQWorld *world = aqinit( aqalloc( &AQWorldType ));
  ok( world->object.type == &AQWorldType, "is AQWorld" );
  aqfree( world );
  ok( ((AQObj *) world)->refCount == 0, "freed" );
}

void test_world_solve2() {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
  AQWorld *world = aqinit( aqalloc( &AQWorldType ));
  AQWorld_setAabb( world, (aqaabb) { 16, 16, -16, -16 });

  AQParticle *a = aqcreate( &AQParticleType );
  a->position = (aqvec2) { 2, 2 };
  a->lastPosition = (aqvec2) { 2, 2 };
  a->radius = 1;
  AQWorld_addParticle( world, a );
  ok( a->object.refCount == 3, "retained by world" );

  AQParticle *b = aqcreate( &AQParticleType );
  b->position = (aqvec2) { 3, 2 };
  b->lastPosition = (aqvec2) { 3, 2 };
  b->radius = 1;
  AQWorld_addParticle( world, b );
  ok( b->object.refCount == 3, "retained by world" );

  AQWorld_step( world, 0.016 );

  ok( aqvec2_eq( a->position, (aqvec2) { 1.5, 2 } ), "a resolved" );
  ok( aqvec2_eq( b->position, (aqvec2) { 3.5, 2 } ), "b resolved" );

  ok( a->object.refCount == 3, "refCount hasn't changed" );
  ok( b->object.refCount == 3, "refCount hasn't changed" );

  aqretain( a );
  aqretain( b );

  aqfree( world );
  aqfree( pool );

  ok( a->object.refCount == 1, "released from world" );
  ok( b->object.refCount == 1, "released from world" );

  aqfree( a );
  aqfree( b );
}

void test_world_solveMany() {
  AQReleasePool *pool = AQReleasePool_create();
  AQWorld *world = aqcreate( &AQWorldType );
  AQWorld_setAabb( world, (aqaabb) { 16, 16, -16, -16 });

  AQParticle *p;

  // Fill the tl.
  int i, j;
  for ( i = 0; i < 5; ++i ) {
    for ( j = 0; j < 5; ++j ) {
      p = aqcreate( &AQParticleType );
      p->position = (aqvec2) {
        i * 16.0 / 5 - 16.0 / 10 * 9,
        j * 16.0 / 5 + 16.0 / 10
      };
      p->lastPosition = p->position;
      p->radius = 1;
      AQWorld_addParticle( world, p );
    }
  }

  ok( world->ddvt->tl, "world ddvt in child mode" );

  p = aqcreate( &AQParticleType );
  p->position = p->lastPosition = (aqvec2) { -0.5, -8 };
  p->radius = 1;
  AQWorld_addParticle( world, p );

  AQParticle *q = aqcreate( &AQParticleType );
  q->position = q->lastPosition = (aqvec2) { 0.5, -8 };
  q->radius = 1;
  AQWorld_addParticle( world, q );

  ok( world->ddvt->bl->length == 2, "bl is length 2" );

  AQWorld_step( world, 0 );

  printf( "%f %f", q->position.x, q->position.y );
  ok( aqvec2_eq( p->position, (aqvec2) { -1, -8 }), "p solved correctly" );
  ok( aqvec2_eq( q->position, (aqvec2) { 1, -8 }), "q solved correctly" );

  AQWorld_step( world, 1 / 60 );

  ok( world->ddvt->bl->length == 1, "bl is length 1" );
  ok( world->ddvt->br->length == 1, "br is length 1" );

  aqfree( pool );
}

void suite_pphys_world() {
  suite( "pphys/world" );
  test( "new", test_world_new );
  test( "solve2", test_world_solve2 );
  test( "solveMany", test_world_solveMany );
}
