#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "src/sys/app.h"

static AQApp *_app = NULL; 

AQApp * AQApp_init( AQApp *self ) {
  memset(
    self + sizeof( AQObj ),
    0,
    sizeof( AQApp ) - sizeof( AQObj )
  );

  self->arguments = aqinit( aqalloc( &AQListType ));
  self->binaryPath = NULL;
  self->resourcePath = NULL;
  return self;
}

AQApp * AQApp_done( AQApp *self ) {
  aqrelease( self->arguments );
  aqrelease( self->binaryPath );
  aqrelease( self->resourcePath );
  return self;
}

AQApp * AQApp_initApp( int argc, const char **argv ) {
  _app = aqinit( aqalloc( &AQAppType ));

  _app->_argc = argc;
  _app->_argv = argv;

  char *lastChar = strrchr( argv[0], '/' );
  char *binaryPath;
  if ( lastChar != NULL ) {
    int binaryPathLength = lastChar - argv[0];
    binaryPath = malloc( binaryPathLength + 1 );
    strncpy( binaryPath, argv[0], binaryPathLength );
    binaryPath[ binaryPathLength ] = '\0';
  } else {
    binaryPath = ".";
  }

  _app->binaryPath = aqretain( aqstr( binaryPath ));
  _app->resourcePath = aqretain( aqstr( binaryPath ));
  printf( "binaryPath: %s\n", binaryPath );

  if ( lastChar != NULL ) {
    free( binaryPath );
  }

  for ( int i = 0; i < argc; ++i ) {
    printf( "argv[%d]: %s\n", i, argv[ i ]);
    AQList_push( _app->arguments, (AQObj*) aqstr( argv[ i ]));
  }

  return _app;
}

AQApp * AQApp_app() {
  return _app;
}

AQString * AQApp_setBinaryPath( AQApp *self, AQString *path ) {
  aqrelease( self->binaryPath );
  self->binaryPath = aqretain( path );
  return path;
}

AQString * AQApp_setResourcePath( AQApp *self, AQString *path ) {
  aqrelease( self->resourcePath );
  self->resourcePath = aqretain( path );
  return path;
}

AQTYPE_INIT_DONE( AQApp );
