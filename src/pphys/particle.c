#include <assert.h>
#include <stdlib.h>
#include <string.h>

#include "./particle.h"

static const AQDOUBLE posmul = 1.99;
static const AQDOUBLE lastposmul = 0.99;
static const AQDOUBLE friction = 0.001;

typedef struct aqcollidewith {
  AQParticle *particle;
  struct aqcollidewith *next;
} aqcollidewith;

aqcollidewith * aqcollidewith_init();
aqcollidewith * aqcollidewith_done( aqcollidewith * );
int aqcollidewith_contains( aqcollidewith *, AQParticle *others );
aqcollidewith * aqcollidewith_add( aqcollidewith *, AQParticle *others );
void aqcollidewith_clear( aqcollidewith * );

void * AQParticle_init( AQParticle *self ) {
  memset( &( self->position ), 0, sizeof( AQParticle ) - sizeof( AQObj ));
  self->radius = 1;
  self->mass = 1;
  self->friction = 0.00001;
  return self;
}

void * AQParticle_done( AQParticle *self ) {
  aqcollidewith_done( self->collideWith );
  return self;
}

aqaabb AQParticle_aabb( AQParticle *self ) {
  return aqaabb_makeCenterRadius( self->position, self->radius );
}

aqaabb AQParticle_lastAabb( AQParticle *self ) {
  return aqaabb_makeCenterRadius( self->lastPosition, self->radius );
}

void AQParticle_integrate( AQParticle *self, AQDOUBLE dt ) {
  if ( self->isStatic ) { return; }

  aqvec2 position = self->position;
  self->position = aqvec2_add(
    aqvec2_sub(
      aqvec2_scale( self->position, posmul ),
      aqvec2_scale( self->lastPosition, lastposmul )
    ),
    aqvec2_scale( self->acceleration, dt * dt )
  );
  self->lastPosition = position;
  self->acceleration = (aqvec2) { 0, 0 };
}

void AQParticle_testPrep( AQParticle *self ) {
  // aqcollidewith_clear( self->collideWith );
  self->collideWithNext = self->collideWith;
  if ( self->collideWithNext ) {
    ((struct aqcollidewith*)self->collideWithNext)->particle = NULL;
  }
}

int _AQParticle_test( AQParticle *self, AQParticle *other, aqcollision *col ) {
  AQDOUBLE
    ax = self->position.x,
    ay = self->position.y,
    ar = self->radius,
    bx = other->position.x,
    by = other->position.y,
    br = other->radius,
    abx = ax - bx,
    aby = ay - by,
    abr = ar + br,
    ingress;

  ingress = abx*abx+aby*aby;
  if (((ingress < abr*abr))) {
    ingress = sqrt(ingress);
    col->distance = abr - ingress;

    if ( ingress == 0.0 ) {
      ingress = 1e-5;
    }

    AQDOUBLE
      lx = abx,
      ly = aby,
      al = ingress,
      pt = (al - ar) / al,
      qt = br / al;
    col->lambx = lx * (qt - pt);
    col->lamby = ly * (qt - pt);

    col->a = self;
    col->b = other;

    return 1;
  }

  return 0;
}

int AQParticle_test( AQParticle *self, AQParticle *other, aqcollision *col ) {
  if ( self->isStatic && other->isStatic ) return 0;

  // if ( self->mask & other->collisionMask == 0 || 
  //   other->mask & self->collisionMask == 0 ) {
  //   return false;
  // }

  AQDOUBLE
    ax = self->position.x,
    ay = self->position.y,
    ar = self->radius,
    bx = other->position.x,
    by = other->position.y,
    br = other->radius,
    abx = ax - bx,
    aby = ay - by,
    abr = ar + br,
    ingress;

  ingress = abx*abx+aby*aby;
  if (((ingress < abr*abr))) {
    if ( aqcollidewith_contains( self->collideWith, other )) {
      return 0;
    }

    if ( !self->collideWithNext ) {
      self->collideWith = self->collideWithNext = aqcollidewith_init();
    }
    self->collideWithNext = aqcollidewith_add( self->collideWithNext, other );

    if ( !other->collideWithNext ) {
      other->collideWith = other->collideWithNext = aqcollidewith_init();
    }
    other->collideWithNext = aqcollidewith_add( other->collideWithNext, self );

    ingress = sqrt(ingress);
    col->distance = abr - ingress;

    if ( ingress == 0.0 ) {
      ingress = 1e-5;
    }

    AQDOUBLE
      lx = abx,
      ly = aby,
      al = ingress,
      pt = (al - ar) / al,
      qt = br / al;
    col->lambx = lx * (qt - pt);
    col->lamby = ly * (qt - pt);

    col->a = self;
    col->b = other;

    return 1;
  }

  return 0;
}

aqcollision _staticCollision;

void AQParticle_solve( AQParticle *self, AQParticle *other, aqcollision *col ) {
  aqvec2
    *selfpos = &(self->position),
    *otherpos = &(other->position),
    *selflast = &(self->lastPosition),
    *otherlast = &(other->lastPosition);

  // int collided = _AQParticle_test( self, other, &_staticCollision );
  // col->lambx = _staticCollision.lambx;
  // col->lamby = _staticCollision.lamby;

  AQDOUBLE
    // lambx = (col->lambx) * ( 0.25 * ( fmin( col->distance / 2, 1 ) ) + 0.25 ),
    // lamby = (col->lamby) * ( 0.25 * ( fmin( col->distance / 2, 1 ) ) + 0.25 ),
    lambx = (col->lambx) * kParticleCorrection,
    lamby = (col->lamby) * kParticleCorrection,
    amsq = self->mass,
    bmsq = other->mass,
    mass = amsq + bmsq,
    am = bmsq / mass,
    bm = amsq / mass,
    avx = selflast->x - selfpos->x,
    avy = selflast->y - selfpos->y,
    avm = aqmath_hypot(avx, avy),
    bvx = otherlast->x - otherpos->x,
    bvy = otherlast->y - otherpos->y,
    bvm = aqmath_hypot(bvx, bvy),
    // fric = fabs(collision->distance) * (avm + bvm > 5 ? 0.05 : self->friction * other->friction);
    // fric = Math.abs(collision->distance) * (avm + bvm > 10 ? 0.99 : self->friction * other->friction);
    fric = fabs(col->distance) * self->friction * other->friction;

  // if (avm + bvm < 30) {
  //   lambx *= 0.3;
  //   lamby *= 0.3;
  // }

  if (avm != 0) {
    avx = (avx / avm) * (avm - fric);
    avy = (avy / avm) * (avm - fric);
  }
  if (bvm != 0) {
    bvx = bvx / bvm * (bvm - fric);
    bvy = bvy / bvm * (bvm - fric);
  }

  if (self->isStatic) {
    am = 0;
    bm = 1;
  } else if (other->isStatic) {
    am = 1;
    bm = 0;
  }

  if (self->isTrigger) {
    self->oncollision(self, other, self->userdata);
  } else if (other->isTrigger) {
    other->oncollision(other, self, other->userdata);
  } else {
    selflast->x = selfpos->x + avx;
    selflast->y = selfpos->y + avy;
    selfpos->x += lambx * am;
    selfpos->y += lamby * am;

    otherlast->x = otherpos->x + bvx;
    otherlast->y = otherpos->y + bvy;
    otherpos->x -= lambx * bm;
    otherpos->y -= lamby * bm;
  }
}

aqcollidewith * aqcollidewith_init() {
  aqcollidewith *self = malloc( sizeof( aqcollidewith ));
  memset( self, 0, sizeof( aqcollidewith ));
  return self;
}

aqcollidewith * aqcollidewith_done( aqcollidewith *self ) {
  if ( self ) {
    if ( self->next ) {
      aqcollidewith_done( self->next );
    }
    free( self );
  }
  return NULL;
}

int aqcollidewith_contains( aqcollidewith *self, AQParticle *other ) {
  while ( self && self->particle ) {
    if ( self->particle == other ) {
      return 1;
    }
    self = self->next;
  }
  return 0;
}

aqcollidewith * aqcollidewith_add( aqcollidewith *self, AQParticle *other ) {
  // aqcollidewith *head = self;
  // if ( !head ) {
  //   self = head = aqcollidewith_init();
  // }

  // while ( self->particle ) {
  //   if ( !self->next ) {
  //     self->next = aqcollidewith_init();
  //   }
  //   self = self->next;
  // }
  if ( !self ) {
    self = aqcollidewith_init();
  }
  if ( !self->next ) {
    self->next = aqcollidewith_init();
  } else {
    self->next->particle = NULL;
  }

  self->particle = other;

  return self->next;
}

void aqcollidewith_clear( aqcollidewith *self ) {
  while ( self && self->particle ) {
    // assert( self->particle->object.type == &AQParticleType );
    self->particle = NULL;
    self = self->next;
  }
}

AQTYPE_INIT_DONE(AQParticle);
