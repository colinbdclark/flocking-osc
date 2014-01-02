"use strict";

var fluid = require("infusion"),
    loader = fluid.getLoader(__dirname),
    flock = fluid.registerNamespace("flock");

loader.require("./lib/osc-serial.js");

module.exports = flock.io;
