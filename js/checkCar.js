import { supabaseClient } from "./supabase.js";
import { createLottie } from "./animationCheckIcon.js";

const elements = {
  tryAgain: document.getElementById("tryAgain"),
  resultDiv: document.getElementById("resultSection"),
  checkBtn: document.getElementById("checkbtn"),
  payBtn: document.getElementById("paybtn"),
  carInfo: document.getElementById("carInfo"),
  messageDiv: document.getElementById("messageDiv"),
  messageParagraph: document.getElementById("message"),
  licensePlate: document.getElementById("licensePlate"),
  loadingScreen: document.getElementById("loadingScreen"),
  plateInput: document.getElementById("plate_text"),
  animationHolder: document.getElementById("animationHolder"),
  successPopup: document.getElementById("successPopup"),
  popupBtn: document.getElementById("popupBtn")
};

const FREE_MINUTES = 10;
const PRICE_PER_HOUR = 0.6;
const LOADING_TIME = 2700;

const CYRILLIC_TO_LATIN_MAP = {
  "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M",
  "Н": "H", "О": "O", "Р": "P", "С": "C", "Т": "T",
  "У": "Y", "Х": "X"
};

elements.tryAgain.addEventListener("click", reloadPage);
elements.popupBtn.addEventListener("click", reloadPage);
elements.checkBtn.addEventListener("click", handleCheckPlate);

function reloadPage() {
  window.location.reload();
}

function normalizePlate(value) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/./g, char => CYRILLIC_TO_LATIN_MAP[char] || char);
}

function formatTime(date) {
  return date.toLocaleString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function calculateFee(entryTime) {
  const now = new Date();
  const durationMinutes = Math.floor((now - entryTime) / 1000 / 60);

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationText = `${hours} h ${minutes} min`;

  let parkingFee = 0;

  if (durationMinutes > FREE_MINUTES) {
    const hoursAfterFree = Math.ceil((durationMinutes - FREE_MINUTES) / 60);
    parkingFee = hoursAfterFree * PRICE_PER_HOUR;
  }

  return { parkingFee, durationText, now };
}

function showLoading() {
  elements.loadingScreen.style.display = "flex";

  elements.animationHolder.innerHTML = `
    <img 
      src="./assets/animation.svg?t=${Date.now()}" 
      class="loading-image" 
      alt="Loading"
    >
  `;

  setTimeout(hideLoading, LOADING_TIME);
}

function hideLoading() {
  elements.loadingScreen.style.display = "none";
  elements.animationHolder.innerHTML = "";
}

function showMessage(text) {
  elements.resultDiv.style.display = "none";
  elements.messageDiv.style.display = "block";
  elements.messageParagraph.innerHTML = text;
}

function renderCarInfo(car, entryTime, durationText, fee) {
  elements.carInfo.innerHTML = `
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">
          <i class="bi bi-car-front-fill mr-1"></i> License Plate
        </span>
        <span class="info-value plate-badge">${car.plate_text}</span>
      </div>

      <div class="info-row">
        <div class="info-item">
          <span class="info-label">
            <i class="bi bi-clock mr-1"></i> Entry Time
          </span>
          <span class="info-value small">${formatTime(entryTime)}</span>
        </div>

        <div class="info-item">
          <span class="info-label">
            <i class="bi bi-stopwatch mr-1"></i> Duration
          </span>
          <span class="info-value small">${durationText}</span>
        </div>
      </div>

      <div class="price-highlight">
        <span class="price-label">Total Amount</span>
        <span class="price-value">${fee.toFixed(2)}€</span>
      </div>
    </div>
  `;
}

function renderSuccessPopup(car) {
  elements.licensePlate.innerHTML = `
    <div style="
      max-width: 480px;
      margin: 0 auto;
      padding: 22px 26px;
      text-align: center;
      line-height: 1.7;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.14);
    ">
      <div style="margin-bottom: 20px; font-size: 16px;">
        License plate:
        <br>
        <span style="
          display: inline-block;
          margin-top: 8px;
          padding: 6px 18px;
          border-radius: 10px;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 1px;
          background: rgb(243 243 243 / 84%);
        ">
          ${car.plate_text}
        </span>
      </div>

      <div style="
        margin-bottom: 20px;
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 17px;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.07);
      ">
        You have ${FREE_MINUTES} minutes to leave the parking lot.
      </div>

      <div style="font-size: 15px; opacity: 0.85;">
        Thank you for using <strong>Park & Pay</strong>!
      </div>
    </div>
  `;
}

function playSuccessSound() {
  const successSound = new Audio("./sound/success.mp3");
  successSound.play();
}

function playSuccessAnimation() {
  const successAnimation = createLottie(
    "successAnimation",
    "./assets/Lottie/success.json"
  );

  successAnimation.play();
}

async function updatePayment(car, fee, now) {
  return await supabaseClient
    .from("plates")
    .update({
      paid: true,
      current_fee: fee,
      paid_time: now
    })
    .eq("id", car.id);
}

async function getUnpaidCarByPlate(plate) {
  return await supabaseClient
    .from("plates")
    .select("*")
    .ilike("plate_text", plate)
    .ilike("status", "IN")
    .eq("paid", false);
}

async function handlePayment(car, fee, now) {
  const { error } = await updatePayment(car, fee, now);

  if (error) {
    console.error("Грешка:", error);
    return;
  }

  renderSuccessPopup(car);
  playSuccessSound();
  playSuccessAnimation();

  elements.successPopup.style.display = "flex";
}

async function handleCheckPlate() {
  const plate = normalizePlate(elements.plateInput.value);

  showLoading();
  
  if (!plate) {
    showMessage("No license plate provided. Please enter a license plate and try again to search for a vehicle.");
    return;
  }
  
  const { data, error } = await getUnpaidCarByPlate(plate);

  if (error) {
    console.error("Грешка:", error);
    return;
  }
  
  if (!data.length) {
    showMessage(`Cannot find a vehicle with the provided license plate <strong>${plate}</strong>. Please check the license plate and try again.`);
    return;
  }
  
  const car = data[0];
  const entryTime = new Date(car.time_in);
  const { parkingFee, durationText, now } = calculateFee(entryTime);
  
  renderCarInfo(car, entryTime, durationText, parkingFee);
  
  elements.payBtn.innerHTML = `PAY ${parkingFee.toFixed(2)}€`;
  elements.payBtn.onclick = () => handlePayment(car, parkingFee, now);
}