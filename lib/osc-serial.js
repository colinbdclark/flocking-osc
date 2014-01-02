"use strict";

var fluid = require("infusion"),
    serialport = require("serialport"),
    osc = require("osc-min"),
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
                // TODO: Replace this with a member expander.
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


fluid.registerNamespace("flock.io.osc");

fluid.defaults("flock.io.osc.source", {
    gradeNames: ["fluid.eventedComponent", "fluid.modelComponent", "autoInit"],

    model: {},
    
    invokers: {
        parseMessage: {
            funcName: "flock.io.osc.parseData",
            args: ["{that}.applier", "{arguments}.0", "{that}.events.onMessage.fire"]
        }
    },
    
    events: {
        onMessage: null
    },
    
    listeners: {
        onMessage: {
            "this": console,
            method: "log",
            args: ["{that}.model"]
        }
    }
});

flock.io.osc.parseData = function (applier, buffer, onMessage) {
    var oscMsg = osc.fromBuffer(buffer);
    flock.io.osc.source.fireChangeForMessage(applier, oscMsg);
    onMessage(oscMsg);
};

flock.io.osc.addressToPath = function (address) {
    if (address[0] === "/") {
        address = address.substring(1);
    }
    
    return address.replace("/", ".");
};

flock.io.osc.unpackArguments = function (args) {
    var numArgs = args.length,
        i,
        arg,
        type,
        val;

    // Place multiple arguments into an array.
    for (i = 0; i < numArgs; i++) {
        arg = args[i];
        type = arg.type;
        val = type === "integer" || type === "float" ? Number(arg.value) : arg.value;
        args[i] = val;
    }
    
    return numArgs === 1 ? args[0] : args;
};

flock.io.osc.source.fireChangeForMessage = function (applier, oscMsg) {
    var path = flock.io.osc.addressToPath(oscMsg.address),
        val = flock.io.osc.unpackArguments(oscMsg.args);
        
    applier.requestChange(path, val);
};

fluid.defaults("flock.io.osc.serial", {
    gradeNames: ["fluid.eventedComponent", "autoInit"],
    
    components: {
        oscSource: {
            type: "flock.io.osc.source"
        },
        
        serial: {
            type: "flock.io.serial",
            options: {
                listeners: {
                    onMessage: {
                        funcName: "{oscSource}.parseMessage",
                        args: "{arguments}.0"
                    }
                }
            }
        }
    }
});
