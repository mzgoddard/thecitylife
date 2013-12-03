#include "src/obj/index.h"

extern AQType AQAppType;

typedef struct AQApp {
  AQObj object;

  int _argc;
  char **_argv;

  AQList *arguments;
  AQString *binaryPath;
  AQString *resourcePath;
} AQApp;

// Initialize a singleton instance of AQApp.
AQApp * AQApp_initApp( int argc, const char **argv );

// Access the singleton.
AQApp * AQApp_app();

AQString * AQApp_setBinaryPath( AQApp *, AQString * );
AQString * AQApp_setResourcePath( AQApp *, AQString * );
