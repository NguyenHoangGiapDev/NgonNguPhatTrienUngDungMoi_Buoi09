require("dotenv").config();

var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var mongoose = require("mongoose");

var app = express();

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/NNPTUD-C6");

mongoose.connection.on("connected", function () {
  console.log("MongoDB connected");
});

mongoose.connection.on("error", function (err) {
  console.log("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", function () {
  console.log("MongoDB disconnected");
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", require("./routes/index"));
app.use("/api/v1/users", require("./routes/users"));
app.use("/api/v1/auth", require("./routes/auth"));
app.use("/api/v1/roles", require("./routes/roles"));
app.use("/api/v1/products", require("./routes/products"));
app.use("/api/v1/categories", require("./routes/categories"));
app.use("/api/v1/carts", require("./routes/carts"));
app.use("/api/v1/upload", require("./routes/upload"));
app.use("/api/v1/messages", require("./routes/messages"));
app.use("/api/v1/messages", require("./routes/messages"));


app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.send({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
