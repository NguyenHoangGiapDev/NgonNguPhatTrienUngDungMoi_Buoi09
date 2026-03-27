var express = require('express');
var router = express.Router();

const authRoutes = require("./auth");
const cartRoutes = require("./carts");
const categoryRoutes = require("./categories");
const productRoutes = require("./products");
const roleRoutes = require("./roles");
const uploadRoutes = require("./upload");
const userRoutes = require("./users");

router.use("/auth", authRoutes);
router.use("/carts", cartRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/roles", roleRoutes);
router.use("/upload", uploadRoutes);
router.use("/users", userRoutes);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send({
    success: true,
    message:"HELLO WORLD"
  });
});

module.exports = router;
