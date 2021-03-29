$(window).on('load', function () {

let videooffline = document.getElementById('videooffline');
let audiona = document.getElementById('audiona');
$('.pause').hide();
$('.off-sound').hide();
offsound();


  //countdown
  if ($('.countdown').length) {
    var count = $('.countdown').data('count');
    var template = $('.countdown').html();
    $('.countdown').countdown(count, function (event) {
      $(this).html(event.strftime(template));
    });
  }
  
});

function play() {
	videooffline.play();
	$('.play').hide();
	$('.pause').show();
}

function pause() {
	videooffline.pause();
	$('.pause').hide();
	$('.play').show();
}

function onsound() {
	audiona.pause();
	$('.on-sound').hide();
	$('.off-sound').show();
}

function offsound() {
	audiona.play();
	$('.off-sound').hide();
	$('.on-sound').show();
}

function navhide(){
	$('.navbar').hide();
}

$('.modal').on('hidden.bs.modal', function() {
	$('.navbar').show();
});

