//
//  AQOpenGLView.m
//  aquamancy
//
//  Created by Michael Goddard on 1/17/12.
//  Copyright (c) 2012 Gradient Studios LLC. All rights reserved.
//

#import <math.h>

#import "AQOpenGLView.h"
#import <OpenGL/OpenGL.h>
#import <OpenGL/gl.h>

#import "appdefines.h"
#import "watertest.h"
#import "input.h"

@implementation AQOpenGLView

- (void) awakeFromNib {
  animationTimer = [[NSTimer timerWithTimeInterval:1.0 / 20 target:self selector:@selector(draw:) userInfo:nil repeats:YES] retain];
  [[NSRunLoop currentRunLoop] addTimer:animationTimer forMode:NSDefaultRunLoopMode];
  [[NSRunLoop currentRunLoop] addTimer:animationTimer forMode:NSEventTrackingRunLoopMode];

  [super awakeFromNib];
}

- (void) dealloc {
  [animationTimer invalidate];
  [animationTimer release];
  
  [super dealloc];
}

- (BOOL) acceptsFirstResponder {
  return YES;
}

- (BOOL) becomeFirstResponder {
  NSLog( @"Become first resopnder." );
  return YES;
}

- (BOOL) resignFirstResponder {
  NSLog( @"Resign first responder." );
  return YES;
}

- (BOOL) acceptsFirstMouse:(NSEvent *)theEvent {
  return YES;
}

- (void) prepareOpenGL {
  int swapInt = 1;
  
  [[self openGLContext] setValues:&swapInt forParameter:NSOpenGLCPSwapInterval]; // set to vbl sync
  
  glClearColor(0, 0, 0, 0);
  VIEWPORT();
  NSLog(@"hi");

  AQInput_setScreenSize( self.frame.size.width, self.frame.size.height );

  initWaterTest();
}

- (void) draw:(NSTimer *)sender {
    [self drawRect:[self bounds]];
    
    NSDate *now = [NSDate date];
    
    NSTimeInterval dt = fabs([lastDate timeIntervalSinceNow]);

    stepWaterTest(dt);
    [self setNeedsDisplay:YES];

    AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
    if ( mouseTouch && ( mouseTouch->state & AQTouchTouching ) == 0 ) {
      AQArray *touches = AQInput_getTouches();
      AQArray_remove( touches, (AQObj *) mouseTouch );
      aqrelease( mouseTouch );
      mouseTouch = NULL;
    } else if (
      mouseTouch &&
        ( mouseTouch->state & ( AQTouchBegan | AQTouchMoved ))
    ) {
      mouseTouch->state = AQTouchStationary;
      inputEventDirty = YES;
      stepInputWaterTest();
    }

    if ( !inputEventDirty ) {
      stepInputWaterTest();
    } else {
      inputEventDirty = NO;
    }

    aqfree( pool );
    
    [lastDate release];
    lastDate = [now retain];
}

- (void) drawRect:(NSRect)dirtyRect {
  [[self openGLContext] makeCurrentContext];

  AQInput_setScreenSize( self.frame.size.width, self.frame.size.height );
  float width, height;
  AQInput_getScreenSize( &width, &height );
  float max = width > height ? width : height;
  glViewport(( width - max ) / 2, ( height - max ) / 2, max, max );
  
  drawWaterTest();
  
  glFlush();
}

AQTouch *mouseTouch = NULL;

- (void) viewDidEndLiveResize {
  AQInput_setScreenSize( self.frame.size.width, self.frame.size.height );
  float width = self.frame.size.width;
  float height = self.frame.size.height;
  float max = width > height ? width : height;
  glViewport(( width - max ) / 2, ( height - max ) / 2, max, max );
}

- (void) mouseDown:(NSEvent *)theEvent {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));

  mouseDown = mouseDown ? NO : YES;
  
  NSPoint pt = theEvent.locationInWindow;

  if ( mouseTouch ) {
    mouseTouch->state = AQTouchCanceled;
    AQArray_remove( AQInput_getTouches(), (AQObj *) mouseTouch );
    aqrelease( mouseTouch );
  }

  float screenWidth, screenHeight;
  AQInput_getScreenSize( &screenWidth, &screenHeight );

  mouseTouch = aqretain( aqcreate( &AQTouchType ));
  mouseTouch->state = AQTouchBegan;
  mouseTouch->finger = 1;
  mouseTouch->x = pt.x;
  mouseTouch->y = pt.y;
  mouseTouch->dx = 0;
  mouseTouch->dy = 0;
  AQInput_screenToWorld(
    mouseTouch->x, mouseTouch->y, &mouseTouch->wx, &mouseTouch->wy
  );
  AQArray_push( AQInput_getTouches(), (AQObj *) mouseTouch );

  inputEventDirty = YES;
  stepInputWaterTest();

  aqfree( pool );
}

// Handle the event to stop progagation.
- (void) mouseDragged:(NSEvent *)theEvent {
  NSPoint pt = theEvent.locationInWindow;

  if ( mouseTouch ) {
    mouseTouch->state = AQTouchMoved;
    mouseTouch->x = pt.x;
    mouseTouch->y = pt.y;
    mouseTouch->dx = theEvent.deltaX;
    mouseTouch->dy = theEvent.deltaY;
    AQInput_screenToWorld(
      mouseTouch->x, mouseTouch->y, &mouseTouch->wx, &mouseTouch->wy
    );
  }
  
  inputEventDirty = YES;
  stepInputWaterTest();
}

- (void) mouseUp:(NSEvent *)theEvent {
  if ( mouseTouch ) {
    mouseTouch->state = AQTouchEnded;
  }
  
  inputEventDirty = YES;
  stepInputWaterTest();
}

- (void) rightMouseDown:(NSEvent *)theEvent {
  [self mouseDown:theEvent];
}

- (void) rightMouseDragged:(NSEvent *)theEvent {
  [self mouseDragged:theEvent];
}

- (void) rightMouseUp:(NSEvent *)theEvent {
  [self mouseUp:theEvent];
}

- (void) keyDown:(NSEvent *)theEvent {
  
}

@end
