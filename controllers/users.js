const fs = require("fs");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../schemas/users");

// Helpers -------------------------------------------------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const generateRandomPassword = (length = 16) =>
  crypto
    .randomBytes(48)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, length);
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: false,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });
const sendPasswordEmail = async (transporter, toEmail, username, rawPassword) =>
  transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to: toEmail,
    subject: "Tài khoản của bạn đã được tạo",
    html: `
      <h3>Xin chào ${username},</h3>
      <p>Tài khoản của bạn đã được tạo thành công.</p>
      <p><strong>Username:</strong> ${username}</p>
      <p><strong>Password:</strong> ${rawPassword}</p>
      <p>Vui lòng đăng nhập và đổi mật khẩu sau lần đăng nhập đầu tiên.</p>
    `,
  });

// Auth helpers used by routes/auth.js ---------------------
exports.CreateAnUser = function (username, password, email, roleId) {
  // roleId hiện không dùng vì schema lưu role dạng string
  return new User({
    username,
    email,
    password: bcrypt.hashSync(password, 10),
    role: "user",
  });
};

exports.FindByUsername = (username) => User.findOne({ username });
exports.FindByEmail = (email) => User.findOne({ email });
exports.FindByToken = (token) => User.findOne({ resetPasswordToken: token });
exports.FindById = (id) => User.findById(id);

exports.SuccessLogin = async (user) => {
  user.failedLoginAttempts = 0;
  user.lockTime = null;
  await user.save();
};

exports.FailLogin = async (user) => {
  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
  if (user.failedLoginAttempts >= 5) {
    user.lockTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.failedLoginAttempts = 0;
  }
  await user.save();
};

// CSV import feature (giữ nguyên logic cũ) -----------------
const readCsvFile = async (filePath) => {
  const content = await fs.promises.readFile(filePath, "utf8");
  const cleanContent = content.replace(/^\uFEFF/, "").trim();
  if (!cleanContent) return [];

  const lines = cleanContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return [];

  const headerLine = lines[0];
  const delimiter = headerLine.includes(",") ? "," : "\t";
  const headers = headerLine.split(delimiter).map((h) => h.trim().toLowerCase());
  const usernameIndex = headers.findIndex((h) => h === "username");
  const emailIndex = headers.findIndex((h) => h === "email");
  if (usernameIndex === -1 || emailIndex === -1) {
    throw new Error("File CSV không đúng định dạng. Cần header: username,email");
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const currentDelimiter = line.includes("\t") ? "\t" : delimiter;
    const parts = line.split(currentDelimiter).map((item) => item.trim());
    rows.push({ username: parts[usernameIndex] || "", email: parts[emailIndex] || "" });
  }
  return rows;
};

const deleteTempFile = async (filePath) => {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.error("Không xóa được file tạm:", error.message);
  }
};

exports.importUsersFromCsv = async (req, res) => {
  let filePath = "";
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Vui lòng upload file CSV." });
    }
    filePath = req.file.path;

    const rows = await readCsvFile(filePath);
    const transporter = createTransporter();

    const results = {
      total: rows.length,
      created: 0,
      skipped: 0,
      emailed: 0,
      failedEmails: 0,
      details: [],
    };

    for (const row of rows) {
      try {
        const username = String(row.username || "").trim();
        const email = String(row.email || "").trim().toLowerCase();

        if (!username || !email) {
          results.skipped++;
          results.details.push({ username, email, status: "skipped", reason: "Thiếu username/email" });
          continue;
        }

        if (!isValidEmail(email)) {
          results.skipped++;
          results.details.push({ username, email, status: "skipped", reason: "Email không hợp lệ" });
          continue;
        }

        const existedUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existedUser) {
          results.skipped++;
          results.details.push({ username, email, status: "skipped", reason: "Đã tồn tại" });
          continue;
        }

        const rawPassword = generateRandomPassword(16);
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const newUser = new User({ username, email, password: hashedPassword, role: "user" });
        await newUser.save();
        results.created++;

        try {
          await sendPasswordEmail(transporter, email, username, rawPassword);
          results.emailed++;
          results.details.push({ username, email, status: "created_and_emailed" });
        } catch (mailError) {
          results.failedEmails++;
          results.details.push({
            username,
            email,
            status: "created_but_email_failed",
            reason: mailError.message,
          });
        }
      } catch (itemError) {
        results.skipped++;
        results.details.push({
          username: row.username || "",
          email: row.email || "",
          status: "error",
          reason: itemError.message,
        });
      }
    }

    await deleteTempFile(filePath);
    return res.status(200).json({ success: true, message: "Import users hoàn tất.", data: results });
  } catch (error) {
    if (filePath) await deleteTempFile(filePath);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi import users", error: error.message });
  }
};
