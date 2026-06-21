const searchDiv = document.querySelector("#searchSection");
const resultDiv = document.querySelector("#resultSection");
const messageDiv = document.querySelector("#messageDiv");
const payBtn = document.querySelector("#paybtn");
const checkBtn = document.querySelector("#checkbtn");

checkBtn.addEventListener("click", () => {
    searchDiv.style.display = "none";
    resultDiv.classList.add("show");
});



