import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

// ฟังก์ชันสำหรับล้างค่าและจัดรูปแบบ Private Key ให้ถูกต้องตามมาตรฐาน PEM
function formatPrivateKey(key: string | undefined) {
  if (!key) return undefined;
  
  let k = key.trim();

  // 1. กรณีผู้ใช้เผลอก๊อปปี้ไฟล์ JSON ทั้งไฟล์มาวาง
  if (k.startsWith('{')) {
    try {
      const parsed = JSON.parse(k);
      k = parsed.private_key || k;
    } catch (e) { /* ignore */ }
  }

  // 2. ลบเครื่องหมายคำพูดที่อาจติดมาที่หัวและท้าย
  k = k.replace(/^["']|["']$/g, "");

  // 3. แปลง \n ที่เป็นตัวอักษรให้เป็นบรรทัดใหม่จริง
  k = k.replace(/\\n/g, '\n');

  const header = "-----BEGIN PRIVATE KEY-----";
  const footer = "-----END PRIVATE KEY-----";
  
  // 4. ดึงเฉพาะส่วน Base64 ออกมา
  let base64 = k;
  if (k.includes(header)) {
    const parts = k.split(header);
    if (parts.length > 1) {
      const afterHeader = parts[1].split(footer);
      base64 = afterHeader[0];
    }
  }
  
  // 5. ล้างทุกอย่างที่ไม่ใช่ตัวอักษร Base64 (A-Z, a-z, 0-9, +, /, =)
  base64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  
  // 6. จัดรูปแบบใหม่ให้เป็น PEM ที่ถูกต้อง (64 ตัวอักษรต่อบรรทัด)
  const matches = base64.match(/.{1,64}/g);
  const formattedCore = matches ? matches.join("\n") : base64;

  return `${header}\n${formattedCore}\n${footer}`;
}

const PRIVATE_KEY = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY);

// Initialize Google Sheets
async function getDoc() {
  if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    throw new Error("ไม่พบข้อมูลการเชื่อมต่อ (Missing Environment Variables)");
  }
  try {
    const serviceAccountAuth = new JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // Debug: ตรวจสอบรูปแบบ Key เบื้องต้น (ไม่แสดงค่าจริง)
    if (PRIVATE_KEY) {
      console.log("Private Key Format Check:");
      console.log("- Starts with Header:", PRIVATE_KEY.startsWith("-----BEGIN PRIVATE KEY-----"));
      console.log("- Ends with Footer:", PRIVATE_KEY.endsWith("-----END PRIVATE KEY-----"));
      console.log("- Length:", PRIVATE_KEY.length);
      console.log("- Number of lines:", PRIVATE_KEY.split('\n').length);
    }

    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    return doc;
  } catch (error: any) {
    console.error("Google Auth Error Details:", error);
    throw new Error("การยืนยันตัวตนล้มเหลว: " + (error.message.includes("unsupported") ? "รูปแบบ Private Key ไม่ถูกต้อง" : error.message));
  }
}

// Ensure sheets exist with correct headers
async function ensureSheets() {
  try {
    const doc = await getDoc();
    const taskHeaders = ["id", "taskName", "unit", "responsible", "frequency", "deadline", "actualCompletion", "delayDays", "status", "remarks", "createdAt"];
    const logHeaders = ["timestamp", "userEmail", "action", "details"];

    // Check Tasks Sheet
    let taskSheet = doc.sheetsByTitle["Tasks"];
    if (!taskSheet) {
      taskSheet = await doc.addSheet({ title: "Tasks", headerValues: taskHeaders });
    } else {
      await taskSheet.setHeaderRow(taskHeaders);
    }

    // Check Logs Sheet
    let logSheet = doc.sheetsByTitle["Logs"];
    if (!logSheet) {
      logSheet = await doc.addSheet({ title: "Logs", headerValues: logHeaders });
    } else {
      await logSheet.setHeaderRow(logHeaders);
    }
    console.log("Google Sheets initialized successfully.");
  } catch (error) {
    console.error("Error ensuring sheets:", error);
  }
}

// API Routes
app.get("/api/tasks", async (req, res) => {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle["Tasks"];
    if (!sheet) throw new Error("ไม่พบแผ่นงาน 'Tasks'");
    
    const rows = await sheet.getRows();
    const tasks = rows.map(row => ({
      id: row.get("id"),
      taskName: row.get("taskName"),
      unit: row.get("unit"),
      responsible: row.get("responsible"),
      frequency: row.get("frequency"),
      deadline: row.get("deadline"),
      actualCompletion: row.get("actualCompletion"),
      delayDays: row.get("delayDays"),
      status: row.get("status"),
      remarks: row.get("remarks"),
      createdAt: row.get("createdAt"),
    }));
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/tasks", async (req, res) => {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle["Tasks"];
    if (!sheet) throw new Error("ไม่พบแผ่นงาน 'Tasks'");

    const newTask = {
      ...req.body,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    await sheet.addRow(newTask);
    
    // Log action
    const logSheet = doc.sheetsByTitle["Logs"];
    if (logSheet) {
      const userEmail = req.headers["x-user-email"];
      await logSheet.addRow({
        timestamp: new Date().toISOString(),
        userEmail: Array.isArray(userEmail) ? userEmail[0] : (userEmail || "unknown"),
        action: "CREATE_TASK",
        details: JSON.stringify(newTask),
      });
    }

    res.json(newTask);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/tasks/:id", async (req, res) => {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle["Tasks"];
    if (!sheet) throw new Error("ไม่พบแผ่นงาน 'Tasks'");

    const rows = await sheet.getRows();
    const row = rows.find(r => r.get("id") === req.params.id);
    if (row) {
      Object.keys(req.body).forEach(key => {
        row.set(key, req.body[key]);
      });
      await row.save();

      // Log action
      const logSheet = doc.sheetsByTitle["Logs"];
      if (logSheet) {
        const userEmail = req.headers["x-user-email"];
        await logSheet.addRow({
          timestamp: new Date().toISOString(),
          userEmail: Array.isArray(userEmail) ? userEmail[0] : (userEmail || "unknown"),
          action: "UPDATE_TASK",
          details: `ID: ${req.params.id}`,
        });
      }

      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Task not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle["Tasks"];
    if (!sheet) throw new Error("ไม่พบแผ่นงาน 'Tasks'");

    const rows = await sheet.getRows();
    const row = rows.find(r => r.get("id") === req.params.id);
    if (row) {
      await row.delete();

      // Log action
      const logSheet = doc.sheetsByTitle["Logs"];
      if (logSheet) {
        const userEmail = req.headers["x-user-email"];
        await logSheet.addRow({
          timestamp: new Date().toISOString(),
          userEmail: Array.isArray(userEmail) ? userEmail[0] : (userEmail || "unknown"),
          action: "DELETE_TASK",
          details: `ID: ${req.params.id}`,
        });
      }

      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Task not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/logs", async (req, res) => {
  try {
    const doc = await getDoc();
    const logSheet = doc.sheetsByTitle["Logs"];
    if (logSheet) {
      const userEmail = req.headers["x-user-email"];
      await logSheet.addRow({
        timestamp: new Date().toISOString(),
        userEmail: Array.isArray(userEmail) ? userEmail[0] : (userEmail || "unknown"),
        action: req.body.action,
        details: req.body.details || "",
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  await ensureSheets();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
