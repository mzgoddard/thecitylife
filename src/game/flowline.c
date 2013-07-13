#include <stdlib.h>
#include <string.h>

#include "./flowline.h"

AQFlowLine * AQFlowLine_init( AQFlowLine *self ) {
  memset( &self->numPoints, 0, sizeof( AQFlowLine ) - sizeof( AQObj ));
  self->minPointDistance = 1;
  self->radius = 1;
  self->force = 1;
  return self;
}

AQFlowLine * AQFlowLine_done( AQFlowLine *self ) {
  if ( self->points ) {
    free( self->points );
  }

  AQFlowLine_destroyParticles( self );
  aqrelease( self->world );
  aqrelease( self->particles );

  return self;
}

void _AQFlowLine_increatePointArray( AQFlowLine *self, int newCapacity ) {
  aqvec2 *newPoints = calloc( newCapacity, sizeof( aqvec2 ));

  if ( self->points ) {
    int i = 0; int l = self->numPoints;
    for ( ; i < l; ++i ) {
      newPoints[ i ] = self->points[ i ];
    }
    free( self->points );
  }

  self->pointsCapacity = newCapacity;
  self->points = newPoints;
}

void AQFlowLine_addPoint( AQFlowLine *self, aqvec2 point ) {
  if ( self->numPoints == self->pointsCapacity ) {
    _AQFlowLine_increatePointArray( self, self->pointsCapacity + 16 );
  }

  if ( self->numPoints == 0 ) {
    self->points[ self->numPoints++ ] = point;
  } else {
    aqvec2 *lastPt = &( self->points[ self->numPoints - 1 ]);
    if ( aqvec2_mag( aqvec2_sub( *lastPt, point )) > self->minPointDistance ) {
      self->points[ self->numPoints++ ] = point;
    }
  }
}

void AQFlowLine_clearPoints( AQFlowLine *self ) {
  self->numPoints = 0;
}

struct AQFlowParticleData {
  AQFlowLine *self;
  aqvec2 direction;
};

void _AQFlowLine_oncollision(
  AQParticle *a, AQParticle *b, struct AQFlowParticleData *data
) {
  b->acceleration = aqvec2_add(
    b->acceleration,
    aqvec2_scale( data->direction, data->self->force / b->mass )
  );
}

void AQFlowLine_createParticles( AQFlowLine *self, AQWorld *world ) {
  AQFlowLine_destroyParticles( self );

  if ( self->world ) {
    aqrelease( self->world );
  }
  self->world = aqretain( world );

  if ( !self->particles ) {
    self->particles = aqinit( aqalloc( &AQListType ));
  }

  int i = 0; int l = self->numPoints;
  for ( ; i < l; ++i ) {
    AQParticle *particle = aqcreate( &AQParticleType );
    particle->position = self->points[ i ];
    particle->lastPosition = self->points[ i ];
    particle->radius = self->radius;
    particle->mass = M_PI * self->radius * self->radius;
    particle->isTrigger = 1;
    particle->isStatic = 1;

    struct AQFlowParticleData *data =
      malloc( sizeof( struct AQFlowParticleData ));
    *data = (struct AQFlowParticleData) {
      self,
      aqvec2_normalized( ( i < l - 1 ) ?
        aqvec2_sub( self->points[ i + 1 ], self->points[ i ] ) :
        aqvec2_sub( self->points[ i ], self->points[ i - 1 ] )
      )
    };

    particle->oncollision =
      (AQParticleCollisionCallback) _AQFlowLine_oncollision;
    particle->userdata = data;
    AQWorld_addParticle( world, particle );
    AQList_push( self->particles, (AQObj *) particle );
  }
}

void AQFlowLine_destroyParticles( AQFlowLine *self ) {
  if ( !self->particles ) {
    return;
  }

  while ( AQList_length( self->particles )) {
    AQParticle *particle = (AQParticle *) AQList_pop( self->particles );
    AQWorld_removeParticle( self->world, particle );
    free( particle->userdata );
  }
}

AQTYPE_INIT_DONE(AQFlowLine);
