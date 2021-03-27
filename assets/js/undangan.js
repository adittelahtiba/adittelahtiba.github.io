$(window).on('load', function () {

let videooffline = document.getElementById('videooffline');
let audiona = document.getElementById('audiona');
$('.pause').hide();
$('.off-sound').hide();
offsound();

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

