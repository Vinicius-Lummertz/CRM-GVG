"use strict";

const express = require("express");
const { registerRoutes } = require("../routes");

function createHttpApp({ publicDir, controllers }) {
  const app = express();

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.static(publicDir));

  registerRoutes(app, controllers);
  return app;
}

module.exports = {
  createHttpApp
};
