
What is Flocking and flocking-osc?
===================================

**flocking-osc** is a Node.js-based module for [Flocking](http://flockingjs.org) that supports receiving Open Sound Control messages over a variety of transports. It is an early work in progress.

**Flocking** is an audio synthesis toolkit for JavaScript. It runs in a browser (Firefox, Chrome, or Safari) or directly on your computer (using Node.js). Flocking is designed for artists and musicians building creative Web-based sound projects.

How Do I Use It?
================

flocking-osc is intended to be linked to a Node.js application. In your application's package.json file, you'll need declarate a dependency on flocking-osc:

    "dependencies": {
        "flocking-osc": "git://github.com/colinbdclark/flocking-osc.git"
    }

And then, in your application, just require the module and instantiate the appropriate OSC component. flocking-osc will automatically transform your OSC address space into a JSON model will track changes in values over time. You can listen for changes in its model and bind these to values in your Flocking synth (or anything else):

    var fluid = require("infusion"),
        io = fluid.require("flocking-osc"),
        serialOSC = io.osc.serial();

    serialOSC.oscSource.applier.modelChanged.addListener("*", function (model) {
        // Do something with the model values.
    });
