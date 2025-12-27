require('dotenv').config();

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const http = require("http");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");
const Database = require("better-sqlite3");
const QRCode = require("qrcode");

const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "quizbee.db");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

let autoCloseTimeout = null;

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// Set proper MIME types for static files
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    device_id TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    total_time_ms INTEGER NOT NULL DEFAULT 0,
    last_submission_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    choices_json TEXT,
    correct_answer TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    time_limit_seconds INTEGER,
    rebus_image_url TEXT,
    piece_mode TEXT DEFAULT 'dynamic',
    selected_pieces_json TEXT
  );
  CREATE TABLE IF NOT EXISTS game_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_question_id INTEGER,
    is_open INTEGER NOT NULL DEFAULT 0,
    opened_at INTEGER,
    reveal_answer INTEGER NOT NULL DEFAULT 0,
    current_difficulty TEXT DEFAULT 'expert',
    custom_pieces_json TEXT
  );
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer TEXT NOT NULL,
    is_correct INTEGER,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    submitted_at INTEGER NOT NULL,
    ms_since_open INTEGER NOT NULL,
    UNIQUE(team_id, question_id)
  );
`);

// Migration: Add rebus_image_url column if it doesn't exist
try {
  const columns = db.pragma("table_info(questions)");
  const hasRebusColumn = columns.some(col => col.name === "rebus_image_url");
  if (!hasRebusColumn) {
    db.prepare("ALTER TABLE questions ADD COLUMN rebus_image_url TEXT").run();
    console.log("Migrated database: Added rebus_image_url column to questions table");
  }
  const hasDifficultyColumn = columns.some(col => col.name === "difficulty");
  if (!hasDifficultyColumn) {
    db.prepare("ALTER TABLE questions ADD COLUMN difficulty TEXT").run();
    console.log("Migrated database: Added difficulty column to questions table");
  }
} catch (err) {
  console.error("Migration error:", err);
}

// Migration: Add current_difficulty column to game_state if it doesn't exist
try {
  const stateColumns = db.pragma("table_info(game_state)");
  const hasCurrentDifficulty = stateColumns.some(col => col.name === "current_difficulty");
  if (!hasCurrentDifficulty) {
    db.prepare("ALTER TABLE game_state ADD COLUMN current_difficulty TEXT DEFAULT 'expert'").run();
    console.log("Migrated database: Added current_difficulty column to game_state table");
  }
  const hasCustomPieces = stateColumns.some(col => col.name === "custom_pieces_json");
  if (!hasCustomPieces) {
    db.prepare("ALTER TABLE game_state ADD COLUMN custom_pieces_json TEXT").run();
    console.log("Migrated database: Added custom_pieces_json column to game_state table");
  }
  const hasPointsMode = stateColumns.some(col => col.name === "points_mode");
  if (!hasPointsMode) {
    db.prepare("ALTER TABLE game_state ADD COLUMN points_mode TEXT DEFAULT 'equal'").run();
    console.log("Migrated database: Added points_mode column to game_state table");
  }
} catch (err) {
  console.error("Migration error:", err);
}

// Migration: Add piece_mode and selected_pieces_json columns to questions if they don't exist
try {
  const questionColumns = db.pragma("table_info(questions)");
  const hasPieceMode = questionColumns.some(col => col.name === "piece_mode");
  if (!hasPieceMode) {
    db.prepare("ALTER TABLE questions ADD COLUMN piece_mode TEXT DEFAULT 'dynamic'").run();
    console.log("Migrated database: Added piece_mode column to questions table");
  }
  const hasSelectedPieces = questionColumns.some(col => col.name === "selected_pieces_json");
  if (!hasSelectedPieces) {
    db.prepare("ALTER TABLE questions ADD COLUMN selected_pieces_json TEXT").run();
    console.log("Migrated database: Added selected_pieces_json column to questions table");
  }
} catch (err) {
  console.error("Migration error:", err);
}

const ensureGameState = db.prepare(
  "INSERT OR IGNORE INTO game_state (id, current_question_id, is_open, opened_at, reveal_answer, current_difficulty, custom_pieces_json, points_mode) VALUES (1, NULL, 0, NULL, 0, 'expert', NULL, 'equal')"
);
ensureGameState.run();

function nowMs() {
  return Date.now();
}

function normalizeText(text) {
  return String(text || "").trim().toLowerCase();
}

function getGameState() {
  return db.prepare("SELECT * FROM game_state WHERE id = 1").get();
}

function getCurrentQuestion() {
  const state = getGameState();
  if (!state.current_question_id) return null;
  return db.prepare("SELECT * FROM questions WHERE id = ?").get(state.current_question_id);
}

function buildStatePayload() {
  const state = getGameState();
  const question = state.current_question_id
    ? db.prepare("SELECT * FROM questions WHERE id = ?").get(state.current_question_id)
    : null;
  return {
    current_question_id: state.current_question_id,
    is_open: !!state.is_open,
    opened_at: state.opened_at,
    reveal_answer: !!state.reveal_answer,
    current_difficulty: state.current_difficulty || "expert",
    custom_pieces_json: state.custom_pieces_json,
    question: question
      ? {
          id: question.id,
          type: question.type,
          prompt: question.prompt,
          choices: question.choices_json ? JSON.parse(question.choices_json) : null,
          correct_answer: question.correct_answer,
          points: question.points,
          time_limit_seconds: question.time_limit_seconds,
          rebus_image_url: question.rebus_image_url,
          difficulty: question.difficulty,
          piece_mode: question.piece_mode,
          selected_pieces_json: question.selected_pieces_json,
        }
      : null,
  };
}

function computeRankings() {
  const rows = db
    .prepare(
      `SELECT id, name, points, total_time_ms, last_submission_at
       FROM teams
       ORDER BY points DESC, total_time_ms ASC, last_submission_at ASC, name ASC`
    )
    .all();
  return rows;
}

function recomputeTeamStats() {
  db.prepare("UPDATE teams SET points = 0, total_time_ms = 0, last_submission_at = NULL").run();

  const rows = db
    .prepare(
      `SELECT team_id,
              SUM(points_awarded) AS points,
              SUM(ms_since_open) AS total_time_ms,
              MAX(submitted_at) AS last_submission_at
       FROM submissions
       GROUP BY team_id`
    )
    .all();

  const update = db.prepare(
    "UPDATE teams SET points = ?, total_time_ms = ?, last_submission_at = ? WHERE id = ?"
  );
  for (const row of rows) {
    update.run(row.points || 0, row.total_time_ms || 0, row.last_submission_at, row.team_id);
  }
}

function emitState() {
  io.emit("state_update", buildStatePayload());
}

function emitRankings() {
  io.emit("rankings_update", computeRankings());
}

function requireAdmin(req, res, next) {
  const provided = req.header("x-admin-password") || req.query.admin_password || "";
  if (provided !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "unauthorized" });
  }
  return next();
}

function ensureDeviceId(req, res, next) {
  let deviceId = req.cookies.qb_device;
  if (!deviceId) {
    deviceId = crypto.randomBytes(16).toString("hex");
    res.cookie("qb_device", deviceId, { httpOnly: true, sameSite: "lax" });
  }
  req.deviceId = deviceId;
  next();
}

function bindTeamToDevice(token, deviceId) {
  const team = db.prepare("SELECT * FROM teams WHERE token = ?").get(token);
  if (!team) {
    return { ok: false, reason: "invalid_token" };
  }
  if (team.device_id && team.device_id !== deviceId) {
    return { ok: false, reason: "in_use", team };
  }
  if (!team.device_id) {
    db.prepare("UPDATE teams SET device_id = ? WHERE id = ?").run(deviceId, team.id);
  }
  return { ok: true, team };
}

function gradeCurrentQuestion() {
  const state = getGameState();
  if (!state.current_question_id) return;

  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(state.current_question_id);
  if (!question) return;

  const submissions = db
    .prepare("SELECT * FROM submissions WHERE question_id = ? AND is_correct IS NULL ORDER BY submitted_at ASC")
    .all(question.id);

  const updateSubmission = db.prepare(
    "UPDATE submissions SET is_correct = ?, points_awarded = ? WHERE id = ?"
  );
  const updateTeamPoints = db.prepare("UPDATE teams SET points = points + ? WHERE id = ?");

  // Calculate points based on difficulty for movie_title questions
  let questionPoints = question.points;
  if (question.type === "movie_title") {
    const difficulty = state.current_difficulty || "expert";
    const difficultyPoints = {
      expert: 15,
      hard: 10,
      medium: 5,
      easy: 2
    };
    questionPoints = difficultyPoints[difficulty] || question.points;
  }

  // Get points mode setting
  const pointsMode = state.points_mode || "equal";
  let correctCount = 0;

  for (const sub of submissions) {
    let isCorrect = false;
    if (question.type === "multiple_choice") {
      isCorrect = String(sub.answer) === String(question.correct_answer);
    } else if (question.type === "rebus_puzzle") {
      // For rebus puzzles, accept both letter choices (A, B, C, D) and the full answer
      const normalizedAnswer = normalizeText(sub.answer);
      const normalizedCorrect = normalizeText(question.correct_answer);
      const letterAnswer = normalizedAnswer.toUpperCase();
      
      // Check if answer matches the full correct answer or is a valid letter choice
      if (normalizedAnswer === normalizedCorrect) {
        isCorrect = true;
      } else if (["A", "B", "C", "D"].includes(letterAnswer)) {
        // Check if the letter corresponds to the correct choice
        try {
          const choices = JSON.parse(question.choices_json || "[]");
          const letterIndex = letterAnswer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
          if (letterIndex >= 0 && letterIndex < choices.length) {
            const choiceText = normalizeText(choices[letterIndex]);
            isCorrect = choiceText === normalizedCorrect;
          }
        } catch (e) {
          // If choices can't be parsed, just compare with correct answer
          isCorrect = false;
        }
      }
    } else {
      isCorrect = normalizeText(sub.answer) === normalizeText(question.correct_answer);
    }
    
    // Calculate points based on mode
    let points = 0;
    if (isCorrect) {
      if (pointsMode === "ranked") {
        // Ranked mode: First correct gets full points, each subsequent gets 1 less (minimum 1)
        points = Math.max(1, questionPoints - correctCount);
        correctCount++;
      } else {
        // Equal mode: All correct answers get same points
        points = questionPoints;
      }
    }
    
    updateSubmission.run(isCorrect ? 1 : 0, points, sub.id);
    if (points !== 0) {
      updateTeamPoints.run(points, sub.team_id);
    }
  }
}

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/join/:token", ensureDeviceId, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "participant.html"));
});

app.get("/api/state", (req, res) => {
  res.json(buildStatePayload());
});

app.get("/api/qr/:token", requireAdmin, async (req, res) => {
  const token = req.params.token;
  const joinUrl = `${req.protocol}://${req.get("host")}/join/${token}`;
  try {
    const dataUrl = await QRCode.toDataURL(joinUrl);
    const base64 = dataUrl.split(",")[1];
    const img = Buffer.from(base64, "base64");
    res.setHeader("Content-Type", "image/png");
    res.send(img);
  } catch (err) {
    res.status(500).json({ error: "qr_failed" });
  }
});

app.post("/api/join/:token", ensureDeviceId, (req, res) => {
  const token = req.params.token;
  const result = bindTeamToDevice(token, req.deviceId);
  if (!result.ok) {
    return res.status(403).json({ error: result.reason });
  }
  const state = getGameState();
  let submitted = false;
  if (state.current_question_id) {
    const row = db
      .prepare("SELECT id FROM submissions WHERE team_id = ? AND question_id = ?")
      .get(result.team.id, state.current_question_id);
    submitted = !!row;
  }
  res.json({
    team: {
      id: result.team.id,
      name: result.team.name,
      token: result.team.token,
    },
    submitted_for_current: submitted,
  });
});

app.post("/api/submit", ensureDeviceId, (req, res) => {
  const { token, answer } = req.body || {};
  if (!token || typeof answer !== "string") {
    return res.status(400).json({ error: "invalid_payload" });
  }
  const result = bindTeamToDevice(token, req.deviceId);
  if (!result.ok) {
    return res.status(403).json({ error: result.reason });
  }
  const state = getGameState();
  if (!state.current_question_id || !state.is_open || !state.opened_at) {
    return res.status(400).json({ error: "question_not_open" });
  }
  const existing = db
    .prepare("SELECT id, answer, is_correct FROM submissions WHERE team_id = ? AND question_id = ?")
    .get(result.team.id, state.current_question_id);
  
  // Allow resubmission if:
  // 1. Previous answer was "Pass"
  // 2. Previous answer was incorrect (is_correct = 0)
  // 3. Previous answer hasn't been graded yet (is_correct = NULL) and was "Pass"
  if (existing) {
    const canResubmit = existing.answer === "Pass" || existing.is_correct === 0;
    if (!canResubmit) {
      return res.status(409).json({ error: "already_submitted" });
    }
  }
  
  const submittedAt = nowMs();
  const msSinceOpen = Math.max(0, submittedAt - state.opened_at);
  
  if (existing) {
    // Update the existing submission (Pass or incorrect answer)
    db.prepare(
      `UPDATE submissions 
       SET answer = ?, submitted_at = ?, ms_since_open = ?, is_correct = NULL, points_awarded = 0
       WHERE id = ?`
    ).run(answer, submittedAt, msSinceOpen, existing.id);
    
    // Update team's total time
    db.prepare(
      "UPDATE teams SET total_time_ms = total_time_ms + ?, last_submission_at = ? WHERE id = ?"
    ).run(msSinceOpen, submittedAt, result.team.id);
    
    const submission = db.prepare("SELECT * FROM submissions WHERE id = ?").get(existing.id);
    io.emit("submission_received", submission);
    emitRankings();
  } else {
    // Create new submission
    const stmt = db.prepare(
      `INSERT INTO submissions (team_id, question_id, answer, is_correct, points_awarded, submitted_at, ms_since_open)
       VALUES (?, ?, ?, NULL, 0, ?, ?)`
    );
    const info = stmt.run(result.team.id, state.current_question_id, answer, submittedAt, msSinceOpen);

    db.prepare(
      "UPDATE teams SET total_time_ms = total_time_ms + ?, last_submission_at = ? WHERE id = ?"
    ).run(msSinceOpen, submittedAt, result.team.id);

    const submission = db.prepare("SELECT * FROM submissions WHERE id = ?").get(info.lastInsertRowid);
    io.emit("submission_received", submission);
    emitRankings();
  }

  res.json({ ok: true });
});

app.get("/api/questions", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM questions ORDER BY id ASC").all();
  res.json(rows.map((q) => ({
    ...q,
    choices: q.choices_json ? JSON.parse(q.choices_json) : null,
  })));
});

app.post("/api/questions", requireAdmin, (req, res) => {
  const { type, prompt, choices, correct_answer, points, time_limit_seconds, rebus_image_url, difficulty, piece_mode, selected_pieces_json } = req.body || {};
  if (!type || !prompt || !correct_answer || typeof points !== "number") {
    return res.status(400).json({ error: "invalid_payload" });
  }
  if ((type === "multiple_choice" || type === "rebus_puzzle") && (!Array.isArray(choices) || choices.length !== 4)) {
    return res.status(400).json({ error: "choices_required" });
  }
  const stmt = db.prepare(
    `INSERT INTO questions (type, prompt, choices_json, correct_answer, points, time_limit_seconds, rebus_image_url, difficulty, piece_mode, selected_pieces_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const info = stmt.run(
    type,
    prompt,
    (type === "multiple_choice" || type === "rebus_puzzle") ? JSON.stringify(choices) : null,
    correct_answer,
    points,
    time_limit_seconds || null,
    (type === "rebus_puzzle" || type === "movie_title") ? (rebus_image_url || null) : null,
    type === "movie_title" ? (difficulty || null) : null,
    type === "movie_title" ? (piece_mode || "dynamic") : null,
    type === "movie_title" ? (selected_pieces_json || null) : null
  );
  res.json({ id: info.lastInsertRowid });
  emitState();
});

app.put("/api/questions/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { type, prompt, choices, correct_answer, points, time_limit_seconds, rebus_image_url, difficulty, piece_mode, selected_pieces_json } = req.body || {};
  if (!id || !type || !prompt || !correct_answer || typeof points !== "number") {
    return res.status(400).json({ error: "invalid_payload" });
  }
  if ((type === "multiple_choice" || type === "rebus_puzzle") && (!Array.isArray(choices) || choices.length !== 4)) {
    return res.status(400).json({ error: "choices_required" });
  }
  db.prepare(
    `UPDATE questions
     SET type = ?, prompt = ?, choices_json = ?, correct_answer = ?, points = ?, time_limit_seconds = ?, rebus_image_url = ?, difficulty = ?, piece_mode = ?, selected_pieces_json = ?
     WHERE id = ?`
  ).run(
    type,
    prompt,
    (type === "multiple_choice" || type === "rebus_puzzle") ? JSON.stringify(choices) : null,
    correct_answer,
    points,
    time_limit_seconds || null,
    (type === "rebus_puzzle" || type === "movie_title") ? (rebus_image_url || null) : null,
    type === "movie_title" ? (difficulty || null) : null,
    type === "movie_title" ? (piece_mode || "dynamic") : null,
    type === "movie_title" ? (selected_pieces_json || null) : null,
    id
  );
  res.json({ ok: true });
  emitState();
});

app.delete("/api/questions/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.prepare("DELETE FROM questions WHERE id = ?").run(id);
  res.json({ ok: true });
  emitState();
});

app.post("/api/generate-rebus-answers", requireAdmin, async (req, res) => {
  const { imageUrl } = req.body || {};
  
  if (!imageUrl) {
    return res.status(400).json({ error: "image_url_required" });
  }
  
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "gemini_api_key_not_configured", message: "Please set GEMINI_API_KEY environment variable" });
  }
  
  try {
    let imageData;
    let mimeType = "image/jpeg";
    
    // Handle base64 data URLs
    if (imageUrl.startsWith("data:image/")) {
      const matches = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        imageData = matches[2];
      } else {
        return res.status(400).json({ error: "invalid_data_url" });
      }
    } else {
      // Handle regular URLs - fetch and convert to base64
      const fetch = (await import("node-fetch")).default;
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return res.status(400).json({ error: "failed_to_fetch_image" });
      }
      const buffer = await imageResponse.buffer();
      imageData = buffer.toString("base64");
      const contentType = imageResponse.headers.get("content-type");
      if (contentType && contentType.startsWith("image/")) {
        mimeType = contentType;
      }
    }
    
    // Call Gemini API
    const fetch = (await import("node-fetch")).default;
    
    const callGemini = async (model) => {
      return fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: "This is a rebus puzzle image. Analyze this image and generate a quiz question with 4 answer choices. One should be the correct answer that solves the rebus puzzle, and three should be plausible but incorrect answers. Return ONLY a JSON object (no markdown, no code blocks) with this exact structure: {\"correct_answer\": \"the correct solution\", \"choices\": [\"choice A\", \"choice B\", \"choice C\", \"choice D\"]} where one of the choices is the correct answer."
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageData
                  }
                }
              ]
            }]
          })
        }
      );
    };

    // Try primary model (Gemini 3 Flash Preview)
    let geminiResponse = await callGemini("gemini-3-flash-preview");
    
    // Fallback to Gemini 2.5 Flash
    if (geminiResponse.status === 404) {
      console.log("gemini-3-flash-preview not found, trying gemini-2.5-flash");
      geminiResponse = await callGemini("gemini-2.5-flash");
    }

    // Fallback to Gemini 2.5 Flash Lite
    if (geminiResponse.status === 404) {
      console.log("gemini-2.5-flash not found, trying gemini-2.5-flash-lite");
      geminiResponse = await callGemini("gemini-2.5-flash-lite");
    }
    
    // Fallback to Gemini 2.0 Flash Experimental (Safety fallback)
    if (geminiResponse.status === 404) {
      console.log("gemini-2.5-flash-lite not found, trying gemini-2.0-flash-exp");
      geminiResponse = await callGemini("gemini-2.0-flash-exp");
    }
    
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      return res.status(500).json({ error: "gemini_api_error", message: errorText });
    }
    
    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      return res.status(500).json({ error: "no_response_from_gemini" });
    }
    
    // Parse the JSON response from Gemini
    let parsedResponse;
    try {
      // Remove markdown code blocks if present
      const cleanedText = generatedText.replace(/```json\s*|```\s*/g, "").trim();
      parsedResponse = JSON.parse(cleanedText);
    } catch (e) {
      console.error("Failed to parse Gemini response:", generatedText);
      return res.status(500).json({ error: "invalid_gemini_response", message: "Could not parse AI response" });
    }
    
    res.json({
      correct_answer: parsedResponse.correct_answer,
      choices: parsedResponse.choices
    });
    
  } catch (error) {
    console.error("Error generating rebus answers:", error);
    res.status(500).json({ error: "server_error", message: error.message });
  }
});

app.get("/api/teams", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM teams ORDER BY id ASC").all();
  res.json(rows);
});

app.post("/api/teams", requireAdmin, (req, res) => {
  const { team_name } = req.body || {};
  if (!team_name) {
    return res.status(400).json({ error: "invalid_payload" });
  }
  const token = crypto.randomBytes(24).toString("hex");
  const info = db
    .prepare("INSERT INTO teams (name, token) VALUES (?, ?)")
    .run(team_name, token);
  res.json({ id: info.lastInsertRowid, token });
  emitRankings();
});

app.post("/api/teams/:id/release", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE teams SET device_id = NULL WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.post("/api/teams/:id/adjust", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const delta = Number(req.body?.delta || 0);
  if (!Number.isFinite(delta)) {
    return res.status(400).json({ error: "invalid_delta" });
  }
  db.prepare("UPDATE teams SET points = points + ? WHERE id = ?").run(delta, id);
  res.json({ ok: true });
  emitRankings();
});

app.delete("/api/teams/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  // Delete team's submissions first
  db.prepare("DELETE FROM submissions WHERE team_id = ?").run(id);
  // Delete the team
  db.prepare("DELETE FROM teams WHERE id = ?").run(id);
  res.json({ ok: true });
  emitRankings();
});

app.post("/api/teams/delete_all", requireAdmin, (req, res) => {
  // Delete all submissions
  db.prepare("DELETE FROM submissions").run();
  // Delete all teams
  db.prepare("DELETE FROM teams").run();
  res.json({ ok: true });
  emitRankings();
});

app.post("/api/game/set_current", requireAdmin, (req, res) => {
  const questionId = Number(req.body?.question_id || 0);
  const state = getGameState();
  if (state.is_open && state.current_question_id && state.current_question_id !== questionId) {
    gradeCurrentQuestion();
    db.prepare("UPDATE game_state SET is_open = 0, opened_at = NULL").run();
  }
  
  // Clear auto-close timeout when changing questions
  if (autoCloseTimeout) {
    clearTimeout(autoCloseTimeout);
    autoCloseTimeout = null;
  }
  
  // Get question to check piece mode
  const question = questionId ? db.prepare("SELECT * FROM questions WHERE id = ?").get(questionId) : null;
  
  // For dynamic mode movie titles, start with no pieces visible (empty array)
  // For preselect mode or other types, clear custom_pieces_json
  let customPiecesJson = null;
  if (question && question.type === "movie_title" && question.piece_mode === "dynamic") {
    customPiecesJson = JSON.stringify([]); // Start with no pieces
  }
  
  // Reset difficulty to expert when setting a new question
  db.prepare("UPDATE game_state SET current_question_id = ?, reveal_answer = 0, current_difficulty = 'expert', custom_pieces_json = ?").run(questionId || null, customPiecesJson);
  res.json({ ok: true });
  emitState();
  emitRankings();
});

app.post("/api/game/open", requireAdmin, (req, res) => {
  const state = getGameState();
  if (!state.current_question_id) {
    return res.status(400).json({ error: "no_current_question" });
  }
  
  // Clear any existing auto-close timeout
  if (autoCloseTimeout) {
    clearTimeout(autoCloseTimeout);
    autoCloseTimeout = null;
  }
  
  db.prepare("UPDATE game_state SET is_open = 1, opened_at = ?, reveal_answer = 0").run(nowMs());
  
  // Check if question has a time limit and set auto-close timer
  const question = getCurrentQuestion();
  if (question && question.time_limit_seconds) {
    const timeoutMs = question.time_limit_seconds * 1000;
    autoCloseTimeout = setTimeout(() => {
      const currentState = getGameState();
      if (currentState.is_open && currentState.current_question_id === question.id) {
        gradeCurrentQuestion();
        db.prepare("UPDATE game_state SET is_open = 0").run();
        emitState();
        emitRankings();
      }
      autoCloseTimeout = null;
    }, timeoutMs);
  }
  
  res.json({ ok: true });
  emitState();
});

app.post("/api/game/close", requireAdmin, (req, res) => {
  // Clear auto-close timeout if manually closing
  if (autoCloseTimeout) {
    clearTimeout(autoCloseTimeout);
    autoCloseTimeout = null;
  }
  
  gradeCurrentQuestion();
  db.prepare("UPDATE game_state SET is_open = 0").run();
  res.json({ ok: true });
  emitState();
  emitRankings();
});

app.post("/api/game/reveal", requireAdmin, (req, res) => {
  db.prepare("UPDATE game_state SET reveal_answer = 1").run();
  res.json({ ok: true });
  emitState();
});

app.post("/api/game/lower_difficulty", requireAdmin, (req, res) => {
  const state = getGameState();
  const currentQuestion = getCurrentQuestion();
  
  if (!currentQuestion || currentQuestion.type !== "movie_title") {
    return res.status(400).json({ error: "not_movie_title_question" });
  }
  
  const difficultyLevels = ["expert", "hard", "medium", "easy"];
  const currentDifficulty = state.current_difficulty || "expert";
  const currentIndex = difficultyLevels.indexOf(currentDifficulty);
  
  if (currentIndex === -1 || currentIndex >= difficultyLevels.length - 1) {
    return res.status(400).json({ error: "already_at_lowest_difficulty" });
  }
  
  const newDifficulty = difficultyLevels[currentIndex + 1];
  db.prepare("UPDATE game_state SET current_difficulty = ?").run(newDifficulty);
  
  res.json({ ok: true, difficulty: newDifficulty });
  emitState();
});

app.post("/api/game/customize_pieces", requireAdmin, (req, res) => {
  const state = getGameState();
  const currentQuestion = getCurrentQuestion();
  
  if (!currentQuestion || currentQuestion.type !== "movie_title") {
    return res.status(400).json({ error: "not_movie_title_question" });
  }
  
  const pieces = req.body?.pieces || [];
  if (!Array.isArray(pieces)) {
    return res.status(400).json({ error: "invalid_pieces" });
  }
  
  const piecesJson = JSON.stringify(pieces);
  db.prepare("UPDATE game_state SET custom_pieces_json = ?").run(piecesJson);
  
  res.json({ ok: true });
  emitState();
});

app.post("/api/game/reset_submissions", requireAdmin, (req, res) => {
  const questionId = Number(req.body?.question_id || 0);
  if (!questionId) {
    return res.status(400).json({ error: "invalid_question" });
  }
  db.prepare("DELETE FROM submissions WHERE question_id = ?").run(questionId);
  recomputeTeamStats();
  res.json({ ok: true });
  io.emit("question_reset", { question_id: questionId });
  emitRankings();
});

app.get("/api/submissions", requireAdmin, (req, res) => {
  const questionId = Number(req.query?.question_id || 0);
  const rows = db
    .prepare(
      `SELECT submissions.*, teams.name as team_name
       FROM submissions
       JOIN teams ON teams.id = submissions.team_id
       WHERE question_id = ?
       ORDER BY submitted_at ASC`
    )
    .all(questionId);
  res.json(rows);
});

app.post("/api/submissions/:id/mark", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const isCorrect = req.body?.is_correct ? 1 : 0;
  const submission = db.prepare("SELECT * FROM submissions WHERE id = ?").get(id);
  if (!submission) {
    return res.status(404).json({ error: "not_found" });
  }
  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(submission.question_id);
  if (!question) {
    return res.status(404).json({ error: "question_not_found" });
  }
  const newPoints = isCorrect ? question.points : 0;
  const delta = newPoints - (submission.points_awarded || 0);
  db.prepare("UPDATE submissions SET is_correct = ?, points_awarded = ? WHERE id = ?").run(
    isCorrect,
    newPoints,
    id
  );
  if (delta !== 0) {
    db.prepare("UPDATE teams SET points = points + ? WHERE id = ?").run(delta, submission.team_id);
  }
  res.json({ ok: true });
  emitRankings();
});

app.get("/api/rankings", (req, res) => {
  res.json(computeRankings());
});

app.get("/api/settings", requireAdmin, (req, res) => {
  const state = getGameState();
  res.json({ points_mode: state.points_mode || "equal" });
});

app.post("/api/settings", requireAdmin, (req, res) => {
  const { points_mode } = req.body || {};
  if (!points_mode || !["equal", "ranked"].includes(points_mode)) {
    return res.status(400).json({ error: "invalid_points_mode" });
  }
  db.prepare("UPDATE game_state SET points_mode = ? WHERE id = 1").run(points_mode);
  res.json({ ok: true });
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  socket.emit("state_update", buildStatePayload());
  socket.emit("rankings_update", computeRankings());
  
  socket.on('audio_speed_change', (data) => {
    // Broadcast to all participants
    io.emit('audio_speed_update', data);
  });
});

server.listen(PORT, () => {
  console.log(`Quiz Bee MVP running on http://localhost:${PORT}`);
});
