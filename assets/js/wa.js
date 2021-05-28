$('.wa').on('click', function (event) {
    event.preventDefault();
    //homeLoader.show();
    let nowa = $(this).data("nowa");
    let nowhatsapp = '62' + nowa.substring(1, 20);

    console.log(nowhatsapp);
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // true for mobile device
        window.open('https://wa.me/' + nowhatsapp, '_blank');
    } else {
        // false for not mobile device
        window.open('https://web.whatsapp.com/send?phone=' + nowhatsapp, '_blank');
    }
})

$('.wames').on('click', function (event) {
    event.preventDefault();
    //homeLoader.show();
    let nowa = $(this).data("nowa");
    let message = $(this).data("message");
    let nowhatsapp = '62' + nowa.substring(1, 20);

    console.log(nowhatsapp);
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // true for mobile device
        window.open('https://wa.me/' + nowhatsapp, '_blank');
    } else {
        // false for not mobile device
        window.open('https://web.whatsapp.com/send?phone=' + nowhatsapp, '_blank');
    }
})
