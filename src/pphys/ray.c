#include <stdlib.h>

#include "src/pphys/ray.h"

AQRay * AQRay_create( aqvec2 position, aqvec2 direction, AQDOUBLE distance ) {
  AQRay *self = aqcreate( &AQRayType );
  self->position = position;
  self->direction = direction;
  self->distance = distance;
  return self;
}

AQDOUBLE _AQRay_particleDistance( AQRay *self, AQParticle *particle ) {
  aqvec2 d = aqvec2_scale( self->direction, self->distance );
  aqvec2 f = aqvec2_sub( self->position, particle->position );
  AQDOUBLE a = aqvec2_dot( d, d );
  AQDOUBLE b = 2 * aqvec2_dot( f, d );
  AQDOUBLE c = aqvec2_dot( f, f ) - particle->radius * particle->radius;

  AQDOUBLE discriminant = b * b - 4 * a * c;
  if ( discriminant < 0 ) {
    return -1;
  }

  discriminant = sqrt( discriminant );
  AQDOUBLE t1 = ( -b - discriminant ) / ( 2 * a );
  AQDOUBLE t2 = ( -b + discriminant ) / ( 2 * a );

  if ( t1 >= 0 && t1 <= 1 ) {
    return t1 * self->distance;
  }
  if ( t2 >= 0 && t2 <= 1 ) {
    return t2 * self->distance;
  }

  return -1;
}

int AQRay_testParticle( AQRay *self, AQParticle *particle ) {
  AQDOUBLE distance = _AQRay_particleDistance( self, particle );
  return distance >= 0 && distance <= self->distance;
}

AQDOUBLE _AQRay_lineDistance( AQRay *self, aqvec2 b1, aqvec2 b2 ) {
  aqvec2 ba = aqvec2_scale( self->direction, self->distance );
  aqvec2 dc = aqvec2_sub( b2, b1 );

  AQDOUBLE bDotDPerp = aqvec2_cross( ba, dc );
  if ( bDotDPerp == 0 ) {
    return -1;
  }

  aqvec2 ca = aqvec2_sub( b1, self->position );
  AQDOUBLE t = aqvec2_cross( ca, dc ) / bDotDPerp;
  if ( t < 0 || t > 1 ) {
    return -1;
  }

  AQDOUBLE u = aqvec2_cross( ca, ba ) / bDotDPerp;
  if ( u < 0 || u > 1 ) {
    return -1;
  }

  return t * self->distance;
}

AQDOUBLE _AQRay_ddvtDistance( AQRay *self, AQDdvt *ddvt ) {
  AQDOUBLE distance = INFINITY;
  AQDOUBLE tmp;

  aqaabb aabb = ddvt->aabb;
  aqvec2 a, b;

  #define TESTLINE(_a, _b) \
    tmp = _AQRay_lineDistance( self, _a, _b ); \
    if ( tmp >= 0 && tmp <= distance ) { \
      distance = tmp; \
    }
  TESTLINE(
    aqvec2_make( aabb.left, aabb.bottom ),
    aqvec2_make( aabb.left, aabb.top )
  );
  TESTLINE(
    aqvec2_make( aabb.right, aabb.bottom ),
    aqvec2_make( aabb.right, aabb.top )
  );
  TESTLINE(
    aqvec2_make( aabb.left, aabb.bottom ),
    aqvec2_make( aabb.right, aabb.bottom )
  );
  TESTLINE(
    aqvec2_make( aabb.left, aabb.top ),
    aqvec2_make( aabb.right, aabb.top )
  );
  #undef TESTLINE

  return distance;
}

AQParticle * _AQRay_testDdvt( AQRay *self, AQDdvt *ddvt, AQParticleMask mask ) {
  if ( ddvt->tl ) {
    AQDdvt *ddvts[] = {
      ddvt->tl,
      ddvt->tr,
      ddvt->br,
      ddvt->bl
    };
    AQDOUBLE distances[] = {
      _AQRay_ddvtDistance( self, ddvt->tl ),
      _AQRay_ddvtDistance( self, ddvt->tr ),
      _AQRay_ddvtDistance( self, ddvt->br ),
      _AQRay_ddvtDistance( self, ddvt->bl )
    };

    AQDOUBLE lastDistance = 0;
    for ( int i = 0; i < 4; i++ ) {
      int j;
      int ddvtIndex = -1;
      AQDOUBLE distance = INFINITY;
      for ( j = 0; j < 4; j++ ) {
        if ( distances[ j ] < distance && distances[ j ] > lastDistance ) {
          distance = distances[ j ];
          ddvtIndex = j;
        }
      }

      if ( ddvtIndex == -1 ) {
        break;
      }

      lastDistance = distance;
      AQParticle *particle = _AQRay_testDdvt( self, ddvts[ ddvtIndex ], mask );
      if ( particle ) {
        return particle;
      }
    }
  } else {
    AQParticle *closest = NULL;
    AQDOUBLE distance = INFINITY;
    for ( int i = 0; i < ddvt->length; i++ ) {
      AQParticle *particle = ddvt->particles[ i ];
      if ( mask != 0 && ( particle->collisionType & mask ) == 0 ) {
        continue;
      }
      AQDOUBLE tmp = _AQRay_particleDistance( self, particle );
      if ( tmp >= 0 && tmp < distance ) {
        closest = particle;
        distance = tmp;
      }
    }

    return closest;
  }

  return NULL;
}

AQParticle * AQRay_testWorld(
  AQRay *self, AQWorld *world, AQParticleMask mask
) {
  // iterate through world ddvt volumes with ray until a particle that collides
  // is found.
  return _AQRay_testDdvt( self, world->ddvt, mask );
}

AQTYPE_ALL(
  AQRay, sizeof( AQRay ), NULL,
  AQObj_init, AQObj_done, AQObj_getInterface
);
