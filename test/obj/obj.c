#include <stdlib.h>

#include "test/runner/runner.h"

#include "src/obj/index.h"

void test_refcount() {
  AQObj *obj = aqinit( aqalloc( &AQObjType ));

  ok( obj->type == &AQObjType, "is AQObjType" );
  ok( obj->refCount == 1, "refCount is 1" );

  aqfree( obj );

  ok( obj->refCount == 0, "refCount is 0" );

  obj = aqretain( aqinit( aqalloc( &AQObjType )));
  ok( obj->refCount == 2, "refCount is 2" );
  ok( aqrelease( aqrelease( obj )) == NULL, "returned NULL" );
}

void test_autorelease() {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
  ok( pool != NULL, "pool created" );

  AQObj *obj = aqinit( aqalloc( &AQObjType ));
  ok( aqautorelease( obj ) == obj, "returned obj" );

  aqfree( pool );
  ok( pool->refCount == 0, "freed pool" );
  ok( obj->refCount == 0, "freed obj" );

  AQReleasePool *toppool = aqinit( aqalloc( &AQReleasePoolType ));
  pool = AQReleasePool_create();

  obj = aqcreate( &AQObjType );

  aqfree( toppool );

  ok( pool->refCount == 0, "freed child pool" );
  ok( obj->refCount == 0, "freed obj" );
}

void suite_obj_obj() {
  suite( "obj/obj" );
  test( "refcount", test_refcount );
  test( "autorelease", test_autorelease );
}
