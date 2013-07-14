#include <stdio.h>
#include <string.h>

#include "src/game/shaders.h"

#if !EMSCRIPTEN
static const char * colorShaderFragmentText =
  "varying vec4 v_color;\nvoid main() {gl_FragColor = v_color;}";
#else
static const char * colorShaderFragmentText =
  "varying lowp vec4 v_color;\nvoid main() {gl_FragColor = v_color;}";
#endif

static const char * colorShaderVertexText =
  "uniform mat4 modelview_projection;\nattribute vec2 a_position;\nattribute vec4 a_color;\nvarying vec4 v_color;\nvoid main() {\n  v_color = a_color;\n  gl_Position = modelview_projection * vec4(a_position, 0, 1);\n}\n";

struct Shader {
  GLuint program;
  void (*draw)( GLuint buffer, void *data, int bytes );
};

struct ColorShader {
  GLuint program;
  void (*draw)( GLuint buffer, void *data, int bytes );

  GLint position;
  GLint color;
  GLint matrix;

  int dirtyMatrix;
} colorShader;

void ColorShader_draw( GLuint buffer, void *data, int bytes );

static AQShaderProgram activeShaderEnum;
static struct Shader * activeShader;
static GLfloat matrix[16];

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

static GLuint compileProgram( const char *fragmentText, const char *vertexText ) {
  GLuint program = glCreateProgram();
  GLuint fragment = glCreateShader(GL_FRAGMENT_SHADER);
  compileShader(fragment, fragmentText);
  glAttachShader(program, fragment);

  GLuint vertex = glCreateShader(GL_VERTEX_SHADER);
  compileShader(vertex, vertexText);
  glAttachShader(program, vertex);

  glLinkProgram(program);
  GLint programStatus;
  glGetProgramiv(program, GL_LINK_STATUS, &programStatus);
  if (programStatus == GL_FALSE) {
    printf("program failed compilation\n");
  }

  return program;
}

void AQShaders_boot() {
  colorShader.program = compileProgram(
    colorShaderFragmentText,
    colorShaderVertexText
  );
  colorShader.draw = &ColorShader_draw;

  glUseProgram(colorShader.program);
  colorShader.position =
    glGetAttribLocation(colorShader.program, "a_position");
  glEnableVertexAttribArray(colorShader.position);
  colorShader.color =
    glGetAttribLocation(colorShader.program, "a_color");
  glEnableVertexAttribArray(colorShader.color);
  colorShader.matrix =
    glGetUniformLocation(colorShader.program, "modelview_projection");

  printf("%d %d %d\n",
    colorShader.program,
    colorShader.position,
    colorShader.matrix
  );
}

void AQShaders_useProgram( AQShaderProgram shaderEnum ) {
  if ( activeShaderEnum != shaderEnum ) {
    activeShaderEnum = shaderEnum;
    if ( shaderEnum == ColorShaderProgram ) {
      activeShader = (struct Shader *) &colorShader;
      glUseProgram( colorShader.program );
    }
  }
}

void AQShaders_setMatrix( GLfloat _matrix[] ) {
  // mark all shader's matrix as dirty
  colorShader.dirtyMatrix = 1;

  memcpy( matrix, _matrix, sizeof(GLfloat) * 16 );
}

void AQShaders_draw( GLuint buffer, void *data, int bytes ) {
  activeShader->draw( buffer, data, bytes );
}

void ColorShader_draw( GLuint buffer, void *data, int bytes ) {
  if ( colorShader.dirtyMatrix ) {
    glUniformMatrix4fv( colorShader.matrix, 1, GL_FALSE, matrix );
    colorShader.dirtyMatrix = 0;
  }

  glBindBuffer(GL_ARRAY_BUFFER, buffer);
  glBufferData(
    GL_ARRAY_BUFFER,
    bytes,
    data,
    GL_DYNAMIC_DRAW
  );

  glVertexAttribPointer( colorShader.position,
    2, GL_FLOAT, GL_FALSE, sizeof(struct colorvertex), (GLvoid *) 0 );
  glVertexAttribPointer( colorShader.color,
    4, GL_UNSIGNED_BYTE, GL_TRUE, sizeof(struct colorvertex), (GLvoid *) 8 );

  glDrawArrays(GL_TRIANGLES, 0, bytes / sizeof(struct colorvertex) );
}
