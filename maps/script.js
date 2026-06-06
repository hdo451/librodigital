const quizCountries = [
  { id: "egypt", country: "Egypt", capital: "Cairo", lat: 30.0444, lng: 31.2357 },
  { id: "jordan", country: "Jordan", capital: "Amman", lat: 31.9539, lng: 35.9106 },
  { id: "lebanon", country: "Lebanon", capital: "Beirut", lat: 33.8938, lng: 35.5018 },
  { id: "syria", country: "Syria", capital: "Damascus", lat: 33.5138, lng: 36.2765 },
  { id: "iraq", country: "Iraq", capital: "Baghdad", lat: 33.3152, lng: 44.3661 },
  { id: "kuwait", country: "Kuwait", capital: "Kuwait City", lat: 29.3759, lng: 47.9774 },
  { id: "bahrain", country: "Bahrain", capital: "Manama", lat: 26.2285, lng: 50.586 },
  { id: "qatar", country: "Qatar", capital: "Doha", lat: 25.2854, lng: 51.531 },
  { id: "saudi", country: "Saudi Arabia", capital: "Riyadh", lat: 24.7136, lng: 46.6753 },
  { id: "uae", country: "United Arab Emirates", capital: "Abu Dhabi", lat: 24.4539, lng: 54.3773 },
  { id: "oman", country: "Oman", capital: "Muscat", lat: 23.588, lng: 58.3829 },
  { id: "yemen", country: "Yemen", capital: "Sanaa", lat: 15.3694, lng: 44.191 },
  { id: "palestine", country: "Palestine", capital: "East Jerusalem", lat: 31.7683, lng: 35.2137 },
  { id: "turkey", country: "Turkey", capital: "Ankara", lat: 39.9334, lng: 32.8597 },
  { id: "iran", country: "Iran", capital: "Tehran", lat: 35.6892, lng: 51.389 },
  { id: "ethiopia", country: "Ethiopia", capital: "Addis Ababa", lat: 8.9806, lng: 38.7578 },
  { id: "libya", country: "Libya", capital: "Tripoli", lat: 32.8872, lng: 13.1913 },
];

const scoreNode = document.getElementById("score");
const hitsNode = document.getElementById("hits");
const missesNode = document.getElementById("misses");
const answeredNode = document.getElementById("answered");
const totalNode = document.getElementById("total");
const questionText = document.getElementById("question-text");
const optionsNode = document.getElementById("options");
const feedbackNode = document.getElementById("feedback");
const resetBtn = document.getElementById("reset");

let score = 0;
let hits = 0;
let misses = 0;
let currentCountryId = null;
let currentCorrectName = null;
const answeredCountries = new Set();

const map = L.map("map", {
  center: [29.0, 39.0],
  zoom: 4,
  minZoom: 3,
  maxZoom: 8,
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

function shuffle(array) {
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function randomDistractors(correctName, amount = 3) {
  return shuffle(quizCountries.filter((c) => c.country !== correctName).map((c) => c.country)).slice(0, amount);
}

function updateStats() {
  scoreNode.textContent = String(score);
  hitsNode.textContent = String(hits);
  missesNode.textContent = String(misses);
  answeredNode.textContent = String(answeredCountries.size);
  totalNode.textContent = String(quizCountries.length);
}

function disableOptions() {
  const buttons = optionsNode.querySelectorAll("button");
  buttons.forEach((btn) => {
    btn.disabled = true;
  });
}

function handleAnswer(selectedOption, buttonNode) {
  if (!currentCorrectName) return;

  disableOptions();

  if (selectedOption === currentCorrectName) {
    score += 1;
    hits += 1;
    feedbackNode.textContent = "Correct";
    feedbackNode.className = "feedback ok";
    buttonNode.style.borderColor = "#1f7a46";
    buttonNode.style.background = "#e7f6ec";
  } else {
    score = Math.max(0, score - 1);
    misses += 1;
    feedbackNode.textContent = `Incorrect. It was ${currentCorrectName}.`;
    feedbackNode.className = "feedback bad";
    buttonNode.style.borderColor = "#a12c2c";
    buttonNode.style.background = "#fdeaea";
  }

  updateStats();
}

function popupOptionsMarkup(country) {
  const options = shuffle([country.country, ...randomDistractors(country.country)]);
  const optionsHtml = options
    .map(
      (opt) =>
        `<button type="button" class="popup-opt" data-option="${encodeURIComponent(opt)}" style="display:block;width:100%;margin:0.3rem 0;padding:0.35rem 0.5rem;border:1px solid #355c55;border-radius:8px;background:white;cursor:pointer;">${opt}</button>`,
    )
    .join("");

  return `
    <div data-capital-id="${country.id}" style="min-width:220px;">
      <strong>${country.capital}</strong>
      <p style="margin:0.35rem 0 0.55rem;">This capital belongs to which country?</p>
      ${optionsHtml}
      <p class="popup-feedback" style="min-height:1rem;margin:0.35rem 0 0;font-weight:700;"></p>
    </div>
  `;
}

function askQuestionForCountry(country, marker) {
  currentCountryId = country.id;
  currentCorrectName = country.country;
  answeredCountries.add(country.id);

  const options = shuffle([country.country, ...randomDistractors(country.country)]);
  questionText.textContent = `${country.capital} is the capital of:`;
  optionsNode.innerHTML = "";
  feedbackNode.textContent = "";
  feedbackNode.className = "feedback";

  options.forEach((opt) => {
    const button = document.createElement("button");
    button.className = "opt";
    button.type = "button";
    button.textContent = opt;
    button.addEventListener("click", () => handleAnswer(opt, button));
    optionsNode.appendChild(button);
  });

  marker.bindPopup(popupOptionsMarkup(country), { closeButton: false, autoClose: true }).openPopup();
  updateStats();
}

function wirePopupAnswerEvents(marker, country) {
  marker.on("popupopen", (event) => {
    const popupEl = event.popup.getElement();
    if (!popupEl) return;

    const optionButtons = popupEl.querySelectorAll(".popup-opt");
    const popupFeedback = popupEl.querySelector(".popup-feedback");

    optionButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        optionButtons.forEach((b) => {
          b.disabled = true;
          b.style.opacity = "0.9";
        });

        const selected = decodeURIComponent(btn.dataset.option || "");
        if (selected === country.country) {
          score += 1;
          hits += 1;
          btn.style.borderColor = "#1f7a46";
          btn.style.background = "#e7f6ec";
          feedbackNode.textContent = "Correct";
          feedbackNode.className = "feedback ok";
          if (popupFeedback) {
            popupFeedback.textContent = "Correct";
            popupFeedback.style.color = "#1f7a46";
          }
        } else {
          score = Math.max(0, score - 1);
          misses += 1;
          btn.style.borderColor = "#a12c2c";
          btn.style.background = "#fdeaea";
          feedbackNode.textContent = `Incorrect. It was ${country.country}.`;
          feedbackNode.className = "feedback bad";
          if (popupFeedback) {
            popupFeedback.textContent = `Incorrect. It was ${country.country}.`;
            popupFeedback.style.color = "#a12c2c";
          }
        }

        updateStats();
      });
    });
  });
}

function createCapitalDots() {
  quizCountries.forEach((country) => {
    const marker = L.circleMarker([country.lat, country.lng], {
      radius: 7,
      color: "#ffffff",
      weight: 2,
      fillColor: "#d95f26",
      fillOpacity: 0.92,
    }).addTo(map);

    marker.on("mouseover", () => {
      if (currentCountryId !== country.id) {
        askQuestionForCountry(country, marker);
      }
    });

    marker.on("mouseout", () => {
      marker.setStyle({ fillColor: "#d95f26" });
    });

    marker.bindTooltip(country.capital, {
      direction: "top",
      offset: [0, -8],
      opacity: 0.95,
    });

    wirePopupAnswerEvents(marker, country);
  });
}

function resetGame() {
  score = 0;
  hits = 0;
  misses = 0;
  currentCountryId = null;
  currentCorrectName = null;
  answeredCountries.clear();
  questionText.textContent = "Hover a capital dot to begin.";
  optionsNode.innerHTML = "";
  feedbackNode.textContent = "";
  feedbackNode.className = "feedback";
  updateStats();
}

resetBtn.addEventListener("click", resetGame);

createCapitalDots();
resetGame();
