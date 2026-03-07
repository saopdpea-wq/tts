import express from "express";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { google } from "googleapis";
import multer from "multer";
import { Readable } from "stream";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const PORT = 3000;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PARENT_FOLDER_ID = '1-VvUrx8YftGdo37O9masWg3NXEImMoeX';

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
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
      ],
    });

    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    if (!isInitialized) {
      const taskHeaders = ["รหัส", "ชื่องาน", "หน่วยงาน", "ผู้รับผิดชอบ", "ความถี่", "ความสำคัญ", "ประเภทงาน", "ขั้นตอนการดำเนินงาน", "กำหนดแล้วเสร็จ", "ทำเสร็จจริง", "ล่าช้า (วัน)", "สถานะ", "หมายเหตุ", "ไฟล์แนบ", "รหัสกลุ่มงาน", "วันที่สร้าง"];
      const logHeaders = ["วันเวลา", "อีเมลผู้ใช้", "การกระทำ", "รายละเอียด"];

      // ตรวจสอบและจัดการแผ่นงาน Tasks
      let taskSheet = doc.sheetsByTitle["Tasks"];
      if (!taskSheet) {
        taskSheet = await doc.addSheet({ title: "Tasks", headerValues: taskHeaders });
      } else {
        try {
          await taskSheet.loadHeaderRow();
          const currentHeaders = taskSheet.headerValues;
          const missingHeaders = taskHeaders.filter(h => !currentHeaders.includes(h));
          if (missingHeaders.length > 0) {
            await taskSheet.setHeaderRow(taskHeaders);
          }
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
          const currentHeaders = logSheet.headerValues;
          const missingHeaders = logHeaders.filter(h => !currentHeaders.includes(h));
          if (missingHeaders.length > 0) {
            await logSheet.setHeaderRow(logHeaders);
          }
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
      id: row.get("รหัส"),
      taskName: row.get("ชื่องาน"),
      unit: row.get("หน่วยงาน"),
      responsible: row.get("ผู้รับผิดชอบ"),
      frequency: row.get("ความถี่"),
      priority: row.get("ความสำคัญ"),
      taskType: row.get("ประเภทงาน"),
      progress: row.get("ขั้นตอนการดำเนินงาน"),
      deadline: row.get("กำหนดแล้วเสร็จ"),
      actualCompletion: row.get("ทำเสร็จจริง"),
      delayDays: row.get("ล่าช้า (วัน)"),
      status: row.get("สถานะ"),
      remarks: row.get("หมายเหตุ"),
      attachments: row.get("ไฟล์แนบ"),
      groupId: row.get("รหัสกลุ่มงาน"),
      createdAt: row.get("วันที่สร้าง"),
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

    const taskId = Date.now().toString();
    const thaiTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
    const createdAt = new Date(thaiTime).toISOString();

    const newTask = {
      "รหัส": taskId,
      "ชื่องาน": req.body.taskName,
      "หน่วยงาน": req.body.unit,
      "ผู้รับผิดชอบ": req.body.responsible,
      "ความถี่": req.body.frequency,
      "ความสำคัญ": req.body.priority,
      "ประเภทงาน": req.body.taskType,
      "ขั้นตอนการดำเนินงาน": req.body.progress,
      "กำหนดแล้วเสร็จ": req.body.deadline,
      "ทำเสร็จจริง": req.body.actualCompletion,
      "ล่าช้า (วัน)": req.body.delayDays,
      "สถานะ": req.body.status,
      "หมายเหตุ": req.body.remarks,
      "ไฟล์แนบ": req.body.attachments,
      "รหัสกลุ่มงาน": req.body.groupId || taskId,
      "วันที่สร้าง": createdAt,
    };
    await sheet.addRow(newTask);
    
    const logSheet = doc.sheetsByTitle["Logs"];
    if (logSheet) {
      const userEmail = req.headers["x-user-email"];
      await logSheet.addRow({
        "วันเวลา": createdAt,
        "อีเมลผู้ใช้": Array.isArray(userEmail) ? userEmail[0] : (userEmail || "unknown"),
        "การกระทำ": "CREATE_TASK",
        "รายละเอียด": JSON.stringify(newTask),
      });
    }

    res.json({
      id: newTask["รหัส"],
      taskName: newTask["ชื่องาน"],
      unit: newTask["หน่วยงาน"],
      responsible: newTask["ผู้รับผิดชอบ"],
      frequency: newTask["ความถี่"],
      priority: newTask["ความสำคัญ"],
      taskType: newTask["ประเภทงาน"],
      progress: newTask["ขั้นตอนการดำเนินงาน"],
      deadline: newTask["กำหนดแล้วเสร็จ"],
      actualCompletion: newTask["ทำเสร็จจริง"],
      delayDays: newTask["ล่าช้า (วัน)"],
      status: newTask["สถานะ"],
      remarks: newTask["หมายเหตุ"],
      attachments: newTask["ไฟล์แนบ"],
      groupId: newTask["รหัสกลุ่มงาน"],
      createdAt: newTask["วันที่สร้าง"],
    });
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
    const row = rows.find(r => r.get("รหัส") === req.params.id);
    if (row) {
      const mapping: Record<string, string> = {
        taskName: "ชื่องาน",
        unit: "หน่วยงาน",
        responsible: "ผู้รับผิดชอบ",
        frequency: "ความถี่",
        priority: "ความสำคัญ",
        taskType: "ประเภทงาน",
        progress: "ขั้นตอนการดำเนินงาน",
        deadline: "กำหนดแล้วเสร็จ",
        actualCompletion: "ทำเสร็จจริง",
        delayDays: "ล่าช้า (วัน)",
        status: "สถานะ",
        remarks: "หมายเหตุ",
        attachments: "ไฟล์แนบ",
        groupId: "รหัสกลุ่มงาน",
      };

      Object.keys(req.body).forEach(key => {
        if (mapping[key]) {
          row.set(mapping[key], req.body[key]);
        }
      });
      await row.save();

      const logSheet = doc.sheetsByTitle["Logs"];
      if (logSheet) {
        const userEmail = req.headers["x-user-email"];
        await logSheet.addRow({
          "วันเวลา": new Date().toISOString(),
          "อีเมลผู้ใช้": Array.isArray(userEmail) ? userEmail[0] : (userEmail || "unknown"),
          "การกระทำ": "UPDATE_TASK",
          "รายละเอียด": `ID: ${req.params.id}`,
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
    const row = rows.find(r => r.get("รหัส") === req.params.id);
    if (row) {
      await row.delete();

      const logSheet = doc.sheetsByTitle["Logs"];
      if (logSheet) {
        const userEmail = req.headers["x-user-email"];
        await logSheet.addRow({
          "วันเวลา": new Date().toISOString(),
          "อีเมลผู้ใช้": Array.isArray(userEmail) ? userEmail[0] : (userEmail || "unknown"),
          "การกระทำ": "DELETE_TASK",
          "รายละเอียด": `ID: ${req.params.id}`,
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
      const thaiTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
      const createdAt = new Date(thaiTime).toISOString();
      
      await logSheet.addRow({
        "วันเวลา": createdAt,
        "อีเมลผู้ใช้": Array.isArray(userEmail) ? userEmail[0] : (userEmail || "unknown"),
        "การกระทำ": req.body.action,
        "รายละเอียด": req.body.details || "",
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Google Drive Upload Endpoint
app.post("/api/upload", upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "ไม่พบไฟล์ที่อัปโหลด" });
    }

    const { taskName } = req.body;
    if (!taskName) {
      return res.status(400).json({ error: "ไม่พบชื่อรายการงาน" });
    }

    const auth = new google.auth.JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/drive']
    });

    const drive = google.drive({ version: 'v3', auth });

    // 1. Create Folder: [Task Name]_[DDMMYYYY]
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getFullYear()}`;
    const folderName = `${taskName}_${dateStr}`;

    // Check if folder already exists under parent
    const listFolders = await drive.files.list({
      q: `name = '${folderName}' and '${PARENT_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
    });

    let folderId;
    if (listFolders.data.files && listFolders.data.files.length > 0) {
      folderId = listFolders.data.files[0].id;
    } else {
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [PARENT_FOLDER_ID],
      };
      const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });
      folderId = folder.data.id;
    }

    // 2. Upload File to Folder
    const fileMetadata = {
      name: req.file.originalname,
      parents: [folderId],
    };
    const media = {
      mimeType: req.file.mimetype,
      body: Readable.from(req.file.buffer),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    // 3. Set permission so anyone with link can view (optional, but often needed)
    await drive.permissions.create({
      fileId: file.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    res.json({ 
      fileId: file.data.id, 
      webViewLink: file.data.webViewLink,
      folderId: folderId
    });
  } catch (error: any) {
    console.error("Upload error:", error);
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
