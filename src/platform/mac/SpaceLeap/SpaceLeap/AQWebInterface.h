//
//  AQWebInterface.h
//  SpaceLeap
//
//  Created by Z Goddard on 11/17/13.
//  Copyright (c) 2013 Z Goddard. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <WebKit/WebKit.h>

#import "AQWebView.h"

@interface AQWebInterface : NSObject

@property (retain) AQWebView *webView;
@property (retain) id spaceLeaperEndCallbackWebScriptObject;

- (void)pauseSpaceLeaper;
- (void)resumeSpaceLeaper;
- (void)setSpaceLeaperEndCallback:(id)callback;
- (void)rAF:(id)cb;

@end
