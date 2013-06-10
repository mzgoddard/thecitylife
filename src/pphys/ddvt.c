#include <assert.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#include "./ddvt.h"

void _AQDdvt_addParticle( AQDdvt *self, AQParticle *particle, aqaabb *aabb );
void _AQDdvt_removeParticle( AQDdvt *self, AQParticle *particle, aqaabb *aabb );
static void _AQDdvt_updateParticle( AQDdvt *self, AQParticle *particle, aqaabb *old, aqaabb *new );

void * AQDdvt_init( AQDdvt *self ) {
  memset( &( self->aabb ), 0, sizeof( AQDdvt ) - sizeof( AQObj ));
  return self;
}

void * AQDdvt_done( AQDdvt *self ) {
  if ( !self->tl ) {
    int i, l;
    for ( i = 0, l = self->length; i < l; ++i ) {
      aqautorelease( self->particles[ i ]);
    }
  } else {
    self->tl = aqrelease( self->tl );
    self->tr = aqrelease( self->tr );
    self->bl = aqrelease( self->bl );
    self->br = aqrelease( self->br );
  }
  return self;
}

AQDdvt * AQDdvt_create( aqaabb aabb ) {
  AQDdvt *self = aqcreate( &AQDdvtType );
  self->aabb = aabb;
  return self;
}

static inline void _AQDdvt_addParticleLeaf( AQDdvt *self, AQParticle *particle ) {
  // assert( self->length < MAX_DDVT_PARTICLES );
  self->particles[ self->length++ ] = aqretain( particle );
}

int _AQDdvt_indexOf( AQDdvt *self, AQParticle *particle ) {
  int index;
  int length = self->length;

  for ( index = 0; index < length; ++index ) {
    if ( self->particles[ index ] == particle ) {
      return index;
    }
  }
  return -1;
}

static inline int _AQDdvt_removeParticleLeaf( AQDdvt *self, AQParticle *particle ) {
  int index = _AQDdvt_indexOf( self, particle );
  if ( ~index ) {
    self->particles[ index ] = self->particles[ self->length - 1 ];
    self->length--;
    aqautorelease( particle );
    return 1;
  }
  return 0;
}

void _AQDdvt_updateParticleLeaf(
  AQDdvt *self, AQParticle *particle, aqaabb *old, aqaabb *new
) {
  int intersectNew = aqaabb_intersectsBox( self->aabb, *new );

  if (
    intersectNew && !~_AQDdvt_indexOf( self, particle )
  ) {
    AQDdvt_addParticle( self, particle );
    return;
  }

  if (
    !intersectNew && aqaabb_intersectsBox( self->aabb, *old )
  ) {
    _AQDdvt_removeParticleLeaf( self, particle );
  }
}

void _AQDdvt_addParticleChild( AQDdvt *self, AQParticle *particle, aqaabb *aabb ) {
  int added = 0;
  if ( aqaabb_intersectsBox( self->tl->aabb, *aabb )) {
    _AQDdvt_addParticle( self->tl, particle, aabb );
    added = 1;
  }
  if ( aqaabb_intersectsBox( self->tr->aabb, *aabb )) {
    _AQDdvt_addParticle( self->tr, particle, aabb );
    added = 1;
  }
  if ( aqaabb_intersectsBox( self->bl->aabb, *aabb )) {
    _AQDdvt_addParticle( self->bl, particle, aabb );
    added = 1;
  }
  if ( aqaabb_intersectsBox( self->br->aabb, *aabb )) {
    _AQDdvt_addParticle( self->br, particle, aabb );
    added = 1;
  }

  if ( added ) {
    self->length++;
  }
}

int _AQDdvt_removeParticleChild( AQDdvt *self, AQParticle *particle, aqaabb *aabb ) {
  int removed = 0;

  if ( aqaabb_intersectsBox( self->tl->aabb, *aabb )) {
    _AQDdvt_removeParticle( self->tl, particle, aabb );
    removed = 1;
  }
  if ( aqaabb_intersectsBox( self->tr->aabb, *aabb )) {
    _AQDdvt_removeParticle( self->tr, particle, aabb );
    removed = 1;
  }
  if ( aqaabb_intersectsBox( self->bl->aabb, *aabb )) {
    _AQDdvt_removeParticle( self->bl, particle, aabb );
    removed = 1;
  }
  if ( aqaabb_intersectsBox( self->br->aabb, *aabb )) {
    _AQDdvt_removeParticle( self->br, particle, aabb );
    removed = 1;
  }

  if ( removed ) {
    self->length--;
  }

  return removed;
}

void _AQDdvt_updateParticleChild(
  AQDdvt *self, AQParticle *particle, aqaabb *lastAabb, aqaabb *aabb
) {
  // aqaabb aabb = AQParticle_aabb( particle );
  // aqaabb lastAabb = AQParticle_lastAabb( particle );

  int updated = 0;
  int added = 0;
  int removed = 0;

  #define INTERSECT_AND_UPDATE(corner) \
    int corner ## Intersect = aqaabb_intersectsBox( self->corner->aabb, *aabb ); \
    int corner ## LastIntersect = aqaabb_intersectsBox( self->corner->aabb, *lastAabb ); \
    \
    if ( corner ## Intersect && corner ## LastIntersect ) { \
      _AQDdvt_updateParticle( self->corner, particle, lastAabb, aabb ); \
      updated = 1; \
    } else if ( corner ## Intersect ) { \
      _AQDdvt_addParticle( self->corner, particle, aabb ); \
      added = 1; \
    } else if ( corner ## LastIntersect ) { \
      _AQDdvt_removeParticle( self->corner, particle, lastAabb ); \
      removed = 1; \
    }

  INTERSECT_AND_UPDATE(tl)
  INTERSECT_AND_UPDATE(tr)
  INTERSECT_AND_UPDATE(bl)
  INTERSECT_AND_UPDATE(br)

  #undef INTERSECT_AND_UPDATE

  if ( !updated ) {
    if ( added && !removed ) {
      self->length++;
    }
    if ( removed && !added ) {
      self->length--;
    }
  }
}

void _AQDdvt_toChildren( AQDdvt *self ) {
  self->tl = aqretain( AQDdvt_create( aqaabb_tl( self->aabb )));
  self->tr = aqretain( AQDdvt_create( aqaabb_tr( self->aabb )));
  self->bl = aqretain( AQDdvt_create( aqaabb_bl( self->aabb )));
  self->br = aqretain( AQDdvt_create( aqaabb_br( self->aabb )));

  int index;
  int length = self->length;
  for ( index = 0; index < length; index++ ) {
    AQParticle *particle = self->particles[ index ];
    aqaabb aabb = AQParticle_aabb( particle );

    #define TEST_AND_ADD(corner) \
      if ( aqaabb_intersectsBox( self->corner->aabb, aabb )) { \
        _AQDdvt_addParticle( self->corner, particle, &aabb ); \
      }
    TEST_AND_ADD(tl);
    TEST_AND_ADD(tr);
    TEST_AND_ADD(bl);
    TEST_AND_ADD(br);
    #undef TEST_AND_ADD

    aqautorelease( particle );
  }
}

void _AQDdvt_fromChildrenIterator( AQParticle *particle, void *ctx ) {
  if ( !~_AQDdvt_indexOf( (AQDdvt *) ctx, particle )) {
    _AQDdvt_addParticleLeaf( (AQDdvt *) ctx, particle );
  }
}

void _AQDdvt_fromChildren( AQDdvt *self ) {
  self->length = 0;
  AQDdvt_iterate( self->tl, _AQDdvt_fromChildrenIterator, self );
  AQDdvt_iterate( self->tr, _AQDdvt_fromChildrenIterator, self );
  AQDdvt_iterate( self->bl, _AQDdvt_fromChildrenIterator, self );
  AQDdvt_iterate( self->br, _AQDdvt_fromChildrenIterator, self );

  aqrelease( self->tl ); self->tl = NULL;
  aqrelease( self->tr ); self->tr = NULL;
  aqrelease( self->bl ); self->bl = NULL;
  aqrelease( self->br ); self->br = NULL;
}

void _AQDdvt_addParticle( AQDdvt *self, AQParticle *particle, aqaabb *aabb ) {
  if ( !self->tl && self->length < MAX_DDVT_PARTICLES ) {
    _AQDdvt_addParticleLeaf( self, particle );
  } else {
    if ( !self->tl ) {
      _AQDdvt_toChildren( self );
    }

    _AQDdvt_addParticleChild( self, particle, aabb );
  }
}

void _AQDdvt_removeParticle( AQDdvt *self, AQParticle *particle, aqaabb *aabb ) {
  if ( !self->tl ) {
    _AQDdvt_removeParticleLeaf( self, particle );
  } else {
    _AQDdvt_removeParticleChild( self, particle, aabb );

    if ( self->length == MIN_DDVT_PARTICLES ) {
      _AQDdvt_fromChildren( self );
    }
  }
}

static inline void _AQDdvt_updateParticle( AQDdvt *self, AQParticle *particle, aqaabb *old, aqaabb *new ) {
  if ( !self->tl ) {
    _AQDdvt_updateParticleLeaf( self, particle, old, new );
  } else {
    _AQDdvt_updateParticleChild( self, particle, old, new );

    if ( self->length == MIN_DDVT_PARTICLES ) {
      _AQDdvt_fromChildren( self );
    }
  }
}

void AQDdvt_addParticle( AQDdvt *self, AQParticle *particle ) {
  aqaabb aabb = AQParticle_aabb( particle );
  _AQDdvt_addParticle( self, particle, &aabb );
}

void AQDdvt_removeParticle( AQDdvt *self, AQParticle *particle, aqaabb aabb ) {
  _AQDdvt_removeParticle(
    self,
    particle,
    &aabb
  );
}

void AQDdvt_updateParticle( AQDdvt *self, AQParticle *particle, aqaabb old, aqaabb new ) {
  _AQDdvt_updateParticle( self, particle, &old, &new );
}

void AQDdvt_iterate( AQDdvt *self, AQDdvt_iterator iterator, void *ctx ) {
  if ( !self->tl ) {
    int index;
    int length = self->length;
    for ( index = 0; index < length; ++index ) {
      iterator( self->particles[ index ], ctx );
    }
  } else {
    AQDdvt_iterate( self->tl, iterator, ctx );
    AQDdvt_iterate( self->tr, iterator, ctx );
    AQDdvt_iterate( self->bl, iterator, ctx );
    AQDdvt_iterate( self->br, iterator, ctx );
  }
}

void AQDdvt_iteratePairs(
  AQDdvt *self,
  AQDdvt_pairIterator pairIterator,
  void *ctx
) {
  if ( !self->tl ) {
    int i, j;
    int length = self->length;
    for ( i = 0; i < length - 1; ++i ) {
      for ( j = i + 1; j < length; ++j ) {
        pairIterator( self->particles[ i ], self->particles[ j ], ctx );
      }
    }
  } else {
    AQDdvt_iteratePairs( self->tl, pairIterator, ctx );
    AQDdvt_iteratePairs( self->tr, pairIterator, ctx );
    AQDdvt_iteratePairs( self->bl, pairIterator, ctx );
    AQDdvt_iteratePairs( self->br, pairIterator, ctx );
  }
}

AQTYPE_INIT_DONE(AQDdvt);
