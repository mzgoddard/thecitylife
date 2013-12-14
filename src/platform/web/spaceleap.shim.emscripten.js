if ( window.Module ) {
  SP.requestAnimationFrame = Module.requestAnimationFrame;

  SP.pauseSpaceLeaper = Module.cwrap('pauseSpaceLeaper', 'undefined', []);
  SP.resumeSpaceLeaper = Module.cwrap('resumeSpaceLeaper', 'undefined', []);
  SP.setSpaceLeaperEndCallback =
    Module.cwrap('setSpaceLeaperEndCallback', 'undefined', ['number']);
  SP.setSpaceLeaperVisitedCallback =
    Module.cwrap('setSpaceLeaperVisitedCallback', 'undefined', ['number']);
  SP.setSpaceLeaperResourceCallback =
    Module.cwrap('setSpaceLeaperResourceCallback', 'undefined', ['number']);
}
