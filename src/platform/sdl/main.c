#if !EMSCRIPTEN
#define USE_GLEW 0
#endif

#if USE_GLEW
#include "GL/glew.h"
#endif

#include "SDL/SDL.h"
#include "SDL/SDL_image.h"
#if !USE_GLEW
#include "SDL/SDL_opengl.h"
#endif

#if EMSCRIPTEN
#include <emscripten.h>
#endif

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>

#include "src/input/index.h"
#include "src/game/watertest.h"

void main_loop();
static void process_events();

int main(int argc, char *argv[])
{
  SDL_Surface *screen;

  // Slightly different SDL initialization
  if ( SDL_Init(SDL_INIT_VIDEO) != 0 ) {
    printf("Unable to initialize SDL: %s\n", SDL_GetError());
    return 1;
  }

  SDL_GL_SetAttribute( SDL_GL_DOUBLEBUFFER, 1 ); // *new*

  screen = SDL_SetVideoMode( 640, 480, 16, SDL_OPENGL ); // *changed*
  if ( !screen ) {
    printf("Unable to set video mode: %s\n", SDL_GetError());
    return 1;
  }

  // Set the OpenGL state after creating the context with SDL_SetVideoMode

  glClearColor( 0, 0, 0, 0 );

#if !EMSCRIPTEN
  glEnable( GL_TEXTURE_2D ); // Need this to display a texture XXX unnecessary in OpenGL ES 2.0/WebGL
#endif

  glViewport( 0, -80, 640, 640 );
  AQInput_setScreenSize( 640, 480 );
#if EMSCRIPTEN
  emscripten_set_main_loop(main_loop, 0, 0);
#endif

  initWaterTest();

  setGetTicksFunction( SDL_GetTicks );
#if !EMSCRIPTEN
  while ( 1 ) {
    main_loop();
    SDL_Delay( 1 );
  }
#endif

  return 0;
}

int lastTicks = 0;
void main_loop() {
  process_events();
  int newTicks = SDL_GetTicks();
  stepWaterTest(( newTicks - lastTicks ) / 1000.0 );
  drawWaterTest();
#if !EMSCRIPTEN
  SDL_GL_SwapBuffers();
#endif
  lastTicks = newTicks;
}

AQTouch *mouseTouch;

static void process_events( void )
{
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));

  /* Our SDL event placeholder. */
  SDL_Event event;

  if ( mouseTouch && ( mouseTouch->state & AQTouchTouching ) == 0 ) {
    AQArray *touches = AQInput_getTouches();
    AQArray_remove( touches, (AQObj *) mouseTouch );
    aqrelease( mouseTouch );
    mouseTouch = NULL;
    printf( "touches: %d\n", AQArray_length( touches ));
  } else if (
    mouseTouch &&
      ( mouseTouch->state & ( AQTouchBegan | AQTouchMoved ))
  ) {
    mouseTouch->state = AQTouchStationary;
  }

  float screenWidth; float screenHeight;
  AQInput_getScreenSize( &screenWidth, &screenHeight );

  /* Grab all the events off the queue. */
  while( SDL_PollEvent( &event ) ) {
    switch( event.type ) {
      // case SDL_KEYDOWN:
      //     /* Handle key presses. */
      //     handle_key_down( &event.key.keysym );
      //     break;

      case SDL_MOUSEMOTION:
        if ( mouseTouch ) {
          mouseTouch->state = AQTouchMoved;
          mouseTouch->dx = event.button.x - mouseTouch->x;
          mouseTouch->dy = screenHeight - event.button.y - mouseTouch->y;
          mouseTouch->x = event.button.x;
          mouseTouch->y = screenHeight - event.button.y;
          AQInput_screenToWorld(
            mouseTouch->x, mouseTouch->y, &mouseTouch->wx, &mouseTouch->wy
          );
          printf(
            "moved: %f %f %f %f\n",
            mouseTouch->x, mouseTouch->y, mouseTouch->wx, mouseTouch->wy
          );
        }
        break;

      case SDL_MOUSEBUTTONDOWN:
        if ( mouseTouch ) {
          mouseTouch->state = AQTouchCanceled;
          AQArray_remove( AQInput_getTouches(), (AQObj *) mouseTouch );
          aqrelease( mouseTouch );
        }

        mouseTouch = aqretain( aqcreate( &AQTouchType ));
        mouseTouch->state = AQTouchBegan;
        mouseTouch->x = event.button.x;
        mouseTouch->y = screenHeight - event.button.y;
        mouseTouch->dx = 0;
        mouseTouch->dy = 0;
        AQInput_screenToWorld(
          mouseTouch->x, mouseTouch->y, &mouseTouch->wx, &mouseTouch->wy
        );
        AQArray_push( AQInput_getTouches(), (AQObj *) mouseTouch );
        printf(
          "touch: %f %f %f %f\n",
          mouseTouch->x, mouseTouch->y, mouseTouch->wx, mouseTouch->wy
        );
        break;

      case SDL_MOUSEBUTTONUP:
        if ( mouseTouch ) {
          mouseTouch->state = AQTouchEnded;
        }
        break;

      case SDL_QUIT:
        /* Handle quit requests (like Ctrl-c). */
        SDL_Quit();
        exit( 0 );
        break;

      default:
        break;
    }
  }

  aqfree( pool );
}

