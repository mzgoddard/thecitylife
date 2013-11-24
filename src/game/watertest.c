#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#ifdef __APPLE__
    #include "TargetConditionals.h"
    #if TARGET_OS_IPHONE
        #include <OpenGLES/ES2/gl.h>
    #else // Mac
        #include <OpenGL/gl.h>
    #endif
#else
    #if EMSCRIPTEN
        #include <GLES2/gl2.h>
        #include <EGL/egl.h>
    #else
        #include <GL/gl.h>
    #endif
#endif

#include "appdefines.h"
#include "./watertest.h"

#include "src/obj/index.h"
#include "src/pphys/index.h"
#include "src/input/index.h"
#include "src/game/flowline.h"

// #include "../app/all.h"

#if !EMSCRIPTEN
static const char * shader_fragment_text = "varying vec4 v_color;\nvoid main() {gl_FragColor = v_color;}";
#else
static const char * shader_fragment_text = "varying lowp vec4 v_color;\nvoid main() {gl_FragColor = v_color;}";
#endif

static const char * shader_vertex_text = "uniform mat4 modelview_projection;\nattribute vec2 a_position;\nattribute vec4 a_color;\nvarying vec4 v_color;\nvoid main() {\n  v_color = a_color;\n  gl_Position = modelview_projection * vec4(a_position, 0, 1);\n}\n";

static GLuint shader_program;
static GLuint buffer;
static GLint positionAttribute;
static GLint colorAttribute;
static GLint matrixtAttribute;
static GLuint compileShader(GLuint shader, const char *source) {
  GLint length = (GLint) strlen(source);
  const GLchar *text[] = {source};
  glShaderSource(shader, 1, text, &length);
  glCompileShader(shader);

  GLint compileStatus;
  glGetShaderiv(shader, GL_COMPILE_STATUS, &compileStatus);

  if (compileStatus == GL_FALSE) {
    GLint infologlength;
    glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &infologlength);
    char info_log[infologlength+1];
    glGetShaderInfoLog(shader, infologlength, NULL, info_log);
    printf("shader: failed compilation\n");
    printf("shader(info): %s\n", info_log);
  }
  return shader;
}

#define kFrameFraction ( 1.0 / 60 )
#define kFrameStep ( 1.0 / 20 )
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
static AQFlowLine *flowLine;
static aqvec2 gravity;

void initWaterTest() {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
  world = aqinit( aqalloc( &AQWorldType ));
  aqvec2 viewportSize = (aqvec2) { VIEWPORT_WIDTH_HEIGHT };
  AQWorld_setAabb( world, (aqaabb) { viewportSize.y, viewportSize.x, 0, 0 });
  gravity = (aqvec2) { 0, -0.01 / kFrameStep / kFrameStep };
  printf( "gravity %f %f\n", gravity.x, gravity.y );
  AQInput_setWorldFrame( viewportSize.y, viewportSize.x, 0, 0 );
  // aq_input_setscreentoworld((aqbox){ 640, 640, 0, 0 });

  for ( int i = 0; i < particle_count; ++i ) {
    AQParticle *particle = aqcreate( &AQParticleType );
    // particle->correction = 0.5 + (float) rand() / RAND_MAX / 2.5;
    particle->position = (aqvec2) {
      rand() % (int) world->aabb.right,
      rand() % (int) world->aabb.top / 3 * 2
    };
    particle->lastPosition = particle->position;
    particle->radius = kParticleBaseSize + (float) rand() / RAND_MAX * kParticleSizeRange;
    particle->mass = M_PI * particle->radius * particle->radius;
    if ( rand() > RAND_MAX * 0.99 ) {
      // particle->radius += 10;
      particle->mass *= 1000;
    }
    AQWorld_addParticle( world, particle );
  }

  flowLine = aqinit( aqalloc( &AQFlowLineType ));
  flowLine->radius = 20;
  flowLine->minPointDistance = 10;
  flowLine->force = 2.5 / kFrameStep / kFrameStep;
  AQFlowLine_addPoint( flowLine, (aqvec2) { 320, 80 });
  AQFlowLine_addPoint( flowLine, (aqvec2) { 320, 100 });
  AQFlowLine_addPoint( flowLine, (aqvec2) { 320, 120 });
  AQFlowLine_createParticles( flowLine, world );
  AQFlowLine_clearPoints( flowLine );
  printf( "%p %p\n", flowLine->particles, AQList_at( flowLine->particles, 0 ));

  glClearColor(0, 0, 0, 0);
  glEnable(GL_BLEND);
  glBlendFunc(GL_SRC_ALPHA, GL_DST_ALPHA);

  shader_program = glCreateProgram();
  GLuint fragment = glCreateShader(GL_FRAGMENT_SHADER);
  compileShader(fragment, shader_fragment_text);
  glAttachShader(shader_program, fragment);

  GLuint vertex = glCreateShader(GL_VERTEX_SHADER);
  compileShader(vertex, shader_vertex_text);
  glAttachShader(shader_program, vertex);

  glLinkProgram(shader_program);
  GLint programStatus;
  glGetProgramiv(shader_program, GL_LINK_STATUS, &programStatus);
  if (programStatus == GL_FALSE) {
    printf("program failed compilation\n");
  }

  glUseProgram(shader_program);
  positionAttribute = glGetAttribLocation(shader_program, "a_position");
  glEnableVertexAttribArray(positionAttribute);
  colorAttribute = glGetAttribLocation(shader_program, "a_color");
  glEnableVertexAttribArray(colorAttribute);

  GLint modelview_projection = glGetUniformLocation(shader_program, "modelview_projection");
  matrixtAttribute = modelview_projection;
  GLfloat identity[] = {
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  };
  glUniformMatrix4fv(modelview_projection, 1, GL_TRUE, identity);

  printf("%d %d %d %d\n", (int) sizeof(AQParticle), shader_program, positionAttribute, modelview_projection);

  glGenBuffers(1, &buffer);

  aqfree( pool );
}

struct glcolor {
  GLubyte r,g,b,a;
};

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

static struct applicationEvents {
  void (*stepStart)();
  void (*stepEnd)();
} applicationEvents = {
  NULL,
  NULL
};

typedef void (*EventHandle)();
void setEventListener( int index, void (*handle)() ) {
  ((EventHandle *) &applicationEvents )[ index ] = handle;
}

void stepInputWaterTest() {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));

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
        AQFlowLine_addPoint( flowLine, (aqvec2) { touch->wx, touch->wy });
        break;
      case AQTouchMoved:
      case AQTouchStationary:
        AQFlowLine_addPoint( flowLine, (aqvec2) { touch->wx, touch->wy });
        break;
      case AQTouchEnded:
        AQFlowLine_addPoint( flowLine, (aqvec2) { touch->wx, touch->wy });
        AQFlowLine_createParticles( flowLine, world );
        AQFlowLine_clearPoints( flowLine );
        printf( "particles: %d %d\n",
          AQList_length( flowLine->particles ),
          AQList_length( world->particles ));
        break;
      default:
        break;
    }
  }

  aqfree( pool );
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

    if (hertztime > kFrameFraction) {
        if ( getTicks ) {
          startTime = getTicks();
        }
        if ( applicationEvents.stepStart ) {
          applicationEvents.stepStart();
        }

        frames++;
        AQList_iterate(
          world->particles,
          (AQList_iterator) gravityIterator,
          NULL );
        AQWorld_step( world, kFrameStep );
        while (hertztime > kFrameFraction) {
          hertztime -= kFrameFraction;
        }

        if ( applicationEvents.stepEnd ) {
          applicationEvents.stepEnd();
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
    glClearColor(0,0,0,0);
    glClear(GL_COLOR_BUFFER_BIT);

    glUseProgram(shader_program);

    // GLfloat vertices[2 * 4] = {
    //   160, 120,
    //   -160, 120,
    //   160, -120,
    //   -160, -120
    // };

    aqvec2 size = (aqvec2) { VIEWPORT_WIDTH_HEIGHT };
    // float right = world->aabb.right,
    float right = size.x,
    left = 0,
    // top = world->aabb.top,
    top = size.y,
    bottom = 0,
    zFar = 1000,
    zNear = 0;
    float tx=-(right+left)/(right-left);
    float ty=-(top+bottom)/(top-bottom);
    float tz=-(zFar+zNear)/(zFar-zNear);

    GLfloat matrix[] = {
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    };
    matrix[0]=2/(right-left);
    matrix[5]=2/(top-bottom);
    matrix[10]=-2/(zFar-zNear);	
    matrix[12]=tx;
    matrix[13]=ty;
    matrix[14]=tz;

    glUniformMatrix4fv(matrixtAttribute, 1, GL_FALSE, matrix);

    struct gldata data;
    data.index = 0;
    AQList_iterate(
      world->particles,
      (AQList_iterator) set_particle_vertices,
      &data );

    glBindBuffer(GL_ARRAY_BUFFER, buffer);
    glBufferData(
      GL_ARRAY_BUFFER,
      sizeof(struct glparticle) * (particle_count + 1024), data.particles,
      GL_DYNAMIC_DRAW);

    glVertexAttribPointer(positionAttribute, 2, GL_FLOAT, GL_FALSE, sizeof(struct glvertex), (GLvoid *) 0);
    glVertexAttribPointer(colorAttribute, 4, GL_UNSIGNED_BYTE, GL_TRUE, sizeof(struct glvertex), (GLvoid *) 8);

    glDrawArrays(GL_TRIANGLES, 0, 6 * data.index );
}
