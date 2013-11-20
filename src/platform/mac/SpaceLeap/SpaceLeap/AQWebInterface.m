//
//  AQWebInterface.m
//  SpaceLeap
//
//  Created by Z Goddard on 11/17/13.
//  Copyright (c) 2013 Z Goddard. All rights reserved.
//

#import <JavaScriptCore/JavaScriptCore.h>

#import "AQWebInterface.h"
#import "spaceleaper.h"

@implementation AQWebInterface

+ (BOOL)isSelectorExcludedFromWebScript:(SEL)selector {
  NSLog(@"isSelectorExcludedFromWebScript %@", NSStringFromSelector(selector));
  if ( selector == @selector(pauseSpaceLeaper) ||
       selector == @selector(resumeSpaceLeaper) ||
       selector == @selector(setSpaceLeaperEndCallback:) ||
       selector == @selector(rAF:)
  ) {
    return NO;
  } else {
    return YES;
  }
}

+ (BOOL)isKeyExcludedFromWebScript:(const char *)name {
  return YES;
}

+ (NSString *)webScriptNameForSelector:(SEL)aSelector {
  NSLog(@"webScriptNameForSelector %@", NSStringFromSelector(aSelector));
  if (aSelector == @selector(rAF:)) {
    return @"rAF";
  } else if (aSelector == @selector(setSpaceLeaperEndCallback:)) {
    return @"setSpaceLeaperEndCallback";
  } else {
    return nil;
  }
}

- (void) pauseSpaceLeaper {
  NSLog( @"pauseSpaceLeaper" );
  pauseSpaceLeaper();
  [self.webView setWantsWebEvents:YES];
}

- (void) resumeSpaceLeaper {
  resumeSpaceLeaper();
  [self.webView setWantsWebEvents:NO];
}

static AQWebInterface *_AQWebInterface_context = nil;
static void _AQWebInterface_setSpaceLeaperEndCallback() {
  if ( _AQWebInterface_context ) {
    AQWebInterface *self = _AQWebInterface_context;
    JSObjectRef ref = [self.spaceLeaperEndCallbackWebScriptObject JSObject];
    JSContextRef ctx = [[[self webView] mainFrame] globalContext];
    JSObjectCallAsFunction(ctx, ref, [[[self webView] windowScriptObject] JSObject], 0, NULL, NULL);
  }
}

- (void) setSpaceLeaperEndCallback:(id)callback {
  NSLog(@"setSpaceLeaperEndCallback %@", callback);
  [_AQWebInterface_context release];
  _AQWebInterface_context = [self retain];

  self.spaceLeaperEndCallbackWebScriptObject = callback;
  setSpaceLeaperEndCallback( &_AQWebInterface_setSpaceLeaperEndCallback );
}

- (void) rAF:(id)cb {
  if ([cb respondsToSelector:@selector(JSObject)]) {
    JSObjectRef ref = [cb JSObject];
    JSContextRef ctx = [[[self webView] mainFrame] globalContext];
    if (JSObjectIsFunction( ctx, ref )) {
      [[[self webView] windowScriptObject] callWebScriptMethod:@"requestAnimationFrame" withArguments:@[cb]];
    }
  }
}

@end
