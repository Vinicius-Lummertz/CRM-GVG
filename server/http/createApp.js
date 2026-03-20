"use strict";

const express = require("express");
const cors = require("cors");
const { registerRoutes } = require("../routes");

function createHttpApp({ publicDir, controllers, middlewares }) {
  const app = express();

  app.use(cors());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.static(publicDir));

  registerRoutes(app, controllers, middlewares);
  return app;
}

module.exports = {
  createHttpApp
};
