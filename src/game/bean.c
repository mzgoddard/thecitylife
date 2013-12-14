#include <assert.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#include "./spaceleaper.h"

#ifdef EMSCRIPTEN
#include <SDL/SDL.h>
#else
#include <SDL/SDL_keysym.h>
#endif

#include "src/game/opengl.h"
#include "src/obj/index.h"
#include "src/pphys/index.h"
#include "src/input/index.h"
#include "src/audio/audio.h"

#include "src/audio/audio_dummy.h"
#ifdef AUDIO_OPENAL
#include "src/audio/audio_openal.h"
#endif
#ifdef AUDIO_WEBAUDIO
#include "src/audio/audio_webaudio.h"
#endif

#include "src/game/flowline.h"
#include "src/game/camera.h"
#include "src/game/renderer.h"
#include "src/game/shaders.h"
#include "src/game/loop.h"
#include "src/game/cameracontrollerbean.h"
#include "src/game/actor.h"

#define kFrameFraction 1.0 / 20
#ifndef kParticleCount
#define kParticleCount 2048
#endif
#ifndef kParticleBaseSize
#define kParticleBaseSize 3
#endif
#ifndef kParticleSizeRange
#define kParticleSizeRange 1
#endif 

static const int particle_count = kParticleCount;
static AQWorld *world;
// static AQFlowLine *flowLine;
static aqvec2 gravity;

static AQList *asteroids;
static AQActor *player;
static BBCameraController *cameraController;

GLuint buffer;

aqbool paused;

void (*endCallback)() = NULL;
void (*visitedCallback)( unsigned int ) = NULL;
void (*resourceCallback)( unsigned int ) = NULL;

void collision_noop( void *a, void *b, void *col ) {}

void initWaterTest() {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));

  AQLoop_boot();
  AQRenderer_boot();
  AQRenderer_setClearColor( 255, 255, 255 );

  #ifdef AUDIO_OPENAL
  AQAudioDriver_setContext( (AQObj*) AQOpenALDriver_create() );
  #else
  #ifdef AUDIO_WEBAUDIO
  AQAudioDriver_setContext( (AQObj*) AQWebAudioDriver_create() );
  #else
  AQAudioDriver_setContext( (AQObj*) AQDummyDriver_create() );
  #endif
  #endif

  AQAudioDriver_setMasterVolume( 1 );

  int space = 25600;

  #if EMSCRIPTEN
  space = 12800;
  #endif

  world = AQLoop_world();
  AQWorld_setAabb( world, (aqaabb) { space, space, 0, 0 });
  AQInput_setWorldFrame( space, space, 0, 0 );

  // Init game entities.
  player = aqinit( aqalloc( &AQActorType ));
  player->discipline = AQPlayerDiscipline;
  player->action = AQPlayerAction;
  player->size = 4;
  AQActor_updateData( player );
  AQLoop_addUpdater( player );
  AQRenderer_addView( player );

  cameraController = aqcreate( &BBCameraControllerType );
  BBCameraController_setPlayer( cameraController, player );
  AQLoop_addUpdater( cameraController );

  // Init input actions.
  AQInputAction *leftAction = AQInputAction_create( aqstr( "left" ));
  AQInputAction *rightAction = AQInputAction_create( aqstr( "right" ));
  AQInputAction *upAction = AQInputAction_create( aqstr( "up" ));
  AQInputAction *downAction = AQInputAction_create( aqstr( "down" ));
  AQInputAction *stealAction = AQInputAction_create( aqstr( "steal" ));
  AQInputAction *zoomAction = AQInputAction_create( aqstr( "zoom" ));

  AQInput_setActionToKeys( leftAction, SDLK_a, SDLK_j, SDLK_LEFT, 0 );
  AQInput_setActionToKeys( rightAction, SDLK_d, SDLK_l, SDLK_RIGHT, 0 );
  AQInput_setActionToKeys( upAction, SDLK_w, SDLK_i, SDLK_UP, 0 );
  AQInput_setActionToKeys( downAction, SDLK_s, SDLK_k, SDLK_DOWN, 0 );
  AQInput_setActionToKeys( stealAction, SDLK_q, SDLK_e, SDLK_u, SDLK_o, 0 );
  AQInput_setActionToKeys( zoomAction, SDLK_z, SDLK_PERIOD, 0 );

  glGenBuffers(1, &buffer);

  aqfree( pool );
}

// struct glcolor {
//   GLubyte r,g,b,a;
// };

struct glvertex {
  GLfloat vertex[2];
  struct glcolor color;
};

struct glparticle {
  struct glvertex vertices[6];
};

struct gldata {
  int index;
  struct glparticle particles[kParticleCount+1024];
};

static void set_particle_vertices( AQParticle *particle, void *ctx ) {
    struct gldata *data = ctx;
    struct glcolor color = { 255, 255, 255, 128 };

    if ( particle->isStatic ) {
      color = (struct glcolor) { 0, 0, 255, 128 };
    }
    // if ( AQParticle_isHomeAsteroid( particle )) {
    //   color = (struct glcolor) { 0, 255, 0, 128 };
    // }
    if ( particle->userdata ) {
      return;
    }

    aqaabb particlebox = AQParticle_aabb( particle );
    data->particles[data->index].vertices[0].vertex[0] = particlebox.left;
    data->particles[data->index].vertices[0].vertex[1] = particlebox.top;
    data->particles[data->index].vertices[0].color = color;

    data->particles[data->index].vertices[1].vertex[0] = particlebox.right;
    data->particles[data->index].vertices[1].vertex[1] = particlebox.top;
    data->particles[data->index].vertices[1].color = color;

    data->particles[data->index].vertices[2].vertex[0] = particlebox.right;
    data->particles[data->index].vertices[2].vertex[1] = particlebox.bottom;
    data->particles[data->index].vertices[2].color = color;

    data->particles[data->index].vertices[3].vertex[0] = particlebox.left;
    data->particles[data->index].vertices[3].vertex[1] = particlebox.top;
    data->particles[data->index].vertices[3].color = color;

    data->particles[data->index].vertices[4].vertex[0] = particlebox.left;
    data->particles[data->index].vertices[4].vertex[1] = particlebox.bottom;
    data->particles[data->index].vertices[4].color = color;

    data->particles[data->index].vertices[5].vertex[0] = particlebox.right;
    data->particles[data->index].vertices[5].vertex[1] = particlebox.bottom;
    data->particles[data->index].vertices[5].color = color;
    data->index++;
}

void setWaterTestGravity(float _gravity[3]) {
    gravity.x = _gravity[1] * 32;
    gravity.y = -_gravity[0] * 32;
}

void gravityIterator( AQParticle *particle, void *ctx ) {
  particle->acceleration = aqvec2_add( particle->acceleration, gravity );
}

unsigned int (*getTicks)() = NULL;
void setGetTicksFunction( unsigned int (*_getTicks)() ) {
  getTicks = _getTicks;
}

#define INT_MAX 0x7fffffff

unsigned int minTime( unsigned int frameTimes[], unsigned int length ) {
  unsigned int min = INT_MAX;
  int i = 0;
  for ( ; i < length; ++i ) {
    int frame = frameTimes[ i ];
    if ( frame < min ) {
      min = frame;
    }
  }
  return min;
}

unsigned int maxTime( unsigned int frameTimes[], unsigned int length ) {
  unsigned int max = 0;
  int i = 0;
  for ( ; i < length; ++i ) {
    int frame = frameTimes[ i ];
    if ( frame > max ) {
      max = frame;
    }
  }
  return max;
}

unsigned int avgTime( unsigned int frameTimes[], unsigned int length ) {
  unsigned int sum = 0;
  int i = 0;
  for ( ; i < length; ++i ) {
    sum += frameTimes[ i ];
  }
  return sum / length;
}

float stddevTime( unsigned int frameTimes[], unsigned int length ) {
  unsigned int avg = avgTime( frameTimes, length );
  unsigned int diffSum = 0;
  int i = 0;
  for ( ; i < length; ++i ) {
    int diff = frameTimes[ i ] - avg;
    diffSum += diff * diff;
  }
  return sqrt( diffSum / (float) length );
}

void stepInputWaterTest() {
  if ( paused ) return;

  float screenWidth, screenHeight;
  AQInput_getScreenSize( &screenWidth, &screenHeight );

  float fingerRadius = 30;

  aqvec2 movementDir = { 0, 0 };
  float movementAngle = 0;
  float movementPower = 0;

  AQInputAction *action = AQInput_findAction( aqstr( "left" ));
  if ( action->active ) {
    movementDir.x += -1;
    movementPower = 1;
    // float radians = AQRenderer_camera()->radians;
    // SLLeaper_applyDirection( leaper, radians );
  }

  action = AQInput_findAction( aqstr( "right" ));
  if ( action->active ) {
    movementDir.x += 1;
    movementPower = 1;
    // float radians = AQRenderer_camera()->radians + M_PI;
    // SLLeaper_applyDirection( leaper, radians );
  }

  action = AQInput_findAction( aqstr( "up" ));
  if ( action->active ) {
    movementDir.y += 1;
    movementPower = 1;
  }

  action = AQInput_findAction( aqstr( "down" ));
  if ( action->active ) {
    movementDir.y += -1;
    movementPower = 1;
  }

  player->actionData.playerData.movementAngle =
    atan2( movementDir.y, movementDir.x );
  player->actionData.playerData.movementPower = movementPower;

  action = AQInput_findAction( aqstr( "steal" ));
  if ( action->active ) {
    // float radians = AQRenderer_camera()->radians - M_PI / 2;
    // SLLeaper_applyDirection( leaper, radians );
  }

  action = AQInput_findAction( aqstr( "zoom" ));
  if ( action->active ) {
    BBCameraController_inputPress( cameraController );
  }

  AQArray *touches = AQInput_getTouches();
  AQTouch *touch = (AQTouch *) AQArray_atIndex( touches, 0 );
  if ( touch ) {
    aqvec2 centerDiff = (aqvec2) { touch->x - screenWidth / 2, touch->y - screenHeight / 2 };

    // printf( "touch: %s %f %f\n",
    //   touch->state == AQTouchBegan ?
    //     "began" :
    //     touch->state == AQTouchEnded ?
    //       "ended" :
    //       "moved",
    //   touch->wx,
    //   touch->wy );
    switch ( touch->state ) {
      case AQTouchBegan:
        // AQFlowLine_addPoint( flowLine, (aqvec2) { touch->wx, touch->wy });

        // if ( leaper && touch->finger == 1 && aqvec2_mag( centerDiff ) > fingerRadius ) {
        //   aqvec2 dir = aqvec2_normalized( (aqvec2) { touch->x - screenWidth / 2, touch->y - screenHeight / 2 });
        //   AQDOUBLE radians =
        //     atan2( -dir.y, -dir.x ) + AQRenderer_camera()->radians;
        //   // printf( "%f %s\n", radians, aqvec2_cstr( dir ) );
        // 
        //   // SLLeaper_applyDirection( leaper, radians );
        // }
      case AQTouchMoved:
      case AQTouchStationary:
        if ( cameraController ) {
          if ( touch->finger == 3 || aqvec2_mag( centerDiff ) < fingerRadius ) {
            // SLCameraController_inputPress( cameraController );
          }
        }

        // if ( leaper && touch->finger == 1 && aqvec2_mag( centerDiff ) > fingerRadius ) {
        //   aqvec2 dir = aqvec2_normalized( (aqvec2) { touch->x - screenWidth / 2, touch->y - screenHeight / 2 });
        //   AQDOUBLE radians =
        //     atan2( -dir.y, -dir.x ) + AQRenderer_camera()->radians;
        //   // printf( "%f %s\n", radians, aqvec2_cstr( dir ) );
        // 
        //   // SLLeaper_applyDirection( leaper, radians );
        // }
        // AQFlowLine_addPoint( flowLine, (aqvec2) { touch->wx, touch->wy });
        break;
      case AQTouchEnded:
        // AQFlowLine_addPoint( flowLine, (aqvec2) { touch->wx, touch->wy });
        // AQFlowLine_createParticles( flowLine, world );
        // AQFlowLine_clearPoints( flowLine );
        // printf( "particles: %d %d\n",
        //   AQList_length( flowLine->particles ),
        //   AQList_length( world->particles ));
        break;
      default:
        break;
    }
  }
}

static float hertztime = 0;
static float fpstime = 0;
static int frames = 0;
static const unsigned int kMaxFrameTimes = 100;
static unsigned int frameTimes[ kMaxFrameTimes ];
static int frameTimeIndex = 0;
void stepWaterTest(float dt) {
    if ( paused ) { return; }

    AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
    hertztime += dt;

    int startTime = 0;
    int endTime = 0;

    if (hertztime > kFrameFraction) {
        if ( getTicks ) {
          startTime = getTicks();
        }
        frames++;

        // if ( leaper && leaper->onvisit != visitedCallback ) {
        //   leaper->onvisit = visitedCallback;
        //   visitedCallback( leaper->visited );
        // }
        // if ( leaper && leaper->onresource != resourceCallback ) {
        //   leaper->onresource = resourceCallback;
        //   resourceCallback( leaper->totalResource );
        // }

        AQLoop_step( kFrameFraction );

        // if ( leaper && leaper->state == LostLeaperState && endCallback ) {
        //   endCallback();
        // }

        while (hertztime > kFrameFraction) {
          hertztime -= kFrameFraction;
        }
        if ( getTicks ) {
          endTime = getTicks();
        }
    }

    fpstime += dt;
    if (fpstime > 1) {
        fpstime = 0;
        frames = 0;
    }

    if ( getTicks && startTime != 0 ) {
      frameTimes[ frameTimeIndex++ ] = endTime - startTime;
      if ( frameTimeIndex >= kMaxFrameTimes ) {
        #if PPHYS_ALLOW_SLEEP
        printf( "awake %d ", world->awakeParticles );
        #endif
        printf(
          "min %d, max %d, avg %d, stddev %f\n",
          minTime( frameTimes, kMaxFrameTimes ),
          maxTime( frameTimes, kMaxFrameTimes ),
          avgTime( frameTimes, kMaxFrameTimes ),
          stddevTime( frameTimes, kMaxFrameTimes )
        );
        frameTimeIndex = 0;
      }
    }

    aqfree( pool );
}

void drawWaterTest() {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));

  //
  // Run renderer
  //

  AQRenderer_draw();

  //
  // Debug draw particles
  //

  AQShaders_useProgram( ColorShaderProgram );

  // struct gldata data;
  // data.index = 0;
  // AQList_iterate(
  //   world->particles,
  //   (AQList_iterator) set_particle_vertices,
  //   &data
  // );
  // 
  // AQShaders_draw(
  //   buffer,
  //   data.particles,
  //   sizeof(struct glparticle) * (data.index)
  // );

  aqfree( pool );
}

void pauseSpaceLeaper() {
  paused = 1;
}

void resumeSpaceLeaper() {
  paused = 0;
}

void setSpaceLeaperEndCallback( void (*callback)() ) {
  endCallback = callback;
}

void setSpaceLeaperVisitedCallback( void (*callback)( unsigned int ) ) {
  visitedCallback = callback;
}

void setSpaceLeaperResourceCallback( void (*callback)( unsigned int ) ) {
  resourceCallback = callback;
}
