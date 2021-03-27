// .
let videooffline = document.getElementById('videooffline');
$('.pause').hide();
$('.off-sound').hide();

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
	// videooffline.play();
	$('.on-sound').hide();
	$('.off-sound').show();
}

function offsound() {
	// videooffline.pause();
	$('.off-sound').hide();
	$('.on-sound').show();
}