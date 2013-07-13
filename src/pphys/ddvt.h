#ifndef DDVT_H_VVV1KMJ0
#define DDVT_H_VVV1KMJ0

#include "math.h"
#include "particle.h"

#define MAX_DDVT_PARTICLES 48
#define MIN_DDVT_PARTICLES 24

extern AQType AQDdvtType;

typedef void (*AQDdvt_iterator)( AQParticle *, void * );
typedef void (*AQDdvt_pairIterator)( AQParticle *, AQParticle *, void * );

typedef struct AQDdvt {
  AQObj object;

  aqaabb aabb;
  struct AQDdvt *tl, *tr, *bl, *br;
  AQParticle * particles[ MAX_DDVT_PARTICLES ];
  int length;
} AQDdvt;

AQDdvt * AQDdvt_create();
void AQDdvt_addParticle( AQDdvt *, AQParticle * );
void AQDdvt_removeParticle( AQDdvt *, AQParticle *, aqaabb );
void AQDdvt_updateParticle( AQDdvt *, AQParticle *, aqaabb old, aqaabb new );
void AQDdvt_iterate( AQDdvt *, AQDdvt_iterator, void * );
void AQDdvt_iteratePairs( AQDdvt *, AQDdvt_pairIterator, void * );

#endif /* end of include guard: DDVT_H_VVV1KMJ0 */
