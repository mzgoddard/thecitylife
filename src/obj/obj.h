#ifndef OBJ_H_HYT03822
#define OBJ_H_HYT03822

typedef unsigned char aqbool;

typedef char AQInterfaceId[];

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
  AQInterface *(*getInterface)(void *, const char *);
} AQType;

#define AQTYPE_ALL(obj, size, pool, init, done, getInterface) AQType obj ## Type = (AQType) { \
  #obj, \
  size, \
  pool, \
  (void *(*)(void *)) init, \
  (void *(*)(void *)) done, \
  (AQInterface *(*)(void *, const char*)) getInterface \
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
struct AQInterface * AQObj_getInterface( AQObj * self, const char *interface );

void * aqalloc(AQType *);
void aqfree(void *);
void * aqzero(void *);

void * aqinit(void *);
void * aqdone(void *);
void * aqretain(void *);
void * aqrelease(void *);
void * aqautorelease(void *);

void * aqcreate(AQType *);
void * aqcast(void *, const char *interface);

int aqistype(void *, AQType *);

#define AQCALL(obj,interface,func,...) ( \
  AQInterface *interface ## _interface = aqcast(obj,interface), \
  interface ## _interface ? \
    interface ## _interface->func( obj, __VA_ARGS__ ) : \
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

typedef struct AQCallableInterface {
  const char *name;

  void * (*call0)( void * );
  void * (*call1)( void *, void * );
  void * (*call2)( void *, void *, void * );
} AQCallableInterface;

extern AQType AQMethodPtrType;

typedef struct AQMethodPtr {
  AQObj obj;

  AQObj *context;
  void *fn;
} AQMethodPtr;

AQMethodPtr * AQMethodPtr_create( AQObj *, void * );
void * AQMethodPtr_call0( AQMethodPtr * );
void * AQMethodPtr_call1( AQMethodPtr *, void * );
void * AQMethodPtr_call2( AQMethodPtr *, void *, void * );

#endif /* end of include guard: OBJ_H_HYT03822 */
