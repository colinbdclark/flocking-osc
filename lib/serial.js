"use strict";

var fluid = require("infusion"),
    serialport = require("serialport"),
    flock = fluid.registerNamespace("flock");

fluid.registerNamespace("flock.io");
    
fluid.defaults("flock.io.serial", {
    gradeNames: ["fluid.eventedComponent", "autoInit"],
    
    serialPort: {
        device: "/dev/cu.usbmodem22131",
        options: {
            baudrate: 115200
        }
    },
    
    members: {
        port: undefined
    },
    
    invokers: {
        createPort: {
            funcName: "flock.io.serial.createPort",
            args: ["{that}", "{that}.options.serialPort.device", "{that}.options.serialPort.options"]
        }
    },
    
    events: {
        onOpen: null,
        onMessage: null,
    },
    
    listeners: {
        onCreate: [
            {
                // TODO: Replace this with a member expander
                // when Infusion can better handle Node.js host types
                // such as buffers.
                funcName: "{that}.createPort"
            },
            {
                "this": "{that}.port",
                method: "open",
                args: ["{that}.events.onOpen.fire"]
            }
        ],
        
        onOpen: [
            {
                "this": "{that}.port",
                method: "on",
                args: ["data", "{that}.events.onMessage.fire"]
            },
            {
                "this": "console",
                method: "log",
                args: ["Listening to ", "{that}.port.path"]
            }
        ]
    }
});

flock.io.serial.createPort = function (that, device, options) {
    var portCreator = function () {
        that.port = new serialport.SerialPort(device, options);
    };
    
    if (that.port) {
        that.port.close(portCreator);
        
        return;
    }

    portCreator();
};
