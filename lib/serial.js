"use strict";

var fluid = require("infusion"),
    serialport = require("serialport"),
    slip = require("slip"),
    flock = fluid.registerNamespace("flock");

fluid.registerNamespace("flock.io");

fluid.defaults("flock.io.serial", {
    gradeNames: ["fluid.eventedComponent", "autoInit"],

    useSLIP: true,

    slipOptions: {},

    serialPort: {
        device: "/dev/cu.usbmodem22131",
        options: {
            baudrate: 115200
        }
    },

    members: {
        port: undefined,
        slipDecoder: {
            expander: {
                funcName: "flock.io.serial.createSLIPDecoder",
                args: ["{that}.options.slipOptions", "{that}.events.onMessage.fire"]
            }
        }
    },

    invokers: {
        createPort: {
            funcName: "flock.io.serial.createPort",
            args: ["{that}", "{that}.options.serialPort.device", "{that}.options.serialPort.options"]
        },

        writeMessage: {
            funcName: "flock.io.serial.writeMessage",
            args: [
                "{arguments}.0",
                "{that}.port",
                "{that}.events.onError.fire",
                "{that}.options.useSLIP"
            ]
        }
    },

    events: {
        onOpen: null,
        onPacket: null,
        onMessage: null,
        onError: null
    },

    listeners: {
        onCreate: [
            {
                // TODO: Replace this with a member expander
                // when Infusion can better handle Node.js host types
                // such as buffers.
                func: "{that}.createPort"
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
                args: ["data", "{that}.events.onPacket.fire"]
            },
            {
                "this": "console",
                method: "log",
                args: ["Listening to ", "{that}.port.path"]
            }
        ],

        onPacket: {
            funcName: "flock.io.serial.handlePacket",
            args: [
                "{arguments}.0",
                "{that}.slipDecoder",
                "{that}.events.onMessage.fire",
                "{that}.options.useSLIP"
            ]
        }
    }
});

flock.io.serial.createSLIPDecoder = function (slipOptions, onMessage) {
    slipOptions.onMessage = onMessage;
    return new slip.Decoder(slipOptions);
};

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

flock.io.serial.writeMessage = function (message, port, onError, useSLIP) {
    if (useSLIP) {
        message = slip.encode(message);
    }

    port.write(message, function (err) {
        if (err) {
            onError(err);
        }
    })
};

flock.io.serial.handlePacket = function (packet, decoder, onMessage, useSLIP) {
    if (useSLIP) {
        decoder.decode(packet);
    } else {
        onMessage(packet);
    }
};
