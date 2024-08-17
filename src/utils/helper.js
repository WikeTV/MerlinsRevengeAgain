import { Vector2D } from "./Vector2D.js";

/**
 * Simple object check. (https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge)
 * @param item
 * @returns {boolean}
 */
export const isObject = (item) => {
    return item && typeof item === "object" && !Array.isArray(item);
};

export const objectContains = (object, match) => {
    let isMatchFound = false;
    Object.values(object).forEach((value) => {
        if (typeof match === "function") {
            isMatchFound = match(value);
        } else {
            isMatchFound =
                value === match ||
                (isObject(value) && objectContains(value, match));
        }
    });
    return isMatchFound;
};

/**
 * Deep merge two objects. (https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge)
 * @param target
 * @param ...sources
 */
export const assignDeep = (target, ...sources) => {
    const nextSources = Array.from(sources || []);
    console.log(target, sources);
    try {
        if (!sources.length) return target;
        const source = nextSources.shift();

        if (isObject(target) && isObject(source)) {
            for (const key in source) {
                if (
                    isObject(source[key]) &&
                    !objectContains(target, source[key])
                ) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    assignDeep(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return assignDeep(target, ...nextSources);
    } catch (err) {
        console.error(err);
        console.log("on object: ", target);
    }
};

//! WIP Dangerous Infinite Recursion Potential
export const immutableDeepCopy = (obj) => {
    return Object.freeze(assignDeep({}, obj));
};

export const immutableCopy = (obj) => {
    return Object.freeze(Object.assign({}, obj));
};

export const convertToArray = (input) => {
    if (input === null || input === undefined) {
        return [];
    }
    return isObject(input)
        ? [Object.assign({}, input)]
        : Array.from(input).map((val) => Object.assign({}, val));
};

export const generateUUID = (function () {
    // use of window.crypto is preferred, but there is a pretty decent fallback that uses Math.random

    // From https://stackoverflow.com/a/2117523
    if (window?.crypto) {
        return () => crypto.randomUUID();
    } else {
        // From https://stackoverflow.com/a/21963136
        var lut = [];
        for (var i = 0; i < 256; i++) {
            lut[i] = (i < 16 ? "0" : "") + i.toString(16);
        }
        return () => {
            var d0 = (Math.random() * 0x10000000) >>> 0;
            var d1 = (Math.random() * 0x10000000) >>> 0;
            var d2 = (Math.random() * 0x10000000) >>> 0;
            var d3 = (Math.random() * 0x10000000) >>> 0;
            return (
                lut[d0 & 0xff] +
                lut[(d0 >> 8) & 0xff] +
                lut[(d0 >> 16) & 0xff] +
                lut[(d0 >> 24) & 0xff] +
                "-" +
                lut[d1 & 0xff] +
                lut[(d1 >> 8) & 0xff] +
                "-" +
                lut[((d1 >> 16) & 0x0f) | 0x40] +
                lut[(d1 >> 24) & 0xff] +
                "-" +
                lut[(d2 & 0x3f) | 0x80] +
                lut[(d2 >> 8) & 0xff] +
                "-" +
                lut[(d2 >> 16) & 0xff] +
                lut[(d2 >> 24) & 0xff] +
                lut[d3 & 0xff] +
                lut[(d3 >> 8) & 0xff] +
                lut[(d3 >> 16) & 0xff] +
                lut[(d3 >> 24) & 0xff]
            );
        };
    }
})();

/**
 * Create a new Vector2D object and return it
 * @param {coorinate2D} sourceCoordinate  - {x, y} of start grid location
 * @param {coorinate2D} targetCoordinate  - {x, y} of end grid location
 * @returns {Vector2D}
 */
export const getVector = (sourceCoordinate, targetCoordinate) => {
    if (!sourceCoordinate || !targetCoordinate) {
        return null;
    }
    return new Vector2D(sourceCoordinate, targetCoordinate);
};

/**
 * Create a composition of functions, where input is processed
 * through operations in order from first to last
 * @param  {...any} operations
 * @returns { function } composition func
 */
export const pipe =
    (...operations) =>
    (input) =>
        operations.reduce((output, op) => op(output), input);

/**
 * Create a composition of functions, where input is processed
 * through operations in order from last to first
 * @param  {...any} operations
 * @returns { function } composition func
 */
export const compose = (...operations) => {
    const resolveCompose = (input, opIndex) => {
        return operations[opIndex] ? resolveCompose(input, opIndex + 1) : input;
    };
    return (input) => resolveCompose(input, 0);
};

export const stringifyFunctionNames = (input = {}) => {
    let output = {}; // Object with non-stringifiable values turned into label strings anyways

    if (
        input === undefined ||
        input === null ||
        typeof input === "boolean" ||
        typeof input === "number" ||
        typeof input === "string"
    ) {
        return input;
    } else if (input.length !== undefined) { // Array should return an array
        output = input.map((value) => {
            if (typeof value !== "object") {
                return value;
            } else {
                return stringifyFunctionNames(value);
            }
        });
    } else { // Objects should be all that's left
        Object.entries(input).forEach(([key, value]) => {
            if (typeof value !== "object") {
                output[key] = value;
            } else {
                output[key] = stringifyFunctionNames(value);
            }
        });
    }

    return output;
};

export const deepToString = (input = {}) => {
    let output = stringifyFunctionNames(input);

    return JSON.stringify(output, undefined, 2);
};
