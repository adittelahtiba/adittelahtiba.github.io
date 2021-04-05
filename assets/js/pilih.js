$('#pria').hide();
$('#akad').hide();
$('#resepsi').hide();
$('#selesai').hide();
$('.message').hide();

// function toboltab() {
// 	console.log($(this));
// 	// return false;
// }

$(this).on('keydown', function (params) {
	if (params.originalEvent.keyCode == 9) {
		return false;
	}
})

$('section').on('click', function (params) {
	console.log(params);
	$(params.target).on('keyup', function (event) {
		event.preventDefault();
		let id = this.id;
		if (this.value == '') {
			$('#' + id).removeClass('is-valid');
			$('#' + id).addClass('is-invalid');
			$('#m_' + id).show();
		} else {
			$('#' + id).addClass('is-valid');
			$('#' + id).removeClass('is-invalid');
			$('#m_' + id).hide();
		}
	})
})

$('#wnext').on('click', () => {
	let next = true;
	$('#m_nama_lengkap_w').hide();
	$('#m_nama_panggilan_w').hide();
	$('#m_nama_ibu_w').hide();
	$('#m_nama_ayah_w').hide();
	$('#m_no_hp_w').hide();

	next = validasi_wanita(next);

	if (next == true) {
		$('#pria').show();
		$('#wanita').hide();
	}
})
$('#pnext').on('click', () => {
	let next = true;
	$('#m_nama_lengkap_p').hide();
	$('#m_nama_panggilan_p').hide();
	$('#m_nama_ibu_p').hide();
	$('#m_nama_ayah_p').hide();
	$('#m_no_hp_p').hide();

	next = validasi_pria(next);

	if (next == true) {
		$('#akad').show();
		$('#pria').hide();
	}
})

$('#anext').on('click', () => {
	let next = true;
	$('#m_tanggal_akad').hide();
	$('#m_mulai_akad').hide();
	$('#m_selesai_akad').hide();
	$('#m_lokasi_akad').hide();

	next = validasi_akad(next);

	if (next == true) {
		$('#resepsi').show();
		$('#akad').hide();
	}
})

$('#rnext').on('click', () => {
	let next = true;
	$('#m_tanggal_resepsi').hide();
	$('#m_mulai_resepsi').hide();
	$('#m_selesai_resepsi').hide();
	$('#m_lokasi_resepsi').hide();

	next = validasi_resepsi(next);

	if (next == true) {
		$('#selesai').show();
		$('#resepsi').hide();
	}
})

$('#pprev').on('click', () => {
	$('#pria').hide();
	$('#wanita').show();
})
$('#aprev').on('click', () => {
	$('#akad').hide();
	$('#pria').show();
})
$('#rprev').on('click', () => {
	$('#resepsi').hide();
	$('#akad').show();
})

$('#akad_custom').change(function () {
	if ($(this).is(':checked')) {
		$('#custom-akad').html(`<input type="time" class="form-control" id="selesai_akad" name="selesai_akad"
		placeholder="Waktu Selesai Akad Nikah">
		<label for="floatingInput">Waktu Selesai</label>`);
		$('#akad_selesai').prop('checked', false);
	}
})

$('#akad_selesai').change(function () {
	if ($(this).is(':checked')) {
		$('#custom-akad').html(``);
		$('#akad_custom').prop('checked', false);
	}
})

$('#resepsi_custom').change(function () {
	if ($(this).is(':checked')) {
		$('#custom-resepsi').html(`<input type="time" class="form-control" id="selesai_resepsi" name="selesai_resepsi"
		placeholder="Waktu Selesai resepsi Nikah">
		<label for="floatingInput">Waktu Selesai</label>
		`);
		$('#resepsi_selesai').prop('checked', false);
	}
})

$('#resepsi_selesai').change(function () {
	if ($(this).is(':checked')) {
		$('#custom-resepsi').html(``);
		$('#resepsi_custom').prop('checked', false);
	}
})


function validasi_wanita(next) {
	if ($('#nama_lengkap_w').val() == '') {
		$('#m_nama_lengkap_w').show();
		next = false;
	}
	if ($('#nama_panggilan_w').val() == '') {
		$('#m_nama_panggilan_w').show();
		next = false;
	}
	if ($('#nama_ibu_w').val() == '') {
		$('#m_nama_ibu_w').show();
		next = false;
	}
	if ($('#nama_ayah_w').val() == '') {
		$('#m_nama_ayah_w').show();
		next = false;
	}
	if ($('#no_hp_w').val() == '') {
		$('#m_no_hp_w').show();
		next = false;
	}

	return next;
}

function validasi_pria(next) {
	if ($('#nama_lengkap_p').val() == '') {
		$('#m_nama_lengkap_p').show();
		next = false;
	}
	if ($('#nama_panggilan_p').val() == '') {
		$('#m_nama_panggilan_p').show();
		next = false;
	}
	if ($('#nama_ibu_p').val() == '') {
		$('#m_nama_ibu_p').show();
		next = false;
	}
	if ($('#nama_ayah_p').val() == '') {
		$('#m_nama_ayah_p').show();
		next = false;
	}
	if ($('#no_hp_p').val() == '') {
		$('#m_no_hp_p').show();
		next = false;
	}

	return next;
}

function validasi_akad(next) {
	if ($('#tanggal_akad').val() == '') {
		next = false;
		$('#m_tanggal_akad').show();
	}
	if ($('#mulai_akad').val() == '') {
		next = false;
		$('#m_mulai_akad').show();
	}
	if ($('#selesai_akad').val() == '') {
		next = false;
		$('#m_selesai_akad').show();
	}
	if ($('#lokasi_akad').val() == '') {
		next = false;
		$('#m_lokasi_akad').show();
	}

	return next;
}

function validasi_resepsi(next) {
	if ($('#tanggal_resepsi').val() == '') {
		next = false;
		$('#m_tanggal_resepsi').show();
	}
	if ($('#mulai_resepsi').val() == '') {
		next = false;
		$('#m_mulai_resepsi').show();
	}
	if ($('#selesai_resepsi').val() == '') {
		next = false;
		$('#m_selesai_resepsi').show();
	}
	if ($('#lokasi_resepsi').val() == '') {
		next = false;
		$('#m_lokasi_resepsi').show();
	}

	return next;
}