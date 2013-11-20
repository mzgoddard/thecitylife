var alive = true;
var lastFrame = 0;
var survivedFor = 0;

var resource = 0;
var visits = 0;

function padNubmer( n ) {
  n = n.toString();
  if ( n.length === 1 ) {
    return '0' + n;
  }
  return n;
}

$('body').click(function hideStart() {
  $('.story-start, .title').animate({'opacity':0},1000);
  $('body').off('click', hideStart);
  SP.resumeSpaceLeaper();
  $('.live-score').show().css('opacity','0').animate({'opacity':1},1000);

  SP.rAF(function time(){
    if ( alive ) {
      SP.rAF(time);
  
      var now = Date.now();
      if ( now - lastFrame < 1000 ) {
        survivedFor += ( now - lastFrame ) / 1000;
  
        $( '.survived-for > div' ).text(
          padNubmer( Math.floor( survivedFor / 60 )) + ':' +
            padNubmer( Math.floor( survivedFor % 60 )) + '.' +
            ( survivedFor % 1 ).toString().substring( 2, 4 ) );
      }
      lastFrame = now;
    }
  });

  // _gaq.push(['_trackEvent','SpaceLeap','GameState','Start']);
});

var once = true;
var endCallback = function() {
  if ( once ) {
    alive = false;
    $('.story-end, .title')
      .show()
      .css('opacity', '0')
      .animate({'opacity':1}, 1000);
    $('.live-score').animate({'opacity':0},1000);

    // _gaq.push(['_trackEvent','SpaceLeap','GameState','End']);
    // _gaq.push(['_trackEvent','SpaceLeap','Score','Visits',visits]);
    // _gaq.push(['_trackEvent','SpaceLeap','Score','Resources',resource]);
    // _gaq.push(
    //   ['_trackEvent','SpaceLeap','Score','SurvivedFor',survivedFor]
    // );
  }
  once = false;
};

// Module.visitedCallback = function( _visits ) {
//   visits = _visits;
//   $('.visited > div').text( visits );
// };
// Module.resourceCallback = function( _resource ) {
//   resource = _resource;
//   $('.resource > div').text( resource );
// }
// Module.ccall(
//   'setSpaceLeaperEndCallback',
//   'undefined',
//   ['number'],
//   [Runtime.addFunction(Module.endCallback)]
// );
SP.setSpaceLeaperEndCallback( endCallback );
// Module.ccall(
//   'setSpaceLeaperVisitedCallback',
//   'undefined',
//   ['number'],
//   [Runtime.addFunction(Module.visitedCallback)]
// );
// Module.ccall(
//   'setSpaceLeaperResourceCallback',
//   'undefined',
//   ['number'],
//   [Runtime.addFunction(Module.resourceCallback)]
// );

// _gaq.push(['_trackEvent','SpaceLeap','Version','1.0']);
