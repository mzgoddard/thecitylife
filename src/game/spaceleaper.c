#include <assert.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#include "./spaceleaper.h"

#include "src/game/opengl.h"
#include "src/obj/index.h"
#include "src/pphys/index.h"
#include "src/input/index.h"
#include "src/game/flowline.h"
#include "src/game/asteroid.h"
#include "src/game/camera.h"
#include "src/game/renderer.h"
#include "src/game/shaders.h"
#include "src/game/loop.h"
#include "src/game/leaper.h"
#include "src/game/cameracontroller.h"
#include "src/game/asteroidview.h"

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
static SLLeaper *leaper;
static SLCameraController *cameraController;

GLuint buffer;

void initWaterTest() {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));

  AQLoop_boot();
  AQRenderer_boot();

  world = AQLoop_world();
  AQWorld_setAabb( world, (aqaabb) { 6400, 6400, 0, 0 });
  // gravity = (aqvec2) { 0, -4 };
  AQInput_setWorldFrame( 6400, 6400, 0, 0 );

  asteroids = aqinit( aqalloc( &AQListType ));

  SLAsteroid *homeAsteroid = NULL;

  SLAsteroidGroupView *asteroidView = SLAsteroidGroupView_create();

  int n = 64;
  for ( int i = 0; i < n; ++i ) {
    for ( int j = 0; j < n; ++j ) {
      SLAsteroid *asteroid = SLAsteroid_create(
        world,
        aqvec2_make(
          rand() % (int) world->aabb.right / n / 2 + world->aabb.right / n * i + world->aabb.right / n / 4,
          rand() % (int) world->aabb.top / n / 2 + world->aabb.top / n * j + world->aabb.top / n / 4
        ),
        ((double) rand() ) / RAND_MAX * world->aabb.right / n / 8 + world->aabb.right / n / 8
      );
      AQList_push( asteroids, (AQObj *) asteroid );
      SLAsteroidGroupView_addAsteroid( asteroidView, asteroid );

      if (
        i < n / 8 * 5 && i > n / 8 * 3 &&
          j < n / 8 * 5 && j > n / 8 * 3
      ) {
        if ( !homeAsteroid ) {
          homeAsteroid = asteroid;
        } else if ( rand() < RAND_MAX / 100 ) {
          homeAsteroid = asteroid;
        }
      }
    }
  }

  assert( homeAsteroid );
  SLAsteroid_setIsHome( homeAsteroid, 1 );

  AQRenderer_addView( leaper = SLLeaper_create(
    aqvec2_add(
      homeAsteroid->center,
      aqvec2_make( 5, 5 )
    )
  ));
  AQRenderer_addView( asteroidView );

  AQLoop_addUpdater(
    cameraController =
      SLCameraController_setLeaper( SLCameraController_create(), leaper )
  );

  cameraController->minScale = 2;

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

    // if ( particle->isSleeping ) {
    //   color = (struct glcolor) { 0, 255, 0, 128 };
    // }
    // color.a *= fmax( fmin( aqvec2_mag2( aqvec2_sub( particle->position, particle->oldPosition )), 1.0 ), 0.2 );
    // if ( particle->mass > 100 ) {
    //   color = (struct glcolor) { 255, 0, 0, 128 };
    // }
    // if ( particle->mass < 10 ) {
    //   color = (struct glcolor) { 0, 0, 255, 128 };
    // }
    if ( particle->isStatic ) {
      color = (struct glcolor) { 0, 0, 255, 128 };
    }
    if ( AQParticle_isHomeAsteroid( particle )) {
      color = (struct glcolor) { 0, 255, 0, 128 };
    }
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
//    printf("%f %f %f\n", gravity[0], gravity[1], gravity[2]);
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

static float hertztime = 0;
static float fpstime = 0;
static int frames = 0;
static const unsigned int kMaxFrameTimes = 100;
static unsigned int frameTimes[ kMaxFrameTimes ];
static int frameTimeIndex = 0;
void stepWaterTest(float dt) {
    AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
    hertztime += dt;

    int startTime = 0;
    int endTime = 0;

    float screenWidth, screenHeight;
    AQInput_getScreenSize( &screenWidth, &screenHeight );

    AQArray *touches = AQInput_getTouches();
    AQTouch *touch = (AQTouch *) AQArray_atIndex( touches, 0 );
    if ( touch ) {
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
          if ( leaper && touch->finger == 1 ) {
            aqvec2 dir = aqvec2_normalized( (aqvec2) { touch->x - screenWidth / 2, touch->y - screenHeight / 2 });
            AQDOUBLE radians =
              atan2( -dir.y, -dir.x ) + AQRenderer_camera()->radians;
            printf( "%f %s\n", radians, aqvec2_cstr( dir ) );

            SLLeaper_applyDirection( leaper, radians );
          }
        case AQTouchMoved:
        case AQTouchStationary:
          if ( cameraController ) {
            if ( touch->finger == 3 ) {
              SLCameraController_inputPress( cameraController );
            }
          }
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

    if (hertztime > kFrameFraction) {
        if ( getTicks ) {
          startTime = getTicks();
        }
        frames++;

        AQLoop_step( kFrameFraction );

        while (hertztime > kFrameFraction) {
          hertztime -= kFrameFraction;
        }
        if ( getTicks ) {
          endTime = getTicks();
        }
    }

    fpstime += dt;
    if (fpstime > 1) {
        // printf("%d frames in %fs\n", frames, fpstime);
        fpstime = 0;
        frames = 0;
    }

    if ( getTicks && startTime != 0 ) {
      frameTimes[ frameTimeIndex++ ] = endTime - startTime;
      if ( frameTimeIndex >= kMaxFrameTimes ) {
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

  struct gldata data;
  data.index = 0;
  AQList_iterate(
    world->particles,
    (AQList_iterator) set_particle_vertices,
    &data
  );

  AQShaders_draw(
    buffer,
    data.particles,
    sizeof(struct glparticle) * (data.index)
  );

  aqfree( pool );
}
