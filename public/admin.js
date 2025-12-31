const socket = io();

const adminPasswordInput = document.getElementById("adminPassword");
const savePasswordBtn = document.getElementById("savePassword");
const authStatus = document.getElementById("authStatus");
const loginForm = document.getElementById("loginForm");
const loggedInView = document.getElementById("loggedInView");
const logoutBtn = document.getElementById("logoutBtn");

const qType = document.getElementById("qType");
const qPrompt = document.getElementById("qPrompt");
const textPromptBlock = document.getElementById("textPromptBlock");
const choiceBlock = document.getElementById("choiceBlock");
const rebusImageBlock = document.getElementById("rebusImageBlock");
const rebusImage = document.getElementById("rebusImage");
const rebusDropZone = document.getElementById("rebusDropZone");
const rebusFileInput = document.getElementById("rebusFileInput");
const rebusImagePreview = document.getElementById("rebusImagePreview");
const rebusPreviewImg = document.getElementById("rebusPreviewImg");
const removeRebusImage = document.getElementById("removeRebusImage");
const generateRebusAnswers = document.getElementById("generateRebusAnswers");
const generateStatus = document.getElementById("generateStatus");
const moviePosterBlock = document.getElementById("moviePosterBlock");
const moviePosterUrl = document.getElementById("moviePosterUrl");
const movieDropZone = document.getElementById("movieDropZone");
const movieFileInput = document.getElementById("movieFileInput");
const movieImagePreview = document.getElementById("movieImagePreview");
const moviePreviewImg = document.getElementById("moviePreviewImg");
const removeMovieImage = document.getElementById("removeMovieImage");
const pieceModePreselect = document.getElementById("pieceModePreselect");
const pieceModeDynamic = document.getElementById("pieceModeDynamic");
const preselectPiecesBlock = document.getElementById("preselectPiecesBlock");
const expertPieceGrid = document.getElementById("expertPieceGrid");
const hardPieceGrid = document.getElementById("hardPieceGrid");
const mediumPieceGrid = document.getElementById("mediumPieceGrid");
const customizePieces = document.getElementById("customizePieces");
const pieceCustomizerModal = document.getElementById("pieceCustomizerModal");
const liveCustomGrid = document.getElementById("liveCustomGrid");
const applyCustomPieces = document.getElementById("applyCustomPieces");
const cancelCustomPieces = document.getElementById("cancelCustomPieces");
const pointsModeRanked = document.getElementById("pointsModeRanked");
const pointsModeEqual = document.getElementById("pointsModeEqual");
const saveSettings = document.getElementById("saveSettings");
const difficultyBlock = document.getElementById("difficultyBlock");
const difficulty = document.getElementById("difficulty");
const choiceLabel = document.getElementById("choiceLabel");
const choiceHint = document.getElementById("choiceHint");
const choiceA = document.getElementById("choiceA");
const choiceB = document.getElementById("choiceB");
const choiceC = document.getElementById("choiceC");
const choiceD = document.getElementById("choiceD");
const qAnswer = document.getElementById("qAnswer");
const qPoints = document.getElementById("qPoints");
const qTime = document.getElementById("qTime");
const createQuestion = document.getElementById("createQuestion");
const cancelEdit = document.getElementById("cancelEdit");
const questionFormTitle = document.getElementById("questionFormTitle");
const questionTable = document.getElementById("questionTable");
const questionTypeTabs = document.getElementById("questionTypeTabs");

const teamName = document.getElementById("teamName");
const createTeam = document.getElementById("createTeam");
const deleteAllTeams = document.getElementById("deleteAllTeams");
const teamList = document.getElementById("teamList");
const deleteAllQuestions = document.getElementById("deleteAllQuestions");
const refreshSubmissionsBtn = document.getElementById("refreshSubmissions");
const clearAllSubmissions = document.getElementById("clearAllSubmissions");
const allSubmissionsBody = document.getElementById("allSubmissionsBody");

const currentQuestion = document.getElementById("currentQuestion");
const currentQuestionSelect = document.getElementById("currentQuestionSelect");
const currentQuestionOptions = document.getElementById("currentQuestionOptions");
const currentQuestionTabs = document.getElementById("currentQuestionTabs");
let selectedQuestionId = null;
let currentQuestionFilter = "all";

// Current Question filter tabs
if (currentQuestionTabs) {
  currentQuestionTabs.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-qfilter]");
    if (!btn) return;
    currentQuestionFilter = btn.getAttribute("data-qfilter");
    currentQuestionTabs.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.toggle("active", b === btn);
    });
    filterCurrentQuestionDropdown();
  });
}

function filterCurrentQuestionDropdown() {
  const allOptions = currentQuestionOptions.querySelectorAll('.custom-option');
  allOptions.forEach(option => {
    const questionType = option.dataset.type;
    if (currentQuestionFilter === "all" || questionType === currentQuestionFilter) {
      option.style.display = "flex";
    } else {
      option.style.display = "none";
    }
  });
}

// Custom dropdown functionality
if (currentQuestionSelect) {
  const trigger = currentQuestionSelect.querySelector('.custom-select-trigger');
  
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    currentQuestionSelect.classList.toggle('open');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    currentQuestionSelect.classList.remove('open');
  });
}

const setCurrent = document.getElementById("setCurrent");
const openQuestion = document.getElementById("openQuestion");
const closeQuestion = document.getElementById("closeQuestion");
const revealAnswer = document.getElementById("revealAnswer");
const lowerDifficulty = document.getElementById("lowerDifficulty");
const movieDifficultyControls = document.getElementById("movieDifficultyControls");
const currentDifficultyLabel = document.getElementById("currentDifficultyLabel");
const stateBanner = document.getElementById("stateBanner");

const adjustTeam = document.getElementById("adjustTeam");
const adjustDelta = document.getElementById("adjustDelta");
const applyAdjust = document.getElementById("applyAdjust");
const resetQuestion = document.getElementById("resetQuestion");
const resetSubmissions = document.getElementById("resetSubmissions");

const rankingsBody = document.getElementById("rankingsBody");
const fastestBody = document.getElementById("fastestBody");
const submissionBody = document.getElementById("submissionBody");
const adminTabs = document.getElementById("adminTabs");
const enableAudio = document.getElementById("enableAudio");
const toggleMusic = document.getElementById("toggleMusic");
const musicVolume = document.getElementById("musicVolume");
const sfxVolume = document.getElementById("sfxVolume");
const audioSpeed = document.getElementById("audioSpeed");
const audioSpeedLabel = document.getElementById("audioSpeedLabel");
const bgMusic = document.getElementById("bgMusic");
const sfxSubmit = document.getElementById("sfxSubmit");
const sfxOpen = document.getElementById("sfxOpen");
const sfxClose = document.getElementById("sfxClose");
const sfxReveal = document.getElementById("sfxReveal");
const sfxSet = document.getElementById("sfxSet");
const audioStatus = document.getElementById("audioStatus");

let adminPassword = localStorage.getItem("adminPassword") || "";
adminPasswordInput.value = adminPassword;
let editingQuestionId = null;
let activeQuestionFilter = "all";
let lastStateSnapshot = { current_question_id: null, is_open: false, reveal_answer: false };
let audioEnabled = false;
let wantsMusic = true;
let bgMusicFallback = null;
let toggleMusicBusy = false;
let savedAudioSpeed = Number(localStorage.getItem("audioSpeed") || 1);
let gameState = null; // Current game state for customizer

// Piece selection state
let selectedPieces = {
  expert: [],
  hard: [],
  medium: [],
  easy: Array.from({ length: 16 }, (_, i) => i) // All 16 pieces
};
let tempCustomPieces = [];
let currentMoviePosterImage = null;

function setActiveTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
  if (tabName === "submissions") {
    loadAllSubmissions();
  }
}

if (adminTabs) {
  adminTabs.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-tab]");
    if (!btn) return;
    setActiveTab(btn.getAttribute("data-tab"));
  });
}

if (questionTypeTabs) {
  questionTypeTabs.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-qtype]");
    if (!btn) return;
    activeQuestionFilter = btn.getAttribute("data-qtype");
    questionTypeTabs.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.toggle("active", b === btn);
    });
    loadQuestions();
  });
}

function setAudioVolume() {
  const musicVol = Number(musicVolume?.value || 0.4);
  const sfxVol = Number(sfxVolume?.value || 0.7);
  const speed = Number(audioSpeed?.value || 1);
  
  if (bgMusic) {
    bgMusic.volume = musicVol;
    bgMusic.playbackRate = speed;
  }
  
  [sfxSubmit, sfxOpen, sfxClose, sfxReveal, sfxSet].forEach((sfx) => {
    if (sfx) {
      sfx.volume = sfxVol;
      sfx.playbackRate = speed;
    }
  });
  
  if (audioSpeedLabel) {
    audioSpeedLabel.textContent = `Speed: ${speed}x`;
  }
  
  // Save audio speed to localStorage
  localStorage.setItem("audioSpeed", speed);
  
  // Broadcast audio speed to participants
  socket.emit('audio_speed_change', { speed });
}

function setAudioStatus(text) {
  if (audioStatus) audioStatus.textContent = text;
}

function safePlay(audio) {
  if (!audioEnabled || !audio) return;
  audio.currentTime = 0;
  audio.play().catch((err) => {
    setAudioStatus(`Audio: play blocked (${err?.name || "error"})`);
  });
}

function playSfxUrl(url) {
  if (!audioEnabled) return;
  const temp = new Audio(url);
  temp.volume = Number(sfxVolume?.value || 1);
  temp.play().catch((err) => {
    setAudioStatus(`Audio: url blocked (${err?.name || "error"})`);
  });
}

function playSfx(kind) {
  const map = {
    submit: "/audio/submitted.mp3",
    open: "/audio/open.mp3",
    close: "/audio/close.mp3",
    reveal: "/audio/reveal.mp3",
    set: "/audio/setcurrent.mp3",
  };
  const url = map[kind];
  if (!url) return;
  playSfxUrl(url);
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.value = 0.1;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => ctx.close();
  } catch {
    // ignore
  }
}

async function unlockAudio() {
  audioEnabled = true;
  setAudioVolume();
  if (sfxSubmit) {
    await sfxSubmit.play().catch(() => {});
    sfxSubmit.pause();
    sfxSubmit.currentTime = 0;
  }
}

async function enableAudioPlayback(autoplay = false) {
  await unlockAudio();
  if (bgMusic && autoplay && wantsMusic) {
    await bgMusic.play().catch((err) => {
      setAudioStatus(`Audio: music blocked (${err?.name || "error"})`);
    });
    toggleMusic.textContent = bgMusic.paused ? "Play Music" : "Pause Music";
    if (!bgMusic.paused) {
      setAudioStatus("Audio: music playing");
    }
  }
  if (enableAudio) enableAudio.textContent = "Enable Audio";
  if (!autoplay) setAudioStatus("Audio: ready (tap Play Music)");
}

if (enableAudio) {
  enableAudio.addEventListener("click", async () => {
    wantsMusic = true;
    await enableAudioPlayback(true);
    if (bgMusic && !bgMusic.paused) {
      toggleMusic.textContent = "Pause Music";
      setAudioStatus("Audio: music playing");
    }
  });
}

async function handleToggleMusicClick() {
  if (toggleMusicBusy) return;
  toggleMusicBusy = true;
  try {
    if (!bgMusic) return;
    setAudioStatus("Audio: toggle click");
    
    let justStarted = false;
    if (!audioEnabled) {
      await enableAudioPlayback(true);
      if (!bgMusic.paused) justStarted = true;
    }
    
    wantsMusic = true;
    
    if (justStarted) return;

    if (bgMusic.paused) {
      await bgMusic.play().catch((err) => {
        setAudioStatus(`Audio: music blocked (${err?.name || "error"})`);
      });
      if (!bgMusic.paused) {
        toggleMusic.textContent = "Pause Music";
        setAudioStatus("Audio: music playing");
      } else {
        if (!bgMusicFallback) {
          bgMusicFallback = new Audio("/audio/mario.mp3");
          bgMusicFallback.loop = true;
          bgMusicFallback.volume = Number(musicVolume?.value || 0.4);
        }
        await bgMusicFallback
          .play()
          .then(() => {
            toggleMusic.textContent = "Pause Music";
            setAudioStatus("Audio: music playing (fallback)");
          })
          .catch((err) => {
            setAudioStatus(`Audio: music failed (${err?.name || "error"})`);
          });
      }
    } else {
      bgMusic.pause();
      if (bgMusicFallback) bgMusicFallback.pause();
      wantsMusic = false;
      toggleMusic.textContent = "Play Music";
      setAudioStatus("Audio: music paused");
    }
  } finally {
    toggleMusicBusy = false;
  }
}

if (toggleMusic) {
  toggleMusic.addEventListener("click", handleToggleMusicClick);
}

musicVolume?.addEventListener("input", setAudioVolume);
sfxVolume?.addEventListener("input", setAudioVolume);
audioSpeed?.addEventListener("input", setAudioVolume);

document.addEventListener(
  "click",
  () => {
    if (!audioEnabled) {
      unlockAudio();
      if (audioStatus && audioStatus.textContent === "Audio: idle") {
        setAudioStatus("Audio: ready (tap Play Music)");
      }
    }
  },
  { once: true }
);

document.addEventListener(
  "keydown",
  () => {
    if (!audioEnabled) {
      unlockAudio();
      if (audioStatus && audioStatus.textContent === "Audio: idle") {
        setAudioStatus("Audio: ready (tap Play Music)");
      }
    }
  },
  { once: true }
);

document.addEventListener(
  "touchstart",
  () => {
    if (!audioEnabled) {
      unlockAudio();
      if (audioStatus && audioStatus.textContent === "Audio: idle") {
        setAudioStatus("Audio: ready (tap Play Music)");
      }
    }
  },
  { once: true, passive: true }
);

// Rebus image upload handlers
if (rebusDropZone) {
  rebusDropZone.addEventListener("click", () => {
    rebusFileInput.click();
  });

  rebusDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    rebusDropZone.style.borderColor = "#4CAF50";
    rebusDropZone.style.backgroundColor = "#f0f8f0";
  });

  rebusDropZone.addEventListener("dragleave", () => {
    rebusDropZone.style.borderColor = "#ccc";
    rebusDropZone.style.backgroundColor = "transparent";
  });

  rebusDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    rebusDropZone.style.borderColor = "#ccc";
    rebusDropZone.style.backgroundColor = "transparent";
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleRebusImageFile(files[0]);
    }
  });
}

if (rebusFileInput) {
  rebusFileInput.addEventListener("change", (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleRebusImageFile(files[0]);
    }
  });
}

if (removeRebusImage) {
  removeRebusImage.addEventListener("click", () => {
    rebusImage.value = "";
    rebusFileInput.value = "";
    rebusImagePreview.style.display = "none";
    rebusDropZone.style.display = "block";
    rebusPreviewImg.src = "";
    generateStatus.textContent = "";
  });
}

if (generateRebusAnswers) {
  generateRebusAnswers.addEventListener("click", async () => {
    const imageUrl = rebusImage.value.trim();
    if (!imageUrl) {
      generateStatus.textContent = "⚠️ No image to analyze";
      generateStatus.style.color = "#ff5722";
      return;
    }
    
    generateStatus.textContent = "🔄 Generating answers...";
    generateStatus.style.color = "#2196F3";
    generateRebusAnswers.disabled = true;
    
    try {
      const response = await api("/api/generate-rebus-answers", {
        method: "POST",
        body: JSON.stringify({ imageUrl })
      });
      
      if (response.choices && response.choices.length === 4) {
        choiceA.value = response.choices[0];
        choiceB.value = response.choices[1];
        choiceC.value = response.choices[2];
        choiceD.value = response.choices[3];
        qAnswer.value = response.correct_answer;
        
        generateStatus.textContent = "✅ Answers generated successfully!";
        generateStatus.style.color = "#4CAF50";
        
        setTimeout(() => {
          generateStatus.textContent = "";
        }, 3000);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error generating answers:", error);
      if (error.message.includes("gemini_api_key_not_configured")) {
        generateStatus.textContent = "⚠️ API key not configured. Set GEMINI_API_KEY environment variable.";
      } else {
        generateStatus.textContent = `❌ Error: ${error.message}`;
      }
      generateStatus.style.color = "#ff5722";
    } finally {
      generateRebusAnswers.disabled = false;
    }
  });
}

function handleRebusImageFile(file) {
  if (!file.type.startsWith("image/")) {
    alert("Please select a valid image file.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    rebusImage.value = dataUrl;
    rebusPreviewImg.src = dataUrl;
    rebusImagePreview.style.display = "block";
    rebusDropZone.style.display = "none";
  };
  reader.readAsDataURL(file);
}

// Update rebus preview when URL is manually entered
if (rebusImage) {
  rebusImage.addEventListener("input", () => {
    const url = rebusImage.value.trim();
    if (url && !url.startsWith("data:image/")) {
      rebusPreviewImg.src = url;
      rebusImagePreview.style.display = "block";
      rebusDropZone.style.display = "none";
    } else if (!url) {
      rebusImagePreview.style.display = "none";
      rebusDropZone.style.display = "block";
    }
  });
}

// Movie Poster Image Handling
if (movieDropZone) {
  movieDropZone.addEventListener("click", () => {
    movieFileInput.click();
  });

  movieDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    movieDropZone.style.borderColor = "#2196F3";
    movieDropZone.style.backgroundColor = "#f0f8ff";
  });

  movieDropZone.addEventListener("dragleave", () => {
    movieDropZone.style.borderColor = "#ccc";
    movieDropZone.style.backgroundColor = "transparent";
  });

  movieDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    movieDropZone.style.borderColor = "#ccc";
    movieDropZone.style.backgroundColor = "transparent";
    const file = e.dataTransfer.files[0];
    if (file) {
      handleMovieImageFile(file);
    }
  });
}

if (movieFileInput) {
  movieFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      handleMovieImageFile(file);
    }
  });
}

if (removeMovieImage) {
  removeMovieImage.addEventListener("click", () => {
    moviePosterUrl.value = "";
    movieFileInput.value = "";
    movieImagePreview.style.display = "none";
    movieDropZone.style.display = "block";
    moviePreviewImg.src = "";
    currentMoviePosterImage = null;
    // Clear piece grids
    if (expertPieceGrid) expertPieceGrid.innerHTML = "";
    if (hardPieceGrid) hardPieceGrid.innerHTML = "";
    if (mediumPieceGrid) mediumPieceGrid.innerHTML = "";
  });
}

function handleMovieImageFile(file) {
  if (!file.type.startsWith("image/")) {
    alert("Please select a valid image file.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    moviePosterUrl.value = dataUrl;
    moviePreviewImg.src = dataUrl;
    movieImagePreview.style.display = "block";
    movieDropZone.style.display = "none";
    currentMoviePosterImage = dataUrl;
    if (pieceModePreselect.checked) {
      updatePieceGrids();
    }
  };
  reader.readAsDataURL(file);
}

// Update movie poster preview when URL is manually entered
if (moviePosterUrl) {
  moviePosterUrl.addEventListener("input", () => {
    const url = moviePosterUrl.value.trim();
    if (url && !url.startsWith("data:image/")) {
      moviePreviewImg.src = url;
      movieImagePreview.style.display = "block";
      movieDropZone.style.display = "none";
    } else if (!url) {
      movieImagePreview.style.display = "none";
      movieDropZone.style.display = "block";
    }
    currentMoviePosterImage = url;
    if (pieceModePreselect.checked && url) {
      updatePieceGrids();
    }
  });
}

// Piece mode toggle handlers
if (pieceModePreselect) {
  pieceModePreselect.addEventListener("change", () => {
    if (pieceModePreselect.checked) {
      preselectPiecesBlock.style.display = "block";
      if (currentMoviePosterImage) {
        updatePieceGrids();
      }
    }
  });
}

if (pieceModeDynamic) {
  pieceModeDynamic.addEventListener("change", () => {
    if (pieceModeDynamic.checked) {
      preselectPiecesBlock.style.display = "none";
    }
  });
}

// Create piece selection grid
function createPieceGrid(container, imageUrl, level, maxPieces) {
  container.innerHTML = "";
  container.style.display = "grid";
  
  for (let i = 0; i < 16; i++) {
    const piece = document.createElement("div");
    piece.className = "piece-selector-item";
    piece.dataset.index = i;
    
    if (imageUrl) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      piece.style.backgroundImage = `url(${imageUrl})`;
      piece.style.backgroundPosition = `${col * 33.333}% ${row * 33.333}%`;
    }
    
    // Check if this piece is already selected in a previous level
    const isInPreviousLevel = (level === 'hard' && selectedPieces.expert.includes(i)) ||
                               (level === 'medium' && (selectedPieces.expert.includes(i) || selectedPieces.hard.includes(i)));
    
    if (isInPreviousLevel) {
      piece.classList.add("selected", "disabled");
    } else if (selectedPieces[level].includes(i)) {
      piece.classList.add("selected");
    }
    
    piece.addEventListener("click", () => {
      if (piece.classList.contains("disabled")) return;
      
      const index = parseInt(piece.dataset.index);
      const currentSelected = selectedPieces[level];
      
      if (currentSelected.includes(index)) {
        selectedPieces[level] = currentSelected.filter(p => p !== index);
        piece.classList.remove("selected");
      } else {
        // Check if we've reached the max for this level
        const previousCount = level === 'expert' ? 0 : 
                             level === 'hard' ? selectedPieces.expert.length :
                             selectedPieces.expert.length + selectedPieces.hard.length;
        const currentCount = currentSelected.length + previousCount;
        
        if (currentCount < maxPieces) {
          selectedPieces[level].push(index);
          piece.classList.add("selected");
        }
      }
    });
    
    container.appendChild(piece);
  }
}

function updatePieceGrids() {
  const imageUrl = currentMoviePosterImage || moviePosterUrl.value.trim();
  if (!imageUrl) return;
  
  createPieceGrid(expertPieceGrid, imageUrl, 'expert', 1);
  createPieceGrid(hardPieceGrid, imageUrl, 'hard', 3);
  createPieceGrid(mediumPieceGrid, imageUrl, 'medium', 7);
}

// Update points based on difficulty level
function updatePointsBasedOnDifficulty() {
  if (!difficulty) return;
  const difficultyValue = difficulty.value;
  const pointsMap = {
    expert: 15,
    hard: 10,
    medium: 5,
    easy: 2
  };
  qPoints.value = pointsMap[difficultyValue] || 10;
}

if (difficulty) {
  difficulty.addEventListener("change", updatePointsBasedOnDifficulty);
}

[bgMusic, sfxSubmit, sfxOpen, sfxClose, sfxReveal, sfxSet].forEach((audio) => {
  if (!audio) return;
  audio.addEventListener("error", () => {
    setAudioStatus("Audio: failed to load a sound file.");
  });
});

async function verifyAudioFiles() {
  const files = [
    "/audio/mario.mp3",
    "/audio/submitted.mp3",
    "/audio/open.mp3",
    "/audio/close.mp3",
    "/audio/reveal.mp3",
    "/audio/setcurrent.mp3",
    "/audio/10-sec-countdown.mp3",
    "/audio/20-sec-countdown.mp3",
  ];
  try {
    const results = await Promise.all(
      files.map((file) =>
        fetch(file, { method: "HEAD" })
          .then((r) => r.ok)
          .catch(() => false)
      )
    );
    if (results.every(Boolean)) {
      setAudioStatus("Audio: files OK (server) ");
    } else {
      setAudioStatus("Audio: one or more files missing (server).");
    }
  } catch {
    setAudioStatus("Audio: unable to verify files.");
  }
}

verifyAudioFiles();

// Initialize with tabs hidden
setAuth(false);

// Set initial audio speed from localStorage
if (audioSpeed) {
  audioSpeed.value = savedAudioSpeed;
  setAudioVolume();
}

function setAuth(ok) {
  authStatus.textContent = ok ? "Verified" : "Not verified";
  authStatus.classList.toggle("closed", !ok);
  
  // Toggle login form and logged in view
  if (loginForm) loginForm.style.display = ok ? "none" : "flex";
  if (loggedInView) loggedInView.style.display = ok ? "flex" : "none";
  
  // Show/hide the entire content area based on authentication
  const wrapContainer = document.querySelector(".wrap");
  
  if (wrapContainer) {
    wrapContainer.style.display = ok ? "block" : "none";
  }
}

savePasswordBtn.addEventListener("click", () => {
  adminPassword = adminPasswordInput.value.trim();
  localStorage.setItem("adminPassword", adminPassword);
  loadAll();
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    adminPassword = "";
    adminPasswordInput.value = "";
    localStorage.removeItem("adminPassword");
    setAuth(false);
  });
}

qType.addEventListener("change", () => {
  const isMultipleChoice = qType.value === "multiple_choice";
  const isRebusPuzzle = qType.value === "rebus_puzzle";
  const isMovieTitle = qType.value === "movie_title";
  
  choiceBlock.style.display = (isMultipleChoice || isRebusPuzzle) ? "block" : "none";
  rebusImageBlock.style.display = isRebusPuzzle ? "block" : "none";
  moviePosterBlock.style.display = isMovieTitle ? "block" : "none";
  difficultyBlock.style.display = isMovieTitle ? "block" : "none";
  textPromptBlock.style.display = (isRebusPuzzle || isMovieTitle) ? "none" : "block";
  
  // Update choice labels and placeholders based on type
  if (isRebusPuzzle) {
    choiceLabel.textContent = "Choices (A-D) - Text only";
    choiceHint.textContent = "Enter text answers only for Rebus Puzzle Game";
    choiceA.placeholder = "Choice A (text)";
    choiceB.placeholder = "Choice B (text)";
    choiceC.placeholder = "Choice C (text)";
    choiceD.placeholder = "Choice D (text)";
  } else {
    choiceLabel.textContent = "Choices (A-D) - Enter text or image URL";
    choiceHint.textContent = "For images, paste a URL (e.g., https://example.com/image.jpg)";
    choiceA.placeholder = "Choice A (text or image URL)";
    choiceB.placeholder = "Choice B (text or image URL)";
    choiceC.placeholder = "Choice C (text or image URL)";
    choiceD.placeholder = "Choice D (text or image URL)";
  }
  
  // Update points based on difficulty for movie title
  if (isMovieTitle && difficulty) {
    updatePointsBasedOnDifficulty();
  }
});

async function api(path, options = {}) {
  const resp = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Password": adminPassword,
      ...(options.headers || {}),
    },
  });
  if (resp.status === 401) {
    setAuth(false);
    throw new Error("unauthorized");
  }
  setAuth(true);
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(msg || "request_failed");
  }
  if (resp.headers.get("content-type")?.includes("application/json")) {
    return resp.json();
  }
  return resp.text();
}

createQuestion.addEventListener("click", async () => {
  const isRebusPuzzle = qType.value === "rebus_puzzle";
  const isMovieTitle = qType.value === "movie_title";
  
  const payload = {
    type: qType.value,
    prompt: (isRebusPuzzle || isMovieTitle) ? (isRebusPuzzle ? rebusImage.value.trim() : "Guess the Movie Title") : qPrompt.value.trim(),
    choices: (qType.value === "multiple_choice" || isRebusPuzzle) ? [choiceA.value, choiceB.value, choiceC.value, choiceD.value] : null,
    correct_answer: qAnswer.value.trim(),
    points: Number(qPoints.value || 0),
    time_limit_seconds: qTime.value ? Number(qTime.value) : null,
  };
  
  // Add rebus image URL if applicable
  if (isRebusPuzzle && rebusImage.value.trim()) {
    payload.rebus_image_url = rebusImage.value.trim();
  }
  
  // Add movie poster data if applicable
  if (isMovieTitle && moviePosterUrl && moviePosterUrl.value.trim()) {
    payload.rebus_image_url = moviePosterUrl.value.trim(); // Reusing rebus_image_url column
    payload.difficulty = difficulty.value;
    payload.piece_mode = pieceModePreselect.checked ? "preselect" : "dynamic";
    
    if (pieceModePreselect.checked) {
      // Combine pieces cumulatively: expert pieces, then hard includes expert, etc.
      const combinedPieces = {
        expert: [...selectedPieces.expert],
        hard: [...selectedPieces.expert, ...selectedPieces.hard],
        medium: [...selectedPieces.expert, ...selectedPieces.hard, ...selectedPieces.medium],
        easy: selectedPieces.easy
      };
      console.log("Saving pieces:", combinedPieces);
      payload.selected_pieces_json = JSON.stringify(combinedPieces);
    }
  }
  
  if (editingQuestionId) {
    await api(`/api/questions/${editingQuestionId}`, { method: "PUT", body: JSON.stringify(payload) });
  } else {
    await api("/api/questions", { method: "POST", body: JSON.stringify(payload) });
  }
  qPrompt.value = "";
  qAnswer.value = "";
  choiceA.value = "";
  choiceB.value = "";
  choiceC.value = "";
  choiceD.value = "";
  rebusImage.value = "";
  rebusFileInput.value = "";
  rebusImagePreview.style.display = "none";
  rebusDropZone.style.display = "block";
  rebusPreviewImg.src = "";
  moviePosterUrl.value = "";
  movieFileInput.value = "";
  movieImagePreview.style.display = "none";
  movieDropZone.style.display = "block";
  moviePreviewImg.src = "";
  currentMoviePosterImage = null;
  selectedPieces = {
    expert: [],
    hard: [],
    medium: [],
    easy: Array.from({ length: 16 }, (_, i) => i)
  };
  preselectPiecesBlock.style.display = "none";
  pieceModeDynamic.checked = true;
  editingQuestionId = null;
  questionFormTitle.textContent = "Create Question";
  createQuestion.textContent = "Create Question";
  cancelEdit.style.display = "none";
  await loadQuestions();
});

cancelEdit.addEventListener("click", () => {
  editingQuestionId = null;
  questionFormTitle.textContent = "Create Question";
  createQuestion.textContent = "Create Question";
  cancelEdit.style.display = "none";
  qPrompt.value = "";
  qAnswer.value = "";
  choiceA.value = "";
  choiceB.value = "";
  choiceC.value = "";
  choiceD.value = "";
  rebusImage.value = "";
  rebusFileInput.value = "";
  rebusImagePreview.style.display = "none";
  rebusDropZone.style.display = "block";
  rebusPreviewImg.src = "";
});

createTeam.addEventListener("click", async () => {
  const name = teamName.value.trim();
  if (!name) return;
  await api("/api/teams", { method: "POST", body: JSON.stringify({ team_name: name }) });
  teamName.value = "";
  await loadTeams();
});

deleteAllTeams.addEventListener("click", async () => {
  if (confirm("Are you sure you want to delete ALL teams and their submissions? This cannot be undone!")) {
    await api("/api/teams/delete_all", { method: "POST" });
    await loadTeams();
    await loadRankings();
    await refreshSubmissions();
  }
});

setCurrent.addEventListener("click", async () => {
  await api("/api/game/set_current", {
    method: "POST",
    body: JSON.stringify({ question_id: Number(currentQuestion.value) || null }),
  });
  playSfx("set");
  await refreshSubmissions();
});

openQuestion.addEventListener("click", async () => {
  await api("/api/game/open", { method: "POST" });
});

closeQuestion.addEventListener("click", async () => {
  await api("/api/game/close", { method: "POST" });
  await refreshSubmissions();
});

revealAnswer.addEventListener("click", async () => {
  await api("/api/game/reveal", { method: "POST" });
});

lowerDifficulty.addEventListener("click", async () => {
  try {
    await api("/api/game/lower_difficulty", { method: "POST" });
  } catch (error) {
    console.error("Error lowering difficulty:", error);
  }
});

customizePieces.addEventListener("click", () => {
  // Get current movie poster from state
  console.log("Game state:", gameState);
  console.log("Current question:", gameState?.question);
  
  const currentQuestion = gameState?.question;
  if (!currentQuestion || currentQuestion.type !== "movie_title") {
    alert("No active Movie Title question");
    return;
  }
  
  const imageUrl = currentQuestion.rebus_image_url || currentQuestion.prompt;
  console.log("Image URL:", imageUrl);
  if (!imageUrl || !imageUrl.startsWith("data:image/")) {
    alert("No movie poster image found");
    return;
  }
  
  // Create the live customizer grid
  const liveCustomGrid = document.getElementById("liveCustomGrid");
  liveCustomGrid.innerHTML = "";
  
  // Get current custom pieces if they exist
  const currentCustomPieces = gameState.custom_pieces_json 
    ? JSON.parse(gameState.custom_pieces_json)
    : [];
  
  // Create 4x4 grid
  for (let i = 0; i < 16; i++) {
    const piece = document.createElement("div");
    piece.className = "piece-selector-item";
    piece.dataset.index = i;
    
    // Calculate position
    const row = Math.floor(i / 4);
    const col = i % 4;
    const bgX = (col * 100 / 3);
    const bgY = (row * 100 / 3);
    
    piece.style.backgroundImage = `url('${imageUrl}')`;
    piece.style.backgroundPosition = `${bgX}% ${bgY}%`;
    piece.style.backgroundSize = "400% 400%";
    
    // Mark as selected if in current custom pieces
    if (currentCustomPieces.includes(i)) {
      piece.classList.add("selected");
    }
    
    // Toggle selection on click
    piece.addEventListener("click", () => {
      piece.classList.toggle("selected");
    });
    
    liveCustomGrid.appendChild(piece);
  }
  
  // Show modal
  pieceCustomizerModal.style.display = "flex";
});

applyCustomPieces.addEventListener("click", async () => {
  const liveCustomGrid = document.getElementById("liveCustomGrid");
  const selectedItems = liveCustomGrid.querySelectorAll(".piece-selector-item.selected");
  const selectedIndices = Array.from(selectedItems).map(item => Number(item.dataset.index));
  
  try {
    await api("/api/game/customize_pieces", {
      method: "POST",
      body: JSON.stringify({ pieces: selectedIndices })
    });
    pieceCustomizerModal.style.display = "none";
  } catch (error) {
    console.error("Error customizing pieces:", error);
    alert("Failed to customize pieces");
  }
});

cancelCustomPieces.addEventListener("click", () => {
  pieceCustomizerModal.style.display = "none";
});

saveSettings.addEventListener("click", async () => {
  const pointsMode = pointsModeRanked.checked ? "ranked" : "equal";
  try {
    await api("/api/settings", {
      method: "POST",
      body: JSON.stringify({ points_mode: pointsMode })
    });
    alert("Settings saved successfully!");
  } catch (error) {
    console.error("Error saving settings:", error);
    alert("Failed to save settings");
  }
});

applyAdjust.addEventListener("click", async () => {
  const teamId = Number(adjustTeam.value);
  const delta = Number(adjustDelta.value || 0);
  if (!teamId || !Number.isFinite(delta)) return;
  await api(`/api/teams/${teamId}/adjust`, { method: "POST", body: JSON.stringify({ delta }) });
  adjustDelta.value = "";
  await loadRankings();
});

resetSubmissions.addEventListener("click", async () => {
  const questionId = Number(resetQuestion.value);
  if (!questionId) return;
  await api("/api/game/reset_submissions", { method: "POST", body: JSON.stringify({ question_id: questionId }) });
  await refreshSubmissions();
});

if (deleteAllQuestions) {
  deleteAllQuestions.addEventListener("click", async () => {
    const typeLabel = activeQuestionFilter === "all" ? "ALL questions" : 
                      `all ${activeQuestionFilter.replace('_', ' ')} questions`;
    
    if (confirm(`Are you sure you want to delete ${typeLabel}? This cannot be undone!`)) {
      try {
        await api("/api/questions/delete_all", { 
          method: "POST",
          body: JSON.stringify({ type: activeQuestionFilter })
        });
        await loadQuestions();
      } catch (error) {
        console.error("Error deleting questions:", error);
        alert("Failed to delete questions");
      }
    }
  });
}

async function loadQuestions() {
  const allQuestions = await api("/api/questions");

  // Calculate counts
  const counts = {
    all: allQuestions.length,
    text: 0,
    multiple_choice: 0,
    rebus_puzzle: 0,
    movie_title: 0
  };
  
  allQuestions.forEach(q => {
    if (counts[q.type] !== undefined) {
      counts[q.type]++;
    }
  });
  
  // Update badges
  if (questionTypeTabs) {
    questionTypeTabs.querySelectorAll("button[data-qtype]").forEach(btn => {
      const type = btn.getAttribute("data-qtype");
      const badge = btn.querySelector(".count-badge");
      if (badge) {
        badge.textContent = `(${counts[type] || 0})`;
      }
    });
  }

  // Update Delete All button text
  if (deleteAllQuestions) {
    const typeLabel = activeQuestionFilter === "all" ? "Questions" : 
                      activeQuestionFilter === "text" ? "Text Questions" :
                      activeQuestionFilter === "multiple_choice" ? "Multiple Choice Questions" :
                      activeQuestionFilter === "rebus_puzzle" ? "Rebus Puzzles" :
                      activeQuestionFilter === "movie_title" ? "Movie Titles" : "Questions";
    deleteAllQuestions.textContent = `Delete All ${typeLabel}`;
  }

  const questions = activeQuestionFilter === "all" 
    ? allQuestions 
    : allQuestions.filter(q => q.type === activeQuestionFilter);
  
  currentQuestion.innerHTML = "";
  currentQuestionOptions.innerHTML = "";
  resetQuestion.innerHTML = "";
  questionTable.innerHTML = "";
  
  // Populate dropdowns with all questions regardless of filter
  allQuestions.forEach((q) => {
    // Standard hidden select for reset dropdown
    const option = document.createElement("option");
    option.value = q.id;
    
    // Show friendly text for rebus puzzles and movie titles with base64 images
    let displayText;
    if ((q.type === "rebus_puzzle" || q.type === "movie_title") && q.prompt.startsWith("data:image/")) {
      const label = q.type === "movie_title" ? "Movie Puzzle" : "Rebus Image";
      displayText = `#${q.id} [${label}] - ${q.points} pts`;
    } else if (q.prompt.length > 40) {
      displayText = `#${q.id} ${q.prompt.slice(0, 40)}...`;
    } else {
      displayText = `#${q.id} ${q.prompt}`;
    }
    
    option.textContent = displayText;
    currentQuestion.appendChild(option);
    resetQuestion.appendChild(option.cloneNode(true));
    
    // Custom dropdown option with image support
    const customOption = document.createElement('div');
    customOption.className = 'custom-option';
    customOption.dataset.value = q.id;
    customOption.dataset.type = q.type;
    
    if ((q.type === "rebus_puzzle" || q.type === "movie_title") && (q.rebus_image_url || q.prompt.startsWith("data:image/"))) {
      const imageUrl = q.rebus_image_url || q.prompt;
      const label = q.type === "movie_title" ? "Movie Puzzle" : "Rebus Puzzle";
      customOption.innerHTML = `
        <img src="${imageUrl}" class="custom-option-image" alt="${label} ${q.id}" />
        <span class="custom-option-text">#${q.id} - ${label} (${q.points} pts)</span>
      `;
    } else {
      customOption.innerHTML = `
        <span class="custom-option-text">${displayText}</span>
      `;
    }
    
    customOption.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedQuestionId = q.id;
      currentQuestion.value = q.id;
      
      // Update trigger text/image
      const trigger = currentQuestionSelect.querySelector('.custom-select-trigger');
      if ((q.type === "rebus_puzzle" || q.type === "movie_title") && (q.rebus_image_url || q.prompt.startsWith("data:image/"))) {
        const imageUrl = q.rebus_image_url || q.prompt;
        const label = q.type === "movie_title" ? "Movie Puzzle" : "Rebus Puzzle";
        trigger.innerHTML = `
          <img src="${imageUrl}" class="custom-option-image" alt="${label} ${q.id}" />
          <span>#${q.id} - ${label} (${q.points} pts)</span>
        `;
      } else {
        trigger.innerHTML = `<span>${displayText}</span>`;
      }
      
      // Mark as selected
      currentQuestionOptions.querySelectorAll('.custom-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      customOption.classList.add('selected');
      
      // Close dropdown
      currentQuestionSelect.classList.remove('open');
    });
    
    currentQuestionOptions.appendChild(customOption);
  });
  
  // Display only filtered questions in the table
  questions.forEach((q) => {
    const row = document.createElement("tr");
    
    // Create prompt display based on type
    let promptDisplay;
    if ((q.type === "rebus_puzzle" || q.type === "movie_title") && (q.rebus_image_url || q.prompt.startsWith("data:image/"))) {
      const imageUrl = q.rebus_image_url || q.prompt;
      const label = q.type === "movie_title" ? "Movie Puzzle" : "Rebus Puzzle";
      promptDisplay = `<img src="${imageUrl}" alt="${label}" style="max-width: 100px; max-height: 60px; border-radius: 4px;" />`;
    } else if (q.prompt.length > 50) {
      promptDisplay = q.prompt.slice(0, 50) + "...";
    } else {
      promptDisplay = q.prompt;
    }
    
    row.innerHTML = `
      <td>${q.id}</td>
      <td>${promptDisplay}</td>
      <td>${q.type}</td>
      <td>${q.points}</td>
      <td>
        <button data-edit="${q.id}">Edit</button>
        <button class="ghost" data-delete="${q.id}">Delete</button>
      </td>
    `;
    questionTable.appendChild(row);
  });

  questionTable.querySelectorAll("button[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = allQuestions.find((item) => String(item.id) === btn.getAttribute("data-edit"));
      if (!q) return;
      editingQuestionId = q.id;
      questionFormTitle.textContent = `Edit Question #${q.id}`;
      createQuestion.textContent = "Save Changes";
      cancelEdit.style.display = "inline-block";
      qType.value = q.type;
      
      const isRebusPuzzle = q.type === "rebus_puzzle";
      const isMovieTitle = q.type === "movie_title";
      
      // Set prompt based on type
      if (isRebusPuzzle) {
        const imageUrl = q.rebus_image_url || q.prompt;
        rebusImage.value = imageUrl;
        if (imageUrl) {
          rebusPreviewImg.src = imageUrl;
          rebusImagePreview.style.display = "block";
          rebusDropZone.style.display = "none";
        } else {
          rebusImagePreview.style.display = "none";
          rebusDropZone.style.display = "block";
        }
        qPrompt.value = "";
        moviePosterUrl.value = "";
        movieImagePreview.style.display = "none";
        movieDropZone.style.display = "block";
      } else if (isMovieTitle) {
        const imageUrl = q.rebus_image_url || q.prompt;
        moviePosterUrl.value = imageUrl;
        if (imageUrl) {
          moviePreviewImg.src = imageUrl;
          movieImagePreview.style.display = "block";
          movieDropZone.style.display = "none";
          currentMoviePosterImage = imageUrl;
        } else {
          movieImagePreview.style.display = "none";
          movieDropZone.style.display = "block";
          currentMoviePosterImage = null;
        }
        difficulty.value = q.difficulty || "easy";
        qPrompt.value = "";
        rebusImage.value = "";
        rebusImagePreview.style.display = "none";
        rebusDropZone.style.display = "block";
        
        // Load piece selection mode and pieces
        if (q.piece_mode === "preselect") {
          pieceModePreselect.checked = true;
          preselectPiecesBlock.style.display = "block";
          
          // Load selected pieces
          if (q.selected_pieces_json) {
            selectedPieces = JSON.parse(q.selected_pieces_json);
            // Update grids with loaded pieces
            updatePieceGrids();
          }
        } else {
          pieceModeDynamic.checked = true;
          preselectPiecesBlock.style.display = "none";
          selectedPieces = { expert: [], hard: [], medium: [], easy: Array.from({ length: 16 }, (_, i) => i) };
        }
      } else {
        qPrompt.value = q.prompt;
        rebusImage.value = "";
        rebusImagePreview.style.display = "none";
        rebusDropZone.style.display = "block";
        moviePosterUrl.value = "";
        movieImagePreview.style.display = "none";
        movieDropZone.style.display = "block";
      }
      
      qAnswer.value = q.correct_answer;
      qPoints.value = q.points;
      qTime.value = q.time_limit_seconds || "";
      choiceBlock.style.display = (q.type === "multiple_choice" || isRebusPuzzle) ? "block" : "none";
      rebusImageBlock.style.display = isRebusPuzzle ? "block" : "none";
      moviePosterBlock.style.display = isMovieTitle ? "block" : "none";
      difficultyBlock.style.display = isMovieTitle ? "block" : "none";
      textPromptBlock.style.display = (isRebusPuzzle || isMovieTitle) ? "none" : "block";
      
      // Update choice labels for rebus
      if (isRebusPuzzle) {
        choiceLabel.textContent = "Choices (A-D) - Text only";
        choiceHint.textContent = "Enter text answers only for Rebus Puzzle Game";
        choiceA.placeholder = "Choice A (text)";
        choiceB.placeholder = "Choice B (text)";
        choiceC.placeholder = "Choice C (text)";
        choiceD.placeholder = "Choice D (text)";
      } else {
        choiceLabel.textContent = "Choices (A-D) - Enter text or image URL";
        choiceHint.textContent = "For images, paste a URL (e.g., https://example.com/image.jpg)";
        choiceA.placeholder = "Choice A (text or image URL)";
        choiceB.placeholder = "Choice B (text or image URL)";
        choiceC.placeholder = "Choice C (text or image URL)";
        choiceD.placeholder = "Choice D (text or image URL)";
      }
      
      if ((q.type === "multiple_choice" || isRebusPuzzle) && q.choices) {
        [choiceA.value, choiceB.value, choiceC.value, choiceD.value] = q.choices;
      }
    });
  });

  questionTable.querySelectorAll("button[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete");
      await api(`/api/questions/${id}`, { method: "DELETE" });
      await loadQuestions();
    });
  });
}

async function loadTeams() {
  const teams = await api("/api/teams");
  if (!teams.length) {
    teamList.textContent = "No teams yet.";
  } else {
    teamList.innerHTML = "";
    teams.forEach((team) => {
      const joinUrl = `${window.location.origin}/join/${team.token}`;
      const wrapper = document.createElement("div");
      wrapper.className = "card";
      wrapper.style.margin = "12px 0";
      wrapper.innerHTML = `
        <div class="flex-row">
          <div>
            <strong>${team.name}</strong><br />
            <span class="muted">${joinUrl}</span>
          </div>
          <img class="qr" src="/api/qr/${team.token}?admin_password=${encodeURIComponent(adminPassword)}" alt="QR code" />
          <button class="ghost" data-release="${team.id}">Release Device</button>
          <button class="danger" data-delete-team="${team.id}">Delete</button>
        </div>
      `;
      teamList.appendChild(wrapper);
    });
  }

  adjustTeam.innerHTML = "";
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = team.id;
    option.textContent = team.name;
    adjustTeam.appendChild(option);
  });

  teamList.querySelectorAll("button[data-release]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-release");
      await api(`/api/teams/${id}/release`, { method: "POST" });
    });
  });

  teamList.querySelectorAll("button[data-delete-team]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete-team");
      if (confirm("Are you sure you want to delete this team and all their submissions?")) {
        await api(`/api/teams/${id}`, { method: "DELETE" });
        await loadTeams();
        await loadRankings();
      }
    });
  });
}

async function loadRankings() {
  const rankings = await api("/api/rankings");
  rankingsBody.innerHTML = "";
  rankings.forEach((team, idx) => {
    const seconds = (team.total_time_ms / 1000).toFixed(1);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${idx + 1}</td>
      <td>${team.name}</td>
      <td>${team.points}</td>
      <td>${seconds} sec</td>
    `;
    rankingsBody.appendChild(row);
  });
}

async function refreshSubmissions() {
  const state = await fetch("/api/state").then((r) => r.json());
  if (!state.current_question_id) {
    submissionBody.innerHTML = "<tr><td colspan='6'>No current question.</td></tr>";
    fastestBody.innerHTML = "<tr><td colspan='3'>No current question.</td></tr>";
    return;
  }
  const submissions = await api(`/api/submissions?question_id=${state.current_question_id}`);
  submissionBody.innerHTML = "";
  submissions.forEach((sub) => {
    const row = document.createElement("tr");
    const correctLabel = sub.is_correct === null ? "Pending" : sub.is_correct ? "Yes" : "No";
    const seconds = (sub.ms_since_open / 1000).toFixed(1);
    row.innerHTML = `
      <td>${sub.team_name}</td>
      <td>${sub.answer}</td>
      <td>${correctLabel}</td>
      <td>${seconds} sec</td>
      <td>${sub.points_awarded}</td>
      <td>
        <button data-mark="${sub.id}" data-correct="1">Correct</button>
        <button class="ghost" data-mark="${sub.id}" data-correct="0">Wrong</button>
      </td>
    `;
    submissionBody.appendChild(row);
  });

  const fastest = [...submissions].sort((a, b) => a.ms_since_open - b.ms_since_open).slice(0, 5);
  fastestBody.innerHTML = "";
  fastest.forEach((sub) => {
    const row = document.createElement("tr");
    const time = new Date(sub.submitted_at).toLocaleTimeString();
    const seconds = (sub.ms_since_open / 1000).toFixed(1);
    row.innerHTML = `
      <td>${sub.team_name}</td>
      <td>${seconds} sec</td>
      <td>${time}</td>
    `;
    fastestBody.appendChild(row);
  });

  submissionBody.querySelectorAll("button[data-mark]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-mark");
      const correct = btn.getAttribute("data-correct") === "1";
      await api(`/api/submissions/${id}/mark`, {
        method: "POST",
        body: JSON.stringify({ is_correct: correct }),
      });
      await refreshSubmissions();
    });
  });
}

async function loadAll() {
  if (!adminPassword) {
    setAuth(false);
    return;
  }
  await Promise.all([loadQuestions(), loadTeams(), loadRankings(), refreshSubmissions(), loadSettings()]);
}

async function loadSettings() {
  try {
    const settings = await api("/api/settings");
    if (settings.points_mode === "ranked") {
      pointsModeRanked.checked = true;
    } else {
      pointsModeEqual.checked = true;
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

socket.on("state_update", (state) => {
  const status = state.is_open ? "OPEN" : "CLOSED";
  stateBanner.textContent = state.question
    ? `Current: #${state.question.id} (${status})` + (state.reveal_answer ? ` | Answer: ${state.question.correct_answer}` : "")
    : "No current question";
  stateBanner.classList.toggle("error", !state.question);
  
  // Show/hide movie difficulty controls based on question type
  if (state.question && state.question.type === "movie_title") {
    movieDifficultyControls.style.display = "flex";
    const difficulty = state.current_difficulty || "expert";
    const difficultyPoints = {
      expert: 15,
      hard: 10,
      medium: 5,
      easy: 2
    };
    currentDifficultyLabel.textContent = `Current: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} (${difficultyPoints[difficulty]} pts)`;
    lowerDifficulty.disabled = difficulty === "easy";
    
    // Show customize pieces button only for dynamic mode
    if (state.question.piece_mode === "dynamic") {
      customizePieces.style.display = "inline-block";
    } else {
      customizePieces.style.display = "none";
    }
  } else {
    movieDifficultyControls.style.display = "none";
    customizePieces.style.display = "none";
  }
  
  // Store current state for the customizer
  gameState = state;
  
  if (state.current_question_id !== lastStateSnapshot.current_question_id) {
    playSfx("set");
  }
  if (state.is_open && !lastStateSnapshot.is_open) {
    playSfx("open");
  }
  if (!state.is_open && lastStateSnapshot.is_open) {
    playSfx("close");
  }
  if (state.reveal_answer && !lastStateSnapshot.reveal_answer) {
    playSfx("reveal");
  }
  lastStateSnapshot = {
    current_question_id: state.current_question_id,
    is_open: state.is_open,
    reveal_answer: state.reveal_answer,
  };
  refreshSubmissions();
});

socket.on("rankings_update", () => {
  loadRankings();
});

socket.on("submission_received", () => {
  playSfx("submit");
  refreshSubmissions();
});

loadAll();

async function loadAllSubmissions() {
  if (!allSubmissionsBody) return;
  allSubmissionsBody.innerHTML = "<tr><td colspan='6'>Loading...</td></tr>";
  try {
    const submissions = await api("/api/all_submissions");
    
    allSubmissionsBody.innerHTML = "";
    if (submissions.length === 0) {
      allSubmissionsBody.innerHTML = "<tr><td colspan='6'>No submissions found.</td></tr>";
      return;
    }

    submissions.forEach(sub => {
      const row = document.createElement("tr");
      const date = new Date(sub.submitted_at).toLocaleTimeString();
      row.innerHTML = `
        <td>${date}</td>
        <td>${sub.team_name || "Unknown Team"}</td>
        <td>${sub.question_prompt || "Unknown Question"}</td>
        <td>${sub.answer}</td>
        <td>${sub.is_correct ? "✅" : (sub.is_correct === 0 ? "❌" : "Pending")}</td>
        <td>
          <button class="danger small" onclick="deleteSubmission(${sub.id})">Delete</button>
        </td>
      `;
      allSubmissionsBody.appendChild(row);
    });
  } catch (err) {
    console.error(err);
    allSubmissionsBody.innerHTML = "<tr><td colspan='6'>Error loading submissions.</td></tr>";
  }
}

async function deleteSubmission(id) {
  if (!confirm("Delete this submission?")) return;
  try {
    await api(`/api/submission/${id}`, { method: "DELETE" });
    loadAllSubmissions();
  } catch (err) {
    alert("Failed to delete submission");
  }
}

if (refreshSubmissionsBtn) {
  refreshSubmissionsBtn.addEventListener("click", loadAllSubmissions);
}

if (clearAllSubmissions) {
  clearAllSubmissions.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to delete ALL submissions? This cannot be undone.")) return;
    try {
      await api("/api/all_submissions", { method: "DELETE" });
      loadAllSubmissions();
    } catch (err) {
      alert("Failed to clear submissions");
    }
  });
}

window.deleteSubmission = deleteSubmission;

