"use strict";

var fluid = require("infusion"),
    loader = fluid.getLoader(__dirname),
    flock = fluid.registerNamespace("flock");

loader.require("./lib/serial.js");
loader.require("./lib/osc.js");

module.exports = flock.io;
