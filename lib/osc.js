"use strict";

var fluid = require("infusion"),
    osc = require("osc"),
    flock = fluid.registerNamespace("flock");

fluid.registerNamespace("flock.io.osc");

/*****************
 * OSC Utilities *
 *****************/

// Expose the "osc" module to Infusion's global namespace.
flock.io.osc.module = osc;

flock.io.osc.addressToELPath = function (address) {
    if (address[0] === "/") {
        address = address.substring(1);
    }

    return address.replace("/", ".");
};

fluid.defaults("flock.io.osc.messageSource", {
    gradeNames: ["fluid.modelComponent", "fluid.eventedComponent", "autoInit"],

    model: {},

    components: {
        transport: {}
    },

    events: {
        onOSCMessage: {
            event: "{transport}.events.onMessage",
            args: [{
                expander: {
                    funcName: "flock.io.osc.module.readMessage",
                    args: ["{arguments}.0"]
                }
            }]
        }
    },

    listeners: {
        onOSCMessage: {
            funcName: "flock.io.osc.messageSource.fireChangeForMessage",
            args: ["{that}.applier", "{arguments}.0"]
        }
    }
});

flock.io.osc.messageSource.fireChangeForMessage = function (applier, oscMsg) {
    var address = oscMsg.address,
        path = flock.io.osc.addressToELPath(address);

    applier.requestChange(path, oscMsg.args[0]);
};


// TODO: Promote this to Flocking core, probably directly into Synth
// TODO: Replace this with Model Relay when it's in Infusion.
// TODO: Unit tests!
fluid.defaults("flock.synth.inputMapper", {
    gradeNames: ["fluid.modelComponent", "fluid.eventedComponent", "autoInit"],

    inputMap: {},

    members: {
        // This will be supplied at onCreate by setInputMap.
        inputMap: null
    },

    components: {
        // The user needs to provide this in their configuration to an inputMapper.
        synth: {}
    },

    invokers: {
        get: {
            funcName: "flock.synth.inputMapper.get",
            args: ["{arguments}.0", "{that}.inputMap", "{synth}"]
        },

        set: {
            funcName: "flock.synth.inputMapper.set",
            args: ["{arguments}.0", "{arguments}.1", "{that}.inputMap", "{synth}"]
        },

        setInputMap: {
            funcName: "flock.synth.inputMapper.setInputMap",
            args: ["{that}", "{arguments}.0", "{synth}"]
        }
    },

    listeners: {
        onCreate: {
            funcName: "{that}.setInputMap",
            args: ["{that}.options.inputMap"]
        }
    }
});

flock.synth.inputMapper.setInputMap = function (that, inputMap, synth) {
    that.inputMap = flock.synth.inputMapper.prepareInputMap(inputMap, synth);
};

flock.synth.inputMapper.prepareInputMap = function (inputMap, synth) {
    var transformedMap = {};

    fluid.each(inputMap, function (mapSpec, outputPath) {
        flock.synth.inputMapper.mapInput(transformedMap, outputPath, mapSpec, synth);
    });

    return transformedMap;
};

flock.synth.inputMapper.mapInput = function (transformedMap, outputPath, mapSpec, synth) {
    if (typeof mapSpec === "string") {
        transformedMap[mapSpec] = outputPath;
    } else {
        flock.synth.inputMapper.mapWithSpec(transformedMap, outputPath, mapSpec, synth);
    }
};

flock.synth.inputMapper.mapWithSpec = function (transformedMap, outputPath, mapSpec, synth) {
    mapSpec.outputPath = mapSpec.outputPath || "value";

    var inputPath = mapSpec.inputPath,
        fullOutputPath = fluid.pathUtil.composePath(outputPath, mapSpec.outputPath),
        mapFn;

    if (!inputPath) {
        throw new Error("No input path found in input map for key " + outputPath);
    }

    mapFn = mapSpec.cacheTargetUGen ?
        flock.synth.inputMapper.cacheUGen :
        flock.synth.inputMapper.mapPath;

    mapFn(transformedMap, inputPath, outputPath, fullOutputPath, mapSpec, synth)
};

flock.synth.inputMapper.mapPath = function (transformedMap, inputPath, outputPath, fullOutputPath, mapSpec, synth) {
    if (mapSpec.synthDef) {
        synth.set(outputPath, mapSpec.synthDef);
    }

    transformedMap[inputPath] = fullOutputPath;
};

flock.synth.inputMapper.ugenDefForControlValue = function (value) {
    var ugen = typeof value !== "number" ? value : {
        ugen: "flock.ugen.value",
        rate: flock.rates.CONTROL,
        inputs: {
            value: value
        }
    };

    return ugen;
};

flock.synth.inputMapper.cacheUGen = function (transformedMap, inputPath, outputPath, fullOutputPath, mapSpec, synth) {
    var tail = fluid.pathUtil.getTailPath(fullOutputPath),
        fullPathPrefix = fluid.pathUtil.getToTailPath(fullOutputPath),
        targetUGenDef = flock.get(mapSpec.synthDef, mapSpec.outputPath),
        expandedDef = flock.synth.inputMapper.ugenDefForControlValue(targetUGenDef),
        penultimateUGen;

    // Ensure the target value unit generator is actually set to run at control rate.
    fluid.set(mapSpec.synthDef, mapSpec.outputPath, expandedDef);

    // Set the new chunk of unit generators on the synth.
    synth.set(outputPath, mapSpec.synthDef);
    penultimateUGen = synth.get(fullPathPrefix);

    // Cache the target unit generator itself.
    transformedMap[inputPath] = penultimateUGen.inputs[tail];
};

flock.synth.inputMapper.get = function (path, inputMap, synth) {
    var mappedInput = inputMap[path];
    return synth.get(mappedInput);
};

flock.synth.inputMapper.set = function (path, value, inputMap, synth) {
    var elPath = path.join("."),
        mappedInput = inputMap[elPath];

    if (!mappedInput) {
        return;
    }

    if (typeof mappedInput === "string") {
        synth.set(mappedInput, value);
    } else {
        mappedInput.model.value = value;
    }
};
