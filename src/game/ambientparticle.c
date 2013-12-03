#include <stdlib.h>
#include <string.h>

#include "src/audio/audio.h"
#include "./ambientparticle.h"

void * SLAmbientParticle_init( void *_self ) {
  SLAmbientParticle *self = _self;
  memset( _self + sizeof(AQObj), 0, sizeof(SLAmbientParticle) - sizeof(AQObj) );
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
    AQSound_playAt(
      AQSound_load( aqstr( "star_pulse.wav" )),
      self->particle->position.x,
      self->particle->position.y
    );

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

void SLAmbientParticle_setParticle(
  SLAmbientParticle *self, AQParticle *particle
) {
  aqrelease( self->particle );
  self->particle = aqretain( particle );
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
