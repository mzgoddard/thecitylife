#ifndef OBJ_H_HYT03822
#define OBJ_H_HYT03822

typedef int aqbool;

typedef struct AQInterface {
  char *name;
  // Interfaces have method pointers here.
} AQInterface;

typedef struct AQType {
  char *name;
  unsigned int size;
  void *pool;

  void *(*init)(void *);
  void *(*done)(void *);
  AQInterface *(*getInterface)(void *, char *);
} AQType;

#define AQTYPE_ALL(obj, size, pool, init, done, getInterface) AQType obj ## Type = (AQType) { \
  #obj, \
  size, \
  pool, \
  (void *(*)(void *)) init, \
  (void *(*)(void *)) done, \
  (AQInterface *(*)(void *, char*)) getInterface \
}

#define AQTYPE_INIT_DONE_GETINTERFACE(obj) AQTYPE_ALL( \
  obj, \
  sizeof( obj ), \
  NULL, \
  obj ## _init, \
  obj ## _done, \
  obj ## _getInterface \
)

#define AQTYPE_INIT_DONE(obj) AQTYPE_ALL( \
  obj, \
  sizeof( obj ), \
  NULL, \
  obj ## _init, \
  obj ## _done, \
  AQObj_getInterface \
)

#define AQTYPE(obj) AQTYPE_ALL( \
  obj, \
  sizeof( obj ), \
  NULL, \
  obj ## _init, \
  obj ## _done, \
  obj ## _getInterface \
)

extern AQType AQObjType;

typedef struct AQObj {
  AQType *type;
  unsigned int refCount;
  void *pool;
} AQObj;

void * AQObj_init( AQObj *self );
void * AQObj_done( AQObj *self );
struct AQInterface * AQObj_getInterface( AQObj * self, char *interface );

void * aqalloc(AQType *);
void aqfree(void *);

void * aqinit(void *);
void * aqretain(void *);
void * aqrelease(void *);
void * aqautorelease(void *);

void * aqcreate(AQType *);
AQInterface * aqcast(void *, char *interface);

#define AQCALL(obj,interface,func,...) ( \
  AQInterface *interface ## _interface = aqcast(obj,interface), \
  interface ## _interface ? \
    interface ## _interface->func( obj, __ARGS__ ) : \
    NULL \
)

extern AQType AQPoolType;

typedef AQObj AQPool;

static const char * AQPoolInterfaceName = "AQPoolInterface";

typedef struct AQPoolInterface {
  char *name;

  void *(*allocObj)(void *, AQType *);
  void *(*allocSize)(void *, unsigned int);
  void (*free)(void *, void *);
} AQPoolInterface;

AQPool * AQPool_create(unsigned int size);
AQPool * AQPool_init(AQPool *, unsigned int size);

void * AQPool_allocObj(AQPool *, AQType *);
void * AQPool_allocSize(AQPool *, unsigned int);
void AQPool_free(AQPool *, void *);

extern AQType AQReleasePoolType;

typedef AQObj AQReleasePool;

AQReleasePool * AQReleasePool_create();

void aqobj_init();

#endif /* end of include guard: OBJ_H_HYT03822 */
