//
//  AQAppDelegate.m
//  aquamancy
//
//  Created by Michael Goddard on 1/16/12.
//  Copyright (c) 2012 Gradient Studios LLC. All rights reserved.
//

#import "AQAppDelegate.h"

#import "watertest.h"

#import <CoreFoundation/CoreFoundation.h>

@implementation AQAppDelegate

@synthesize window = _window;

- (void)dealloc
{
  [super dealloc];
}

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification
{
  // Insert code here to initialize your application
  
//  SInt32 minor;
//  Gestalt(gestaltSystemVersionMinor, &minor);
  if (floor(NSFoundationVersionNumber) >= NSFoundationVersionNumber10_7) {
//#define NSWindowCollectionBehaviorFullScreenPrimary 1 << 7
    [self.window setCollectionBehavior: NSWindowCollectionBehaviorFullScreenPrimary];
//#undef NSWindowCollectionBehaviorFullScreenPrimary
  }

//  [super applicationDidFinishLaunching:aNotification];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)theApplication
{
  return YES;
}

@end
