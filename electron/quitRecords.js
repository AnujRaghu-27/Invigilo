const fs = require("fs");
const path = require("path");
const os = require("os");

const ADMIN_SECRET = process.env.INVIGILO_ADMIN_SECRET || "invigilo-admin-secret-2026";

/**
 * Returns potential file storage paths for quit records.
 * Primary: Electron userData directory (safe across all platforms and packaging).
 * Secondary: Project workspace root (for easy developer inspection and CLI access).
 */
function getStoragePaths() {
  const paths = [];

  // Try Electron app.getPath("userData")
  try {
    const { app } = require("electron");
    if (app && typeof app.getPath === "function") {
      paths.push(path.join(app.getPath("userData"), "quit-records.json"));
    }
  } catch {
    // Not running inside Electron app context (e.g. standalone CLI script)
  }

  // Standard macOS user data path
  const osUserData = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "invigilo",
    "quit-records.json"
  );
  if (!paths.includes(osUserData)) {
    paths.push(osUserData);
  }

  // Project workspace directory
  const projectPath = path.join(__dirname, "..", "quit-records.json");
  if (!paths.includes(projectPath)) {
    paths.push(projectPath);
  }

  return paths;
}

/**
 * Reads existing quit records from persistent storage.
 */
function readRecords() {
  const paths = getStoragePaths();
  for (const filePath of paths) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8").trim();
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (err) {
        console.error(`Error reading quit records from ${filePath}:`, err.message);
      }
    }
  }
  return [];
}

/**
 * Writes records to persistent storage.
 */
function writeRecords(records) {
  const paths = getStoragePaths();
  const data = JSON.stringify(records, null, 2);

  for (const filePath of paths) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, data, "utf-8");
    } catch (err) {
      console.error(`Failed to write quit records to ${filePath}:`, err.message);
    }
  }
}

/**
 * Records an intentional, confirmed quit attempt.
 * Stored fields strictly limited to:
 * - studentId
 * - timestamp
 * - status (defaults to "UFM")
 * - adminReview (defaults to null)
 */
function recordQuitAttempt({ studentId = "student_user" } = {}) {
  const records = readRecords();

  const record = {
    studentId,
    timestamp: new Date().toISOString(),
    status: "UFM",
    adminReview: null,
  };

  records.push(record);
  writeRecords(records);
  console.log(`[Invigilo Security] Quit attempt recorded with status: UFM (Student: ${record.studentId}, Timestamp: ${record.timestamp})`);
  return record;
}

/**
 * Updates status of a quit record.
 * Only authenticated admins providing the valid ADMIN_SECRET can modify the status.
 */
function updateRecordStatus({ target, timestamp, studentId, recordId, newStatus, adminSecret, adminId, note }) {
  // 1. Enforce admin authentication on the trusted data layer
  if (!adminSecret || adminSecret !== ADMIN_SECRET) {
    const error = new Error("Unauthorized: Invalid admin credentials. Only authorized invigilators/admins can change status to Safe Quit.");
    error.code = "UNAUTHORIZED";
    throw error;
  }

  // 2. Validate requested status
  const allowedStatuses = ["Safe Quit", "UFM"];
  if (!allowedStatuses.includes(newStatus)) {
    const error = new Error(`Invalid status: "${newStatus}". Allowed values: ${allowedStatuses.join(", ")}`);
    error.code = "INVALID_STATUS";
    throw error;
  }

  // 3. Find target record
  const records = readRecords();
  const identifier = target || timestamp || recordId || studentId;

  let record = null;
  if (!identifier && records.length > 0) {
    // If no identifier provided, default to the most recent record
    record = records[records.length - 1];
  } else if (identifier) {
    const indexNum = parseInt(identifier, 10);
    if (!isNaN(indexNum) && String(indexNum) === String(identifier).trim() && indexNum >= 1 && indexNum <= records.length) {
      record = records[indexNum - 1];
    } else {
      record =
        records.find((r) => r.timestamp === identifier) ||
        records.find((r) => r.timestamp && r.timestamp.includes(identifier)) ||
        [...records].reverse().find((r) => r.studentId === identifier);
    }
  }

  if (!record) {
    const error = new Error(`Record not found for identifier: "${identifier || "latest"}"`);
    error.code = "NOT_FOUND";
    throw error;
  }

  const previousStatus = record.status;
  record.status = newStatus;
  record.adminReview = {
    reviewedBy: adminId || "Authorized Admin",
    reviewedAt: new Date().toISOString(),
    previousStatus,
    note: note || `Status changed from ${previousStatus} to ${newStatus} by authorized admin`,
  };

  writeRecords(records);
  console.log(`[Invigilo Security] Record for ${record.studentId} (${record.timestamp}) status updated to "${newStatus}" by admin "${record.adminReview.reviewedBy}"`);
  return record;
}

/**
 * Retrieves records (requires admin authorization).
 */
function getRecords(adminSecret) {
  if (!adminSecret || adminSecret !== ADMIN_SECRET) {
    const error = new Error("Unauthorized: Invalid admin credentials.");
    error.code = "UNAUTHORIZED";
    throw error;
  }
  return readRecords();
}

module.exports = {
  ADMIN_SECRET,
  getStoragePaths,
  readRecords,
  writeRecords,
  recordQuitAttempt,
  updateRecordStatus,
  getRecords,
};
