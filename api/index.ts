import express from "express";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

const PORT = 3000;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

// ฟังก์ชันสำหรับล้างค่าและจัดรูปแบบ Private Key ให้ถูกต้องตามมาตรฐาน PEM
function formatPrivateKey(key: string | undefined) {
  if (!key) return undefined;
  
  let k = key.trim();

  // 1. ลบเครื่องหมายคำพูดที่อาจติดมา
  k = k.replace(/^["']|["']$/g, "");

  // 2. จัดการเรื่อง \n (สำคัญมากสำหรับ Vercel)
  if (k.includes('\\n')) {
    k = k.replace(/\\n/g, '\n');
  }

  // 3. ตรวจสอบว่ามี Header/Footer หรือยัง
  const beginMarker = "-----BEGIN PRIVATE KEY-----";
  const endMarker = "-----END PRIVATE KEY-----";

  if (!k.includes(beginMarker)) {
    const cleanKey = k.replace(/\s+/g, '');
    k = `${beginMarker}\n${cleanKey}\n${endMarker}`;
  }

  return k;
}

const PRIVATE_KEY = formatPrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY);

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// API Routes
app.get("/api/auth/google", (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(400).send("กรุณาตั้งค่า GOOGLE_CLIENT_ID และ GOOGLE_CLIENT_SECRET ใน Environment Variables ก่อน");
  }

  const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
    `client_id=${CLIENT_ID}&` +
    `redirect_uri=${redirectUri}&` +
    `response_type=code&` +
    `scope=https://www.googleapis.com/auth/spreadsheets&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  res.redirect(authUrl);
});

app.get("/api/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      return res.send("ไม่ได้รับ Refresh Token (อาจเป็นเพราะคุณเคยอนุญาตไปแล้ว ให้ไปที่ Google Account Settings แล้วลบแอปออกก่อนแล้วลองใหม่)");
    }

    res.send(`
      <html>
        <head>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600&display=swap" rel="stylesheet">
          <style>body { font-family: 'Kanit', sans-serif; }</style>
        </head>
        <body class="bg-gray-100 flex items-center justify-center min-h-screen p-4">
          <div class="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-gray-200">
            <div class="flex items-center mb-6">
              <div class="bg-green-500 p-2 rounded-lg mr-4">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h1 class="text-2xl font-bold text-blue-700">คัดลอก Refresh Token ของคุณ</h1>
            </div>
            
            <p class="text-gray-600 mb-2">นำค่าด้านล่างนี้ไปใส่ใน Vercel Environment Variables ชื่อ</p>
            <p class="text-xl font-black mb-6">GOOGLE_REFRESH_TOKEN</p>
            
            <div class="bg-gray-50 p-6 rounded-xl border-2 border-dashed border-gray-300 break-all font-mono text-sm mb-8 select-all cursor-pointer hover:bg-gray-100 transition-colors">
              ${refreshToken}
            </div>
            
            <div class="bg-red-50 p-4 rounded-xl border border-red-100">
              <p class="text-red-600 text-center font-medium">
                ขั้นตอนสุดท้าย: เมื่อใส่ค่าใน Vercel แล้ว อย่าลืมกด <span class="font-bold">Redeploy</span> เพื่อให้ระบบเริ่มทำงานนะครับ
              </p>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    res.status(500).send("Error: " + error.message);
  }
});

let isInitialized = false;

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

    if (!isInitialized) {
      const taskHeaders = ["id", "taskName", "unit", "responsible", "frequency", "deadline", "actualCompletion", "delayDays", "status", "remarks", "createdAt"];
      const logHeaders = ["timestamp", "userEmail", "action", "details"];

      // ตรวจสอบและจัดการแผ่นงาน Tasks
      let taskSheet = doc.sheetsByTitle["Tasks"];
      if (!taskSheet) {
        taskSheet = await doc.addSheet({ title: "Tasks", headerValues: taskHeaders });
      } else {
        // ถ้ามีแผ่นงานอยู่แล้วแต่ไม่มีหัวตาราง ให้ใส่หัวตารางให้
        try {
          await taskSheet.loadHeaderRow();
        } catch (e) {
          await taskSheet.setHeaderRow(taskHeaders);
        }
      }

      // ตรวจสอบและจัดการแผ่นงาน Logs
      let logSheet = doc.sheetsByTitle["Logs"];
      if (!logSheet) {
        logSheet = await doc.addSheet({ title: "Logs", headerValues: logHeaders });
      } else {
        try {
          await logSheet.loadHeaderRow();
        } catch (e) {
          await logSheet.setHeaderRow(logHeaders);
        }
      }
      isInitialized = true;
    }

    return doc;
  } catch (error: any) {
    throw new Error("การยืนยันตัวตนล้มเหลว: " + error.message);
  }
}

app.get("/api/tasks", async (req, res) => {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle["Tasks"];
    if (!sheet) return res.status(404).json({ error: "ไม่พบแผ่นงานชื่อ 'Tasks'" });
    
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
    if (!sheet) return res.status(404).json({ error: "ไม่พบแผ่นงานชื่อ 'Tasks'" });

    const newTask = {
      ...req.body,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    await sheet.addRow(newTask);
    
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

// Export the Express app as default
export default app;

// Only start the server if running locally (not on Vercel)
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
