#ifndef SHADERS_H_PKGA5F9E
#define SHADERS_H_PKGA5F9E

#include "src/game/opengl.h"

typedef enum AQShaderProgram {
  ColorShaderProgram = 1
} AQShaderProgram;

struct glcolor {
  GLubyte r, g, b, a;
};

struct colorvertex {
  GLfloat x, y;
  struct glcolor color;
};

void AQShaders_boot();

void AQShaders_useProgram( AQShaderProgram );
void AQShaders_setMatrix( GLfloat[] );
void AQShaders_draw( GLuint buffer, void *data, int bytes );

#endif /* end of include guard: SHADERS_H_PKGA5F9E */
