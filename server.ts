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

  // 1. กรณีเป็น JSON ทั้งไฟล์
  if (k.startsWith('{')) {
    try {
      const parsed = JSON.parse(k);
      if (parsed.private_key) k = parsed.private_key;
    } catch (e) { /* ignore */ }
  }

  // 2. ลบเครื่องหมายคำพูดและจัดการตัวอักษรขึ้นบรรทัดใหม่
  k = k.replace(/^["']|["']$/g, "") // ลบ " หรือ ' ที่หัวท้าย
       .replace(/\\n/g, '\n')       // แปลง \n เป็นบรรทัดใหม่
       .replace(/\\r/g, '');        // ลบ \r ออก

  const beginMarker = "-----BEGIN PRIVATE KEY-----";
  const endMarker = "-----END PRIVATE KEY-----";
  
  // 3. ดึงเฉพาะส่วนเนื้อหา Base64 ออกมา
  let base64Content = k;
  if (k.includes(beginMarker)) {
    const start = k.indexOf(beginMarker) + beginMarker.length;
    const end = k.indexOf(endMarker);
    base64Content = end !== -1 ? k.substring(start, end) : k.substring(start);
  }

  // 4. ล้างทุกอย่างที่ไม่ใช่ Base64 (ป้องกันช่องว่างหรือตัวอักษรแปลกปลอมที่ทำให้ ASN.1 พัง)
  const cleanBase64 = base64Content.replace(/[^A-Za-z0-9+/=]/g, '');

  // 5. จัดรูปแบบใหม่: 64 ตัวอักษรต่อบรรทัด (มาตรฐาน PEM)
  const rows = cleanBase64.match(/.{1,64}/g);
  const formattedBase64 = rows ? rows.join('\n') : cleanBase64;

  // 6. ประกอบกลับเป็น PEM ที่สมบูรณ์
  const finalKey = `${beginMarker}\n${formattedBase64}\n${endMarker}`;
  
  // Debug (แสดงเฉพาะโครงสร้างเบื้องต้นเพื่อความปลอดภัย)
  console.log("Key Formatted Successfully:");
  console.log("- Base64 Start:", cleanBase64.substring(0, 10) + "...");
  console.log("- Total Lines:", finalKey.split('\n').length);
  
  return finalKey;
}

// รองรับทั้งชื่อตัวแปรแบบสั้นและแบบเต็มตามที่ปรากฏในรูป Vercel
const PRIVATE_KEY = formatPrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY);

let isInitialized = false;

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

    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    // ตรวจสอบแผ่นงานในครั้งแรกที่เรียกใช้
    if (!isInitialized) {
      const taskHeaders = ["id", "taskName", "unit", "responsible", "frequency", "deadline", "actualCompletion", "delayDays", "status", "remarks", "createdAt"];
      const logHeaders = ["timestamp", "userEmail", "action", "details"];

      // Check Tasks Sheet
      let taskSheet = doc.sheetsByTitle["Tasks"];
      if (!taskSheet) {
        await doc.addSheet({ title: "Tasks", headerValues: taskHeaders });
      }

      // Check Logs Sheet
      let logSheet = doc.sheetsByTitle["Logs"];
      if (!logSheet) {
        await doc.addSheet({ title: "Logs", headerValues: logHeaders });
      }
      isInitialized = true;
    }

    return doc;
  } catch (error: any) {
    console.error("Google Auth Error Details:", error);
    let errorMessage = error.message;
    if (errorMessage.includes("unsupported") || errorMessage.includes("asn1")) {
      errorMessage = "รูปแบบ Private Key ไม่ถูกต้อง (ASN.1/PEM Error)";
    }
    throw new Error("การยืนยันตัวตนล้มเหลว: " + errorMessage);
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

// Export for Vercel
export default app;

if (process.env.NODE_ENV !== "production") {
  startServer();
} else if (!process.env.VERCEL) {
  // Run startServer if in production but not on Vercel (e.g., standard VPS)
  startServer();
}
