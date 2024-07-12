$(document).ready(function() {
    var cities = [
        "Bandung", "Cimahi", "Kab. Bandung", "Kab. Bandung Barat", "Jakarta Selatan", "Jakarta Pusat", "Jakarta Barat", "Jakarta Timur", "Jakarta Utara", "Yogyakarta", "Denpasar", "Surabaya", "Bekasi", "Depok", "Tangerang Selatan", "Kab. Banyumas", "Kab. Magelang", "Kab. Bekasi", "Kab. Karawang", "Kab. Bogor", "Kab. Tangerang", "Kab. Gresik", "Kab. Sukoharjo", "Kab. Jember", "Kab. Klaten", "Kab. Purworejo", "Kab. Kebumen", "Kab. Kendal", "Kab. Lamongan", "Kab. Madiun", "Kab. Pati", "Kab. Sragen", "Kab. Mojokerto", "Semarang", "Batu", "Kab. Trenggalek", "Kab. Nganjuk", "Kab. Bondowoso", "Kab. Sumenep", "Kab. Situbondo", "Kab. Pamekasan", "Kab. Sampang", "Kab. Bangkalan", "Kab. Tulungagung", "Kab. Malang", "Medan", "Makassar", "Palembang", "Balikpapan", "Batam", "Malang", "Pekanbaru", "Bandar Lampung", "Solo", "Bogor", "Pontianak", "Banjarmasin", "Langsa", "Sabang", "Subulussalam", "Kab. Sleman", "Kab. Badung", "Kab. Gianyar", "Kab. Bantul", "Kab. Sidoarjo", "Kab. Karanganyar", "Kab. Kudus", "Kab. Blitar", "Kab. Tuban", "Kab. Pasuruan", "Kab. Ngawi", "Kab. Kediri", "Kab. Banyuwangi", "Kab. Probolinggo", "Kab. Jombang", "Kab. Bojonegoro", "Kab. Ponorogo", "Kab. Pacitan", "Manado", "Padang", "Samarinda", "Jambi", "Kupang", "Tanjung Pinang", "Mataram", "Kendari", "Gorontalo", "Ambon", "Palu", "Tarakan", "Ternate", "Lubuklinggau", "Prabumulih", "Pematangsiantar", "Tebing Tinggi", "Tanjungbalai", "Padangsidimpuan", "Sibolga", "Binjai", "Lhokseumawe", "Cirebon", "Sukabumi", "Tasikmalaya", "Banjar", "Kab. Ciamis", "Kab. Cianjur", "Kab. Cirebon", "Kab. Garut", "Kab. Indramayu", "Kab. Karawang", "Kab. Kuningan", "Kab. Majalengka", "Kab. Pangandaran", "Kab. Purwakarta", "Kab. Subang", "Kab. Sukabumi", "Kab. Sumedang", "Kab. Tasikmalaya"
    ];

    function displayCities(filteredCities) {
        var cityList = $("#list-kot");
        cityList.empty();
        if (filteredCities.length === 0) {
            // cityList.append('<small><div class="alert alert-info" role="alert">Mohon maaf Kab/Kota anda belum terjangkau!</div></small>');
        } else {
            filteredCities.forEach(function(city) {
                cityList.append('<a class="btn btn-outline-primary super-small-button" disabled>' + city + '</a>');
            });
        }
    }

    $("#searchkota").on("keyup", function() {
        var keyword = $(this).val().toLowerCase();
        var filteredCities = cities.filter(function(city) {
            return city.toLowerCase().includes(keyword);
        });
        displayCities(filteredCities);
    });

    // Display all cities on initial load
    displayCities(cities);

    // var itemsPerPage = 5;

    // var foto_bimble = [
    //   "IMG-20201118-WA0032.jpg","IMG20210308084007.jpg","IMG20210308084049.jpg","IMG20210820111940.jpg","IMG20210820112022.jpg","IMG20211026083048.jpg","IMG20220306084936.jpg","IMG20220320081606.jpg","IMG20220626085332.jpg","IMG20220702092737.jpg","IMG20240704162606.jpg","IMG20240705141324.jpg","IMG20240705141347.jpg","IMG20240705141358.jpg","IMG20240705141415.jpg","IMG20240705141427.jpg","IMG20240705141433.jpg","IMG20240705141452.jpg","IMG20240705153628.jpg"
    // ,
    //     "IMG20240705153655.jpg",
    //     "IMG20240705153721.jpg",
    //     "IMG20240705153746.jpg",
    //     "IMG20240705153816.jpg",
    //     "IMG20240705153833.jpg",
    //     "IMG20240705154813.jpg",
    //     "IMG20240705163517.jpg",
    //     "IMG20240705163557.jpg",
    //     "IMG20240705163639.jpg",
    //     "IMG20240705163723.jpg",
    //     "IMG_20220626_150430.jpg",
    //     "IMG_20220626_150504.jpg",
    //     "IMG_20220626_150515.jpg",
    //     "IMG_20220626_150530.jpg",
    //     "IMG_20220706_063927.jpg",
    //     "IMG_20220706_063952.jpg",
    //     "IMG_20220706_064018.jpg",
    //     "IMG_20220706_064032.jpg",
    //     "IMG_20220706_064050.jpg",
    //     "IMG_20220706_064113.jpg",
    //     "IMG_20220706_064134.jpg",
    //     "IMG_20220706_064551.jpg",
    //     "IMG_20220706_064612.jpg",
    //     "IMG_20220706_064642.jpg",
    // ];

    // foto_bimble.forEach((item)=>{
    //     console.log(`<div class="swiper-slide"><a class="glightbox" data-gallery="images-gallery" href="assets/img/foto/${item}"><img src="assets/img/foto/${item}" class="img-fluid" alt=""></a></div>`)
    // });

    const lesData = {
        "paud": { name: "PAUD/TK", price: 80000 },
        "sd-1-5": { name: "SD Kelas 1-5", price: 85000 },
        "sd-6": { name: "SD Kelas 6", price: 90000 },
        "smp-7-8": { name: "SMP Kelas 7-8", price: 95000 },
        "smp-9": { name: "SMP Kelas 9", price: 100000 },
        "sma-10-11": { name: "SMA Kelas 10-11", price: 105000 },
        "sma-12": { name: "SMA Kelas 12", price: 110000 },
        "utbk": { name: "Persiapan UTBK / ujian mandiri", price: 120000 },
        "tni-polri": { name: "Persiapan Tes TNI/POLRI", price: 120000 },
        "cpns": { name: "Persiapan Tes CPNS", price: 120000 },
        "s1": { name: "Mata Kuliah Mahasiswa S1", price: 130000 },
        "toefl": { name: "TOEFL", price: 130000 },
        "ielts": { name: "IELTS", price: 140000 },
        "skripsi": { name: "Bimbingan Skripsi", price: 140000 },
        "kesenian": { name: "Kesenian", price: 100000 },
        "olahraga": { name: "Olahraga", price: 100000 }
      };
  
      const bbData = {
        "bb-paud": { name: "PAUD/TK", price: 130000 },
        "bb-sd-1-5": { name: "SD Kelas 1-5", price: 135000 },
        "bb-sd-6": { name: "SD Kelas 6", price: 140000 },
        "bb-smp-7-8": { name: "SMP Kelas 7-8", price: 145000 },
        "bb-smp-9": { name: "SMP Kelas 9", price: 150000 },
        "bb-sma-10-11": { name: "SMA Kelas 10-11", price: 155000 },
        "bb-sma-12": { name: "SMA Kelas 12", price: 160000 },
        "bb-utbk": { name: "Persiapan UTBK / ujian mandiri", price: 170000 },
        "bb-tni-polri": { name: "Persiapan Tes TNI/POLRI", price: 170000 },
        "bb-cpns": { name: "Persiapan Tes CPNS", price: 170000 },
        "bb-s1": { name: "Mata Kuliah Mahasiswa S1", price: 180000 },
        "bb-toefl": { name: "TOEFL", price: 180000 },
        "bb-ielts": { name: "IELTS", price: 190000 },
        "bb-skripsi": { name: "Bimbingan Skripsi", price: 190000 },
        "bb-kesenian": { name: "Kesenian", price: 150000 },
        "bb-olahraga": { name: "Olahraga", price: 150000 }
      };
  
      function renderInfo(data) {
        let htmlContent = "";
        for (let key in data) {
          htmlContent += `
            <div class="card mb-3">
              <div class="card-body">
                <h5 class="card-title">${data[key].name}</h5>
                <p class="card-text">Harga: Rp ${data[key].price}/90 menit</p>
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSfdyJ19Vz2COt_HIoLPGGCDQJeu5kU16dBLE2lfU9mshyOLZg/viewform" class="btn btn-outline-success">Daftar</a>
              </div>
            </div>
          `;
        }
        $('#infoContainer').html(htmlContent);
      }
  
      $('#categorySelect').on('change', function() {
        const selectedValue = $(this).val();
  
        if (selectedValue.startsWith('bb-')) {
          if (selectedValue === 'all-bb') {
            renderInfo(bbData);
          } else {
            renderInfo({ [selectedValue]: bbData[selectedValue] });
          }
        } else {
          if (selectedValue === 'all-les') {
            renderInfo(lesData);
          } else {
            renderInfo({ [selectedValue]: lesData[selectedValue] });
          }
        }
      });

      if (window.scrollY > 100) {
        console.log($('#wa-header'));
      }

      // $(window).on('scroll', function() {
      //   var scrollPosition = $(this).scrollTop();
      //   console.log('Scroll Y:', scrollPosition);
      //   if (scrollPosition > 100) {
      //     $('#wa-header').removeClass('btn-wa').addClass('btn-wa-outline');
      //   } else {
      //     $('#wa-header').removeClass('btn-wa-outline').addClass('btn-wa');
      //   }
      // });
});