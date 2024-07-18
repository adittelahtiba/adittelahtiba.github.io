// nav menu style
var nav = $("#navbarSupportedContent");
var btn = $(".custom_menu-btn");
btn.click
btn.click(function (e) {

    e.preventDefault();
    nav.toggleClass("lg_nav-toggle");
    document.querySelector(".custom_menu-btn").classList.toggle("menu_btn-style")
});


function getCurrentYear() {
    var d = new Date();
    var currentYear = d.getFullYear()

    $("#displayDate").html(currentYear);
}

getCurrentYear();


const apiUrl = 'https://radical-hickory-swordtail.glitch.me';

function createData() {
    const data = document.getElementById('dataInput').value;
    fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: data })
    }).then(response => response.json())
    .then(data => console.log(data));
}

function readData() {
    fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
        const dataList = document.getElementById('dataList');
        dataList.innerHTML = '';
        data.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `ID: ${item.id}, Data: ${item.data}`;
            dataList.appendChild(li);
        });
    });
}

function updateData() {
    const id = document.getElementById('updateId').value;
    const data = document.getElementById('updateInput').value;
    fetch(`${apiUrl}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: data })
    }).then(response => response.json())
    .then(data => console.log(data));
}

function deleteData() {
    const id = document.getElementById('deleteId').value;
    fetch(`${apiUrl}/${id}`, {
        method: 'DELETE'
    }).then(response => response.json())
    .then(data => console.log(data));
}
