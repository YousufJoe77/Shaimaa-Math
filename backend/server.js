const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// Folders & Files
// ==============================

const uploadFolder = path.join(__dirname, "uploads");
const dataFolder = path.join(__dirname, "data");
const dataFile = path.join(dataFolder, "submissions.json");

fs.mkdirSync(uploadFolder, { recursive: true });
fs.mkdirSync(dataFolder, { recursive: true });

if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, "[]", "utf8");
}

// ==============================
// Database Functions
// ==============================

function getSubmissions() {
    try {
        return JSON.parse(
            fs.readFileSync(dataFile, "utf8")
        );
    } catch {
        return [];
    }
}

function saveSubmissions(data) {
    fs.writeFileSync(
        dataFile,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}

// ==============================
// Multer Upload Settings
// ==============================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadFolder);
    },

    filename: (req, file, cb) => {

        const extension = path.extname(
            file.originalname
        );

        const uniqueName =
            `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

        cb(null, uniqueName);
    }

});

const upload = multer({ storage });

// ==============================
// Middleware
// ==============================

app.use(cors());

app.use(express.json());

// Uploaded files
app.use(
    "/uploads",
    express.static(uploadFolder)
);

// Student website
app.use(
    express.static(
        path.join(__dirname, "../student")
    )
);

// ==============================
// Home
// ==============================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "../student/index.html"
        )
    );

});

// ==============================
// Upload Homework
// ==============================

app.post(
    "/upload",
    upload.array("files"),
    (req, res) => {

        try {

            const studentName =
                req.body.studentName || "";

            const stage =
                req.body.stage || "";

            const files =
                req.files || [];

            const submission = {

                id: Date.now().toString(),

                studentName,

                stage,

                submittedAt:
                    new Date().toISOString(),

                files: files.map(file => ({

                    originalName:
                        file.originalname,

                    filename:
                        file.filename,

                    url:
                        `/uploads/${file.filename}`

                }))

            };

            const submissions =
                getSubmissions();

            submissions.push(submission);

            saveSubmissions(submissions);

            console.log("");
            console.log("==============================");
            console.log("واجب جديد");
            console.log("==============================");
            console.log("الطالب:", studentName);
            console.log("المرحلة:", stage);
            console.log("عدد الملفات:", files.length);
            console.log("==============================");
            console.log("");

            res.json({

                success: true,

                message:
                    "تم إرسال الواجب بنجاح",

                submission

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "حدث خطأ أثناء حفظ الواجب"

            });

        }

    }
);

// ==============================
// Get All Submissions
// ==============================

app.get(
    "/submissions",
    (req, res) => {

        res.json(
            getSubmissions()
        );

    }
);

// ==============================
// Get One Student
// ==============================

app.get(
    "/submissions/:id",
    (req, res) => {

        const submissions =
            getSubmissions();

        const submission =
            submissions.find(
                item =>
                    item.id === req.params.id
            );

        if (!submission) {

            return res.status(404).json({

                success: false,

                message:
                    "الطالب غير موجود"

            });

        }

        res.json(submission);

    }
);

// ==============================
// Delete Individual File
// ==============================

app.delete(
    "/submissions/:id/files/:fileIndex",
    (req, res) => {

        try {

            const submissions =
                getSubmissions();

            const submission =
                submissions.find(
                    item =>
                        item.id === req.params.id
                );

            if (!submission) {

                return res.status(404).json({

                    success: false,

                    message:
                        "الطالب غير موجود"

                });

            }

            const fileIndex =
                Number(req.params.fileIndex);

            if (
                !Number.isInteger(fileIndex) ||
                fileIndex < 0 ||
                fileIndex >= submission.files.length
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "الملف غير موجود"

                });

            }

            const file =
                submission.files[fileIndex];

            // Delete physical file
            if (file.filename) {

                const filePath =
                    path.join(
                        uploadFolder,
                        file.filename
                    );

                if (fs.existsSync(filePath)) {

                    fs.unlinkSync(filePath);

                }

            }

            // Remove file from database
            submission.files.splice(
                fileIndex,
                1
            );

            // If student has no files left,
            // remove the whole submission
            if (submission.files.length === 0) {

                const updated =
                    submissions.filter(
                        item =>
                            item.id !== submission.id
                    );

                saveSubmissions(updated);

            } else {

                saveSubmissions(submissions);

            }

            res.json({

                success: true,

                message:
                    "تم حذف الملف بنجاح"

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "حدث خطأ أثناء حذف الملف"

            });

        }

    }
);

// ==============================
// Start Server
// ==============================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");
        console.log("================================");
        console.log("      Shaimaa Math Backend");
        console.log("================================");

        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            "Student: /"
        );

        console.log(
            "Upload: /upload"
        );

        console.log(
            "Submissions: /submissions"
        );

        console.log("================================");
        console.log("");

    }
);