const socket = io();

const banner = document.getElementById("banner");
const teamName = document.getElementById("teamName");
const questionArea = document.getElementById("questionArea");
const answerArea = document.getElementById("answerArea");
const submitAnswer = document.getElementById("submitAnswer");
const submitStatus = document.getElementById("submitStatus");
const openStatus = document.getElementById("openStatus");
const rankingsBody = document.getElementById("rankingsBody");

const token = window.location.pathname.split("/").pop();
const timerDisplay = document.getElementById("timerDisplay");
let currentQuestion = null;
let submitted = false;
let submittedAnswer = "";
let selectedChoice = null;
let lastState = { is_open: false, reveal_answer: false };
let lastDifficulty = null;
let timerInterval = null;
let questionOpenedAt = null;
let countdownAudio = null;
let currentAudioSpeed = 1; // Will be updated from admin

function setBanner(text, type = "") {
  banner.textContent = text;
  banner.classList.toggle("error", type === "error");
}

async function joinTeam() {
  const resp = await fetch(`/api/join/${token}`, { method: "POST" });
  const data = await resp.json();
  if (!resp.ok) {
    if (data.error === "in_use") {
      setBanner("Team already in use on another device. Ask admin to release.", "error");
    } else {
      setBanner("Invalid or expired team token.", "error");
    }
    submitAnswer.disabled = true;
    return;
  }
  teamName.textContent = data.team.name;
  submitted = data.submitted_for_current;
  setBanner("Connected. Waiting for question.");
  loadState();
}

async function loadState() {
  const state = await fetch("/api/state").then((r) => r.json());
  currentQuestion = state.question;
  updateQuestion(state);
  
  // Load initial rankings
  const rankings = await fetch("/api/rankings").then((r) => r.json());
  updateRankings(rankings);
}

function updateRankings(rankings) {
  if (!rankingsBody) return;
  rankingsBody.innerHTML = "";
  if (!rankings || rankings.length === 0) {
    rankingsBody.innerHTML = '<tr><td colspan="3" class="muted">No teams yet</td></tr>';
    return;
  }
  rankings.forEach((team, idx) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${idx + 1}</td>
      <td>${team.name}</td>
      <td>${team.points}</td>
    `;
    rankingsBody.appendChild(row);
  });
}

function updateQuestion(state) {
  lastState = state;
  currentQuestion = state.question;
  
  // Clear existing timer
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // Stop countdown audio
  if (countdownAudio) {
    countdownAudio.pause();
    countdownAudio = null;
  }
  
  if (!currentQuestion) {
    questionArea.innerHTML = `<p class="muted">No question yet.</p>`;
    answerArea.innerHTML = "";
    submitAnswer.disabled = true;
    openStatus.textContent = "Waiting";
    timerDisplay.style.display = "none";
    return;
  }
  
  // Display rebus puzzle image as the main prompt
  if (currentQuestion.type === "rebus_puzzle" && currentQuestion.rebus_image_url) {
    questionArea.innerHTML = `
      <div style="margin: 20px 0; text-align: center;">
        <img src="${currentQuestion.rebus_image_url}" alt="Rebus Puzzle" style="max-width: 100%; max-height: 400px; border-radius: 8px;" />
      </div>
      <p class="muted">Points: ${currentQuestion.points}</p>
    `;
  } else if (currentQuestion.type === "movie_title" && (currentQuestion.rebus_image_url || currentQuestion.prompt.startsWith("data:image/"))) {
    // Display movie poster as 4x4 puzzle grid
    // Use current_difficulty from state instead of question difficulty
    const imageUrl = currentQuestion.rebus_image_url || currentQuestion.prompt;
    const difficulty = state.current_difficulty || "expert";
    const difficultyPieces = {
      expert: 1,
      hard: 3,
      medium: 7,
      easy: 16
    };
    const difficultyPoints = {
      expert: 15,
      hard: 10,
      medium: 5,
      easy: 2
    };
    const piecesToShow = difficultyPieces[difficulty] || 16;
    const currentPoints = difficultyPoints[difficulty] || 2;
    
    let visibleIndices = [];
    
    // Check piece mode - preselect vs dynamic
    if (currentQuestion.piece_mode === "preselect" && currentQuestion.selected_pieces_json) {
      // Use pre-selected pieces from question
      console.log("Preselect mode detected");
      console.log("Selected pieces JSON:", currentQuestion.selected_pieces_json);
      const selectedPieces = JSON.parse(currentQuestion.selected_pieces_json);
      console.log("Parsed pieces:", selectedPieces);
      console.log("Current difficulty:", difficulty);
      const difficultyKey = difficulty;
      
      // For pre-selected mode, show cumulative pieces based on difficulty
      if (difficultyKey === "easy" && selectedPieces.easy && selectedPieces.easy.length > 0) {
        visibleIndices = selectedPieces.easy;
      } else if (difficultyKey === "medium" && selectedPieces.medium && selectedPieces.medium.length > 0) {
        visibleIndices = selectedPieces.medium;
      } else if (difficultyKey === "hard" && selectedPieces.hard && selectedPieces.hard.length > 0) {
        visibleIndices = selectedPieces.hard;
      } else if (difficultyKey === "expert" && selectedPieces.expert && selectedPieces.expert.length > 0) {
        visibleIndices = selectedPieces.expert;
      }
      console.log("Visible indices from preselect:", visibleIndices);
    } else if (currentQuestion.piece_mode === "dynamic") {
      // Use custom pieces from game state (set during gameplay)
      // For dynamic mode, always use custom_pieces_json (even if empty array = no pieces)
      if (state.custom_pieces_json) {
        visibleIndices = JSON.parse(state.custom_pieces_json);
        console.log("Dynamic mode - custom pieces:", visibleIndices);
      } else {
        // If somehow custom_pieces_json doesn't exist, show no pieces
        visibleIndices = [];
      }
    } else {
      // Fallback to seeded random (for old questions without piece_mode)
      // Seeded random function for consistent piece selection
      const seededRandom = (seed) => {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };
      
      // Generate a shuffled array of all piece indices based on question ID
      // This ensures the same question always reveals pieces in the same order
      const seed = currentQuestion.id * 1000;
      const allIndices = Array.from({ length: 16 }, (_, i) => i);
      const shuffledIndices = [];
      
      // Fisher-Yates shuffle with seeded random
      for (let i = 0; i < 16; i++) {
        const randomValue = seededRandom(seed + i);
        const randomIndex = Math.floor(randomValue * allIndices.length);
        shuffledIndices.push(allIndices.splice(randomIndex, 1)[0]);
      }
      
      // Take only the first N pieces based on difficulty
      // This ensures pieces are cumulative - lower difficulties just show more of the same order
      visibleIndices = shuffledIndices.slice(0, piecesToShow);
    }
    
    questionArea.innerHTML = `
      <div class="movie-puzzle-container">
        <h3>Guess the Movie Title</h3>
        <p class="muted">Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} | Points: ${currentPoints}</p>
        <div class="movie-puzzle-grid" id="moviePuzzleGrid"></div>
      </div>
    `;
    
    // Create puzzle pieces
    const grid = document.getElementById("moviePuzzleGrid");
    for (let i = 0; i < 16; i++) {
      const piece = document.createElement("div");
      piece.className = "movie-puzzle-piece";
      
      if (visibleIndices.includes(i)) {
        const row = Math.floor(i / 4);
        const col = i % 4;
        piece.style.backgroundImage = `url(${imageUrl})`;
        piece.style.backgroundPosition = `${col * 33.333}% ${row * 33.333}%`;
      } else {
        piece.classList.add("hidden");
      }
      
      grid.appendChild(piece);
    }
  } else {
    questionArea.innerHTML = `
      <h3>${currentQuestion.prompt}</h3>
      <p class="muted">Points: ${currentQuestion.points}</p>
    `;
  }
  
  if (state.reveal_answer) {
    questionArea.innerHTML += `<p class="muted">Answer: ${currentQuestion.correct_answer}</p>`;
  }
  openStatus.textContent = state.is_open ? "Open" : "Closed";
  openStatus.classList.toggle("closed", !state.is_open);

  if (!state.is_open) {
    submitAnswer.disabled = true;
  }
  
  // Handle timer for questions with time limits
  if (currentQuestion.time_limit_seconds && state.is_open) {
    questionOpenedAt = state.opened_at || Date.now();
    startTimer(currentQuestion.time_limit_seconds);
  } else {
    timerDisplay.style.display = "none";
  }

  renderAnswerInputs();
  updateSubmitStatus(state);
}

function startTimer(limitSeconds) {
  timerDisplay.style.display = "block";
  
  // Play countdown audio based on time limit
  if (countdownAudio) {
    countdownAudio.pause();
    countdownAudio = null;
  }
  
  const audioFile = limitSeconds === 10 ? "/audio/10-sec-countdown.mp3" : 
                    limitSeconds === 20 ? "/audio/20-sec-countdown.mp3" : null;
  
  if (audioFile) {
    countdownAudio = new Audio(audioFile);
    countdownAudio.volume = 0.7;
    countdownAudio.playbackRate = currentAudioSpeed;
    countdownAudio.play().catch(() => {
      // Audio play blocked, ignore
    });
  }
  
  function updateTimerDisplay() {
    const elapsed = Date.now() - questionOpenedAt;
    const remaining = Math.max(0, limitSeconds * 1000 - elapsed);
    const seconds = Math.floor(remaining / 1000);
    const ms = remaining % 1000;
    
    timerDisplay.textContent = `Time: ${seconds}s ${ms}ms`;
    
    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerDisplay.textContent = "Time's up!";
      timerDisplay.classList.add("error");
      if (countdownAudio) {
        countdownAudio.pause();
        countdownAudio = null;
      }
    } else if (remaining <= 5000) {
      timerDisplay.classList.add("error");
    } else {
      timerDisplay.classList.remove("error");
    }
  }
  
  updateTimerDisplay();
  timerInterval = setInterval(updateTimerDisplay, 50);
}

function renderAnswerInputs() {
  if (!currentQuestion) return;
  selectedChoice = null;
  if (currentQuestion.type === "multiple_choice" || currentQuestion.type === "rebus_puzzle") {
    const choices = currentQuestion.choices || [];
    const isRebusPuzzle = currentQuestion.type === "rebus_puzzle";
    
    // Helper function to check if choice is an image URL
    const isImageUrl = (str) => {
      return str && /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(str) || str.startsWith('data:image/');
    };
    
    answerArea.innerHTML = `
      <div class="choice-grid">
        ${choices
          .map(
            (choice, idx) => {
              const letter = String.fromCharCode(65 + idx);
              // For rebus puzzles, always show text only
              if (!isRebusPuzzle && isImageUrl(choice)) {
                return `<button type="button" data-choice="${choice}" class="choice-image">
                  <span class="choice-letter">${letter}</span>
                  <img src="${choice}" alt="Choice ${letter}" />
                </button>`;
              } else {
                return `<button type="button" data-choice="${choice}">${letter}. ${choice}</button>`;
              }
            }
          )
          .join("")}
      </div>
    `;
    answerArea.querySelectorAll("button[data-choice]").forEach((btn) => {
      btn.addEventListener("click", () => {
        answerArea.querySelectorAll("button[data-choice]").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedChoice = btn.getAttribute("data-choice");
      });
    });
  } else {
    // Text input for text questions and movie_title questions
    const isMovieTitle = currentQuestion.type === "movie_title";
    answerArea.innerHTML = `
      <input id="textAnswer" placeholder="Type your answer" style="width: 100%;" />
      ${isMovieTitle ? '<div id="buttonRow" style="display: flex; gap: 10px; margin-top: 10px;"><button id="submitAnswer2" style="flex: 1;">Submit</button><button type="button" id="passButton" class="ghost" style="flex: 1;">Pass, I don\'t know the answer</button></div>' : ''}
    `;
    
    // Add pass button handler for movie_title
    if (isMovieTitle) {
      const passButton = document.getElementById("passButton");
      const submitAnswer2 = document.getElementById("submitAnswer2");
      
      // Hide the main submit button and use the one in the button row
      submitAnswer.style.display = "none";
      
      if (passButton) {
        passButton.addEventListener("click", async () => {
          if (submitted) return;
          
          const resp = await fetch("/api/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, answer: "Pass" }),
          });
          const data = await resp.json();
          if (!resp.ok) {
            setBanner("Unable to pass. " + (data.error || ""), "error");
            return;
          }
          submitted = true;
          submittedAnswer = "Pass";
          setBanner("Passed!", "");
          updateSubmitStatus({ is_open: true });
        });
      }
      
      if (submitAnswer2) {
        submitAnswer2.addEventListener("click", async () => {
          const input = document.getElementById("textAnswer");
          const answer = input ? input.value.trim() : "";
          if (!answer) {
            setBanner("Please provide an answer before submitting.", "error");
            return;
          }
          const resp = await fetch("/api/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, answer }),
          });
          const data = await resp.json();
          if (!resp.ok) {
            setBanner("Unable to submit. " + (data.error || ""), "error");
            return;
          }
          submitted = true;
          submittedAnswer = answer;
          setBanner("Submitted!", "");
          updateSubmitStatus({ is_open: true });
        });
      }
    } else {
      // Show the main submit button for non-movie questions
      submitAnswer.style.display = "inline-block";
    }
  }
}

function updateSubmitStatus(state) {
  if (submitted) {
    const answerText = submittedAnswer ? `Answer submitted: "${submittedAnswer}". ` : "Answer submitted. ";
    submitStatus.textContent = state.is_open
      ? answerText + "Waiting for close."
      : answerText + "Question closed.";
    submitAnswer.disabled = true;
    setInputsDisabled(true);
  } else {
    submitStatus.textContent = state.is_open ? "Ready to submit." : "Question closed.";
    submitAnswer.disabled = !state.is_open;
    setInputsDisabled(!state.is_open);
  }
}

function setInputsDisabled(disabled) {
  if (currentQuestion?.type === "multiple_choice" || currentQuestion?.type === "rebus_puzzle") {
    answerArea.querySelectorAll("button[data-choice]").forEach((btn) => {
      btn.disabled = disabled;
    });
  } else {
    const input = document.getElementById("textAnswer");
    if (input) input.disabled = disabled;
    const passButton = document.getElementById("passButton");
    if (passButton) passButton.disabled = disabled;
    const submitAnswer2 = document.getElementById("submitAnswer2");
    if (submitAnswer2) submitAnswer2.disabled = disabled;
  }
}

submitAnswer.addEventListener("click", async () => {
  if (!currentQuestion) return;
  let answer = "";
  if (currentQuestion.type === "multiple_choice" || currentQuestion.type === "rebus_puzzle") {
    answer = selectedChoice || "";
  } else {
    // Handle text input for text questions and movie_title questions
    const input = document.getElementById("textAnswer");
    answer = input ? input.value.trim() : "";
  }
  if (!answer) {
    setBanner("Please provide an answer before submitting.", "error");
    return;
  }
  const resp = await fetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, answer }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    setBanner("Unable to submit. " + (data.error || ""), "error");
    return;
  }
  submitted = true;
  submittedAnswer = answer;
  setBanner("Submitted!", "");
  updateSubmitStatus({ is_open: true });
});

socket.on("state_update", (state) => {
  // Store previous state before updating
  const wasOpen = lastState.is_open;
  
  if (currentQuestion && state.question && currentQuestion.id !== state.question.id) {
    submitted = false;
    submittedAnswer = "";
    lastDifficulty = null;
  }
  
  // For Movie Title questions, handle difficulty changes and question opening
  if (currentQuestion && state.question && 
      currentQuestion.id === state.question.id && 
      currentQuestion.type === "movie_title") {
    
    // Initialize lastDifficulty if not set
    if (lastDifficulty === null) {
      lastDifficulty = state.current_difficulty;
    }
    
    // Check if difficulty was lowered OR if question just opened with lowered difficulty
    const difficultyChanged = state.current_difficulty !== lastDifficulty;
    const questionJustOpened = state.is_open && !wasOpen;
    const difficultyLowered = state.current_difficulty !== "expert" && questionJustOpened;
    
    if ((difficultyChanged || difficultyLowered) && state.is_open && !state.reveal_answer) {
      // If participant submitted (either passed or got it wrong), allow them to answer again
      if (submitted) {
        submitted = false;
        const previousAnswer = submittedAnswer;
        submittedAnswer = "";
        if (previousAnswer === "Pass") {
          setBanner("Difficulty lowered! You can answer again.", "");
        } else {
          setBanner("Difficulty lowered! You can submit a new answer.", "");
        }
      }
    }
    
    // Update lastDifficulty
    if (difficultyChanged) {
      lastDifficulty = state.current_difficulty;
    }
  }
  
  updateQuestion(state);
  
  // Update playback rate if countdown audio is currently playing
  if (countdownAudio && !countdownAudio.paused) {
    countdownAudio.playbackRate = currentAudioSpeed;
  }
});

socket.on("rankings_update", (rankings) => {
  if (!rankingsBody) return;
  rankingsBody.innerHTML = "";
  if (!rankings || rankings.length === 0) {
    rankingsBody.innerHTML = '<tr><td colspan="3" class="muted">No teams yet</td></tr>';
    return;
  }
  rankings.forEach((team, idx) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${idx + 1}</td>
      <td>${team.name}</td>
      <td>${team.points}</td>
    `;
    rankingsBody.appendChild(row);
  });
});

joinTeam();
