#include <stdlib.h>

#include "./ambientparticle.h"

void * SLAmbientParticle_init( void *_self ) {
  SLAmbientParticle *self = _self;
  self->contactPulseValue = 0;
  return _self;
}

void * SLAmbientParticle_done( void *_self ) {
  return _self;
}

SLAmbientParticle * SLAmbientParticle_create() {
  return aqcreate( &SLAmbientParticleType );
}

void SLAmbientParticle_startPulse( SLAmbientParticle *self ) {
  if ( self->contactPulseValue == 0 ) {
    self->contactPulseValue = 20;
  }
  if ( self->contactPulseValue < 15 ) {
    self->contactPulseValue = 15;
  }
}

void SLAmbientParticle_tick( SLAmbientParticle *self ) {
  if ( self->contactPulseValue > 0 ) {
    self->contactPulseValue--;
  }
}

struct glcolor SLAmbientParticle_color( SLAmbientParticle *self ) {
  int contactPulseValue = self->contactPulseValue;
  if ( contactPulseValue > 15 ) {
    return (struct glcolor) {
      192 * (( 20 - contactPulseValue ) / 5.0 ),
      255 * (( 20 - contactPulseValue ) / 5.0 ),
      255 * (( 20 - contactPulseValue ) / 5.0 ),
      255 * (( 20 - contactPulseValue ) / 5.0 )
    };
  } else if ( contactPulseValue > 0 ) {
    return (struct glcolor) {
      192 * ( contactPulseValue / 15.0 ),
      255 * ( contactPulseValue / 15.0 ),
      255 * ( contactPulseValue / 15.0 ),
      255 * ( contactPulseValue / 15.0 )
    };
  } else {
    return (struct glcolor) { 0, 0, 0, 0 };
  }
}

AQTYPE_INIT_DONE( SLAmbientParticle );
