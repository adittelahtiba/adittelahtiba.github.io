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


// Function to fetch and display JSON data
function fetchData() {
    fetch('/json/data.json') // Replace with your JSON data URL
        .then(response => response.json())
        .then(data => displayData(data))
        .catch(error => console.error('Error fetching data:', error));
}

// Function to display JSON data in HTML
function displayData(data) {
    console.log(data);
    const container = document.getElementById('data-container');

    data.forEach(item => {
        const div = document.createElement('div');
        div.innerHTML = `<strong>Name:</strong> ${item.name} <br>
                         <strong>Age:</strong> ${item.age} <br>
                         <strong>City:</strong> ${item.city} <br><br>`;
        container.appendChild(div);
    });
}

// Call the function to fetch and display data
fetchData();
