const fs = require("fs");
const path = require("path");

class ScreenshotManager {
  constructor() {
    this.mainWindow = null;
    this.intervalId = null;
    this.isCapturing = false;
    this.isCaptureInProgress = false;
    this.currentSessionId = null;
    this.captureCount = 0;
  }

  setMainWindow(win) {
    this.mainWindow = win;
  }

  getStorageDirectories(sessionId) {
    const dirs = [];
    try {
      const { app } = require("electron");
      if (app && typeof app.getPath === "function") {
        dirs.push(path.join(app.getPath("userData"), "screenshots", sessionId));
      }
    } catch {
      // Ignored if not in Electron app context
    }

    // Workspace directory for direct inspection
    dirs.push(path.join(__dirname, "..", "screenshots", sessionId));
    return dirs;
  }

  startCapture(sessionId) {
    if (this.isCapturing) {
      console.warn(
        `[ScreenshotManager] Capture is already active for session "${this.currentSessionId}". Ignoring duplicate start request.`
      );
      return {
        success: false,
        reason: "Already capturing",
        sessionId: this.currentSessionId,
      };
    }

    const sid = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.currentSessionId = sid;
    this.captureCount = 0;
    this.isCapturing = true;
    this.isCaptureInProgress = false;

    // Ensure session directories exist
    const targetDirs = this.getStorageDirectories(sid);
    for (const dir of targetDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    console.log(`[ScreenshotManager] Screenshot capture started for session: ${this.currentSessionId}`);
    console.log(`[ScreenshotManager] Primary storage location: ${targetDirs[targetDirs.length - 1]}`);
    console.log(`[ScreenshotManager] Capture interval: 10 seconds`);

    // Define the periodic capture task
    const captureTask = async () => {
      // Abort if capturing was stopped
      if (!this.isCapturing) {
        return;
      }

      // Prevent overlapping captures
      if (this.isCaptureInProgress) {
        console.warn(`[ScreenshotManager] Previous screenshot capture still in progress. Skipping this tick.`);
        return;
      }

      this.isCaptureInProgress = true;
      try {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
          throw new Error("Main window is not available or has been destroyed.");
        }

        // Capture window contents
        const nativeImage = await this.mainWindow.capturePage();

        // Check if capture was stopped while awaiting capturePage
        if (!this.isCapturing) {
          console.log(`[ScreenshotManager] Capture completed after session was ended. Discarding.`);
          return;
        }

        if (nativeImage.isEmpty()) {
          console.warn(`[ScreenshotManager] Warning: Captured image is empty (window may be minimized or hidden).`);
          return;
        }

        const buffer = nativeImage.toPNG();
        if (!buffer || buffer.length === 0) {
          throw new Error("Generated image buffer is empty.");
        }

        this.captureCount += 1;
        const seq = String(this.captureCount).padStart(3, "0");
        const timestamp = Date.now();
        const filename = `screenshot_${seq}_${timestamp}.png`;

        const dirs = this.getStorageDirectories(this.currentSessionId);
        let primarySavedPath = null;
        for (const dir of dirs) {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          const filePath = path.join(dir, filename);
          await fs.promises.writeFile(filePath, buffer);
          primarySavedPath = filePath;
        }

        console.log(
          `[ScreenshotManager] [Capture #${this.captureCount}] Screenshot saved successfully (${buffer.length} bytes) at: ${primarySavedPath}`
        );
      } catch (err) {
        console.error(
          `[ScreenshotManager] Failed to capture/save screenshot #${this.captureCount + 1}:`,
          err.message
        );
      } finally {
        this.isCaptureInProgress = false;
      }
    };

    // Schedule capturing every 10 seconds (10,000 ms)
    this.intervalId = setInterval(captureTask, 10000);

    return {
      success: true,
      sessionId: this.currentSessionId,
      storageDirectory: targetDirs[targetDirs.length - 1],
    };
  }

  stopCapture() {
    if (!this.isCapturing) {
      return { success: true, count: this.captureCount, message: "Not capturing" };
    }

    this.isCapturing = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const totalCaptured = this.captureCount;
    const sessionEnded = this.currentSessionId;
    this.currentSessionId = null;

    console.log(
      `[ScreenshotManager] Screenshot capture stopped for session: ${sessionEnded}. Total screenshots saved: ${totalCaptured}`
    );
    return {
      success: true,
      sessionId: sessionEnded,
      count: totalCaptured,
    };
  }

  getInfo() {
    return {
      isCapturing: this.isCapturing,
      currentSessionId: this.currentSessionId,
      captureCount: this.captureCount,
    };
  }
}

const screenshotManager = new ScreenshotManager();
module.exports = screenshotManager;
