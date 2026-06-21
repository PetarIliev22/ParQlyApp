import { supabaseClient } from "./supabase.js";

const tryAgain = document.getElementById("tryAgain");
const resultDiv = document.getElementById("resultSection");
const checkBtn = document.getElementById("checkbtn");
const payBtn = document.getElementById("paybtn");
const carInfo = document.getElementById("carInfo");
const messageDiv = document.getElementById("messageDiv");
const messageParagraph = document.getElementById("message");
const licensePlate = document.getElementById("licensePlate");
const loadingScreen = document.getElementById("loadingScreen");
const plateInput = document.getElementById("plate_text");
const аnimationHolder = document.getElementById("animationHolder");

tryAgain.addEventListener("click", () => window.location.reload());
document.getElementById("popupBtn").addEventListener("click", () => window.location.reload());

function showLoading() {
    loadingScreen.style.display = "flex";

    animationHolder.innerHTML = `
      <img src="./assets/animation.svg?t=${Date.now()}" 
          class="loading-image" 
          alt="Loading">
    `;

    setTimeout(() => {
        loadingScreen.style.display = "none";
        animationHolder.innerHTML = "";
    }, 2700);
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

  if (durationMinutes > 10) {
    const hoursAfterFree = Math.ceil((durationMinutes - 10) / 60);
    parkingFee = hoursAfterFree * 0.6;
  }

  return { parkingFee, durationText, now };
}

function showMessage(text) {
  resultDiv.style.display = "none";
  messageDiv.style.display = "block";
  messageParagraph.innerHTML = text;
}

function renderCarInfo(car, entryTime, durationText, fee) {
  carInfo.innerHTML = `
    <div class="info-grid">
        <div class="info-item">
            <span class="info-label"><i class="bi bi-car-front-fill mr-1"></i> License Plate</span>
            <span class="info-value plate-badge">${car.plate_text}</span>
        </div>
        
        <div class="info-row">
            <div class="info-item">
                <span class="info-label"><i class="bi bi-clock mr-1"></i> Entry Time</span>
                <span class="info-value small">${formatTime(entryTime)}</span>
            </div>

            <div class="info-item">
                <span class="info-label"><i class="bi bi-stopwatch mr-1"></i> Duration</span>
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

async function handlePayment(car, fee, now) {
  const { error } = await supabaseClient
    .from("plates")
    .update({
      paid: true,
      current_fee: fee,
      paid_time: now
    })
    .eq("id", car.id);

  if (error) {
    console.error("Грешка:", error);
    return;
  }

  licensePlate.innerHTML = `
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

      <div style="
        margin-bottom: 20px;
        font-size: 16px;
      ">
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
          background: rgba(255, 255, 255, 0.08);
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
        You have 10 minutes to leave the parking lot.
      </div>

      <div style="
        font-size: 15px;
        opacity: 0.85;
      ">
        Thank you for using <strong>Park & Pay</strong>.
      </div>

    </div>
  `;

  const successSound = new Audio("./sound/success.mp3");
  successSound.play();

  document.getElementById("successPopup").style.display = "flex";
}

checkBtn.addEventListener("click", async () => {
  const CYRYLLIC_TO_LATIN_MAP = {
    "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M",
    "Н": "H", "О": "O", "Р": "P", "С": "C", "Т": "T",
    "У": "Y", "Х": "X"
  };

  const plate = plateInput.value.trim().toUpperCase().split(" ").join("").replace(/./g, (char) => CYRYLLIC_TO_LATIN_MAP[char] || char);

  showLoading();

  if (!plate) {
    showMessage(`No license plate provided. Please enter a valid license plate.`);
    return;
  }

  const { data, error } = await supabaseClient
    .from("plates")
    .select("*")
    .ilike("plate_text", plate)
    .ilike("status", "IN")
    .eq("paid", false);

  if (error) {
    console.error("Грешка:", error);
    return;
  }

  if (!data.length) {
    showMessage(`Cannot find a vehicle with the provided <strong>${plate}</strong> license plate.`);
    return;
  }

  const car = data[0];
  const entryTime = new Date(car.time_in);

  const { parkingFee, durationText, now } = calculateFee(entryTime);

  renderCarInfo(car, entryTime, durationText, parkingFee);

  payBtn.innerHTML = `PAY ${parkingFee.toFixed(2)}€`;

  payBtn.onclick = () => handlePayment(car, parkingFee, now);

});