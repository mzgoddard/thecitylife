#include <stdlib.h>

#include "test/runner/runner.h"

#include "src/obj/index.h"

void test_refcount( Result **result ) {
  AQObj *obj = aqinit( aqalloc( &AQObjType ));

  ok( obj->type == &AQObjType, "is AQObjType" );
  ok( obj->refCount == 1, "refCount is 1" );

  aqfree( obj );
  ok( 1, "aqfree exectued" );

  obj = aqretain( aqinit( aqalloc( &AQObjType )));
  ok( obj->refCount == 2, "refCount is 2" );
  ok( aqrelease( aqrelease( obj )) == NULL, "returned NULL" );
}

void test_autorelease( Result **result ) {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
  ok( pool != NULL, "pool created" );

  AQObj *obj = aqretain( aqinit( aqalloc( &AQObjType )));
  ok( aqautorelease( obj ) == obj, "returned obj" );

  ok( aqrelease( pool ) == NULL, "freed pool" );
  ok( obj->refCount == 1, "freed obj" );

  aqrelease( obj );

  AQReleasePool *toppool = aqinit( aqalloc( &AQReleasePoolType ));
  pool = AQReleasePool_create();

  obj = aqretain( aqcreate( &AQObjType ));

  ok( aqrelease( toppool ) == NULL, "freed top pool" );
  ok( obj->refCount == 1, "freed obj" );

  aqrelease( obj );
}

void suite_obj_obj() {
  suite( "obj/obj" );
  test( "refcount", test_refcount );
  test( "autorelease", test_autorelease );
}
