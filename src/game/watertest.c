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
#endif

#include "./watertest.h"

#include "src/obj/index.h"
#include "src/pphys/index.h"

// #include "../app/all.h"

static const char * shader_fragment_text = "void main() {gl_FragColor = vec4(1, 1, 1, 0.5);}";

static const char * shader_vertex_text = "uniform mat4 modelview_projection;\nattribute vec2 a_position;\nvoid main() {\n  gl_Position = modelview_projection * vec4(a_position, 0, 1);\n}\n";

static GLuint shader_program;
static GLuint buffer;
static GLint positionAttribute;
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

#define kFrameFraction 1.0 / 60
static const int particle_count = 16384;
static AQWorld *world;
static aqvec2 gravity;

void initWaterTest() {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
  world = aqinit( aqalloc( &AQWorldType ));
  AQWorld_setAabb( world, (aqaabb) { 1280, 640, 0, 0 });
  gravity = (aqvec2) { 0, -9.8 };
  // aq_input_setscreentoworld((aqbox){ 640, 640, 0, 0 });

  for ( int i = 0; i < particle_count; ++i ) {
    AQParticle *particle = aqcreate( &AQParticleType );
    particle->position = (aqvec2) {
      rand() % (int) world->aabb.right,
      rand() % (int) world->aabb.top
    };
    particle->lastPosition = particle->position;
    particle->radius = 3 + (float) rand() / RAND_MAX * 1;
    particle->mass = M_PI * particle->radius * particle->radius;
    AQWorld_addParticle( world, particle );
  }

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

  GLint modelview_projection = glGetUniformLocation(shader_program, "modelview_projection");
  matrixtAttribute = modelview_projection;
  GLfloat identity[] = {
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  };
  glUniformMatrix4fv(modelview_projection, 1, GL_TRUE, identity);
    
  printf("%ld %d %d %d\n", sizeof(AQParticle), shader_program, positionAttribute, modelview_projection);

  glGenBuffers(1, &buffer);

  aqfree( pool );
}
static void set_particle_vertices( AQParticle *particle, void *ctx ) {
    struct {
        int index;
        GLfloat vertices[2 * 6 * 10];
    } *data = ctx;
    
    aqaabb particlebox = AQParticle_aabb( particle );
    data->vertices[data->index * 2 * 6 + 0] = particlebox.left;
    data->vertices[data->index * 2 * 6 + 1] = particlebox.top;
    
    data->vertices[data->index * 2 * 6 + 2] = particlebox.right;
    data->vertices[data->index * 2 * 6 + 3] = particlebox.top;
    
    data->vertices[data->index * 2 * 6 + 4] = particlebox.right;
    data->vertices[data->index * 2 * 6 + 5] = particlebox.bottom;
    
    data->vertices[data->index * 2 * 6 + 6] = particlebox.left;
    data->vertices[data->index * 2 * 6 + 7] = particlebox.top;
    
    data->vertices[data->index * 2 * 6 + 8] = particlebox.left;
    data->vertices[data->index * 2 * 6 + 9] = particlebox.bottom;
    
    data->vertices[data->index * 2 * 6 + 10] = particlebox.right;
    data->vertices[data->index * 2 * 6 + 11] = particlebox.bottom;
    
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

static float hertztime = 0;
static float fpstime = 0;
static int frames = 0;
void stepWaterTest(float dt) {
    AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
    hertztime += dt;
    if (hertztime > kFrameFraction) {
        frames++;
        AQList_iterate(
          world->particles,
          (AQList_iterator) gravityIterator,
          NULL );
        AQWorld_step( world, kFrameFraction );
        while (hertztime > kFrameFraction) {
          hertztime -= kFrameFraction;
        }
    }

    fpstime += dt;
    if (fpstime > 1) {
        printf("%d frames in %fs\n", frames, fpstime);
        fpstime = 0;
        frames = 0;
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
    
    float right = world->aabb.right,
    left = 0,
    top = world->aabb.top,
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
    
    struct {
        int index;
        GLfloat vertices[2 * 6 * particle_count];
    } data;
    data.index = 0;
    AQList_iterate( world->particles, (AQList_iterator) set_particle_vertices, &data );
    
    glBindBuffer(GL_ARRAY_BUFFER, buffer);
    glBufferData(GL_ARRAY_BUFFER, sizeof(GLfloat) * 2 * 6 * particle_count, data.vertices, GL_DYNAMIC_DRAW);
    
    glVertexAttribPointer(positionAttribute, 2, GL_FLOAT, GL_FALSE, 0, 0);
//    glDrawArrays(GL_TRIANGLES, 0, 6);    
    glDrawArrays(GL_TRIANGLES, 0, 6 * particle_count);
}
