// All keys are referred to by their code by default.
//   ex. "w" uses the code "KeyW", the left "alt" key uses the code "AltLeft"
// These values can be viewed in the web browser's console by adding a "keyDown" event
//   listener which logs {e.code} to the console

//! WARNING: These input handlers do not adhere to functional programming practices, and may have to be rewritten someday

import { immutableCopy } from "./helper.js";

// 2-way many-to-many lookup table
// A key can trigger many actions, and likewise, an action can be triggered by many different keys
//TODO: save and load "actionLookup" from user settings

// Lookup key codes by action
const defaultActionsToKeybinds = Object.freeze({
    moveUp: ["KeyW"],
    moveDown: ["KeyS"],
    moveLeft: ["KeyA"],
    moveRight: ["KeyD"],
    primaryAttack: ["Mouse0"],
    primaryInteract: ["Mouse0"],
    selectSpell1: ["Key1"],
});

// 2-way many-to-many lookup table
// A key can trigger many actions, and likewise, an action can be triggered by many different keys
//TODO: save and load "actionLookup" from user settings
const getKeybindings = () => {
    // Lookup key codes by action
    const actionLookup = {
        ...Object.assign({}, defaultActionsToKeybinds),
        //TODO: load user assigned keybinds here
    };

    // Lookup actions by key code
    // This value is calculated on get
    //TODO: update this when user settings are saved
    const inputLookup = Object.entries(actionLookup).reduce(
        (inputLookup, [action, keybindsList]) => ({
            ...inputLookup,
            ...keybindsList.reduce(
                (keysMap, key) => ({
                    ...keysMap,
                    [key]: [action, ...(inputLookup[key] || [])],
                }),
                {}
            ),
        }),
        {}
    );
    return immutableCopy({ actionLookup, inputLookup });
};

export const getKeyboardInputHandler = (element) => {
    const pressedKeys = {};
    element.addEventListener("keydown", (e) => {
        e.preventDefault();
        if (e.code && !e.repeat) {
            pressedKeys[e.code] = true;
        }
    });
    element.addEventListener("keyup", (e) => {
        e.preventDefault();
        if (e.code) {
            pressedKeys[e.code] = false;
        }
    });

    // On "blur", ensure all input states are nullified
    element.addEventListener("blur", (e) => {
        e.preventDefault();
        Object.keys(pressedKeys).forEach((key) => {
            pressedKeys[key] = false;
        });
    });
    return pressedKeys;
};

export const getMouseInputHandler = (element) => {
    const mouseState = {
        x: 0,
        y: 0,
        mouseButtonsDown: {},
    };

    element.addEventListener("contextmenu", (e) => {
        // Disable HTML default right click action
        e.preventDefault();
    });
    element.addEventListener("mousedown", (e) => {
        mouseState.x = e.offsetX;
        mouseState.y = e.offsetY;
        mouseState.mouseButtonsDown[e.button] = true;
    });
    element.addEventListener("mouseup", (e) => {
        mouseState.x = e.offsetX;
        mouseState.y = e.offsetY;
        mouseState.mouseButtonsDown[e.button] = false;
    });
    element.addEventListener("mousemove", (e) => {
        mouseState.x = e.offsetX;
        mouseState.y = e.offsetY;
    });
    element.addEventListener("mouseout", (e) => {
        Object.keys(mouseState.mouseButtonsDown).forEach(() => {
            mouseState.mouseButtonsDown[e.button] = false;
        });
    });
    element.addEventListener("mouseover", (e) => {
        mouseState.x = e.offsetX;
        mouseState.y = e.offsetY;
    });
    return mouseState;
};

export const getInputManager = (containerElement) => {
    const keyBindings = getKeybindings();
    const keyboardKeysDown = getKeyboardInputHandler(containerElement);
    const mouseState = getMouseInputHandler(containerElement);

    const getPressedInputs = () =>
        Object.entries(keyboardKeysDown)
            .filter(([code, isDown]) => isDown)
            .map(([code]) => code)
            .concat(
                Object.entries(mouseState.mouseButtonsDown)
                    .filter(([code, isDown]) => isDown)
                    .map(([code]) => "Mouse" + code)
            );

    const getActivatedActions = () => {
        const currentlyPressedInputs = getPressedInputs();

        const currentlyActiveActions = currentlyPressedInputs
            .map((code) => keyBindings.inputLookup[code])
            .reduce(
                (allActions, currentKeyActions) => [
                    ...allActions,
                    ...Array.from(currentKeyActions || []),
                ],
                []
            );

        return immutableCopy({
            actions: currentlyActiveActions,
            mousePosition: { x: mouseState.x, y: mouseState.y },
        });
    };

    /**
     * Given the code of a key, make that key appear no longer pressed,
     * so that instant actions may only trigger once. An empty input will acknowledge all keybinds
     * @param {String} key code of pressed input to void
     */
    const acknowledgeInput = (code = null) => {
        if (code === null) {
            Object.values(keyboardKeysDown).forEach(
                (code) => (keyboardKeysDown[code] = false)
            );
            Object.values(mouseButtonsDown).forEach(
                (code) => (mouseState.mouseButtonsDown[code] = false)
            );
        } else if (code.includes("Mouse")) {
            mouseState.mouseButtonsDown[code] = false;
        } else {
            keyboardKeysDown[code] = false;
        }
    };

    return immutableCopy({
        getPressedInputs,
        getActivatedActions,
        acknowledgeInput,
    });
};
