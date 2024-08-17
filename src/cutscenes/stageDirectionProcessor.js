import { CUTSCENE_ANIMATION_DEFAULTS } from "../utils/constants.js";

const SCENE_PROCESSES = {
    // Should clear any previous image on the display window, and initialize the theater stage state
    setStage: {
        cue: ({ stage, backgroundCanvas, foregroundCanvas }) => {
            const backgroundCanvasCtx = backgroundCanvas.getContext("2d");
            const foregroundCanvasCtx = foregroundCanvas.getContext("2d");

            // Reset fill color to black
            backgroundCanvasCtx.fillStyle = "black";
            foregroundCanvasCtx.fillStyle = "black";

            // Make foreground fully empty
            foregroundCanvasCtx.clearRect(
                0,
                0,
                foregroundCanvas.width,
                foregroundCanvas.height
            );

            // Make background fully black
            backgroundCanvasCtx.fillRect(
                0,
                0,
                backgroundCanvas.width,
                backgroundCanvas.height
            );

            return Object.assign({}, stage);
        },
    },
    showTitle: {
        cue: ({ stage, thisDirection }) => {
            return Object.assign({}, stage);
        },
    },
    backgroundColourTo: {
        cue: ({ stage, backgroundCanvas, thisDirection }) => {
            const newBackgroundColor = thisDirection.data;

            const backgroundCanvasCtx = backgroundCanvas.getContext("2d");
            return Object.assign({}, stage, {
                backgroundColor: newBackgroundColor,
            });
        },
    },
    lightsUp: {
        duration: 20,
        cue: ({ stage, backgroundCanvas, thisDirection }) => {
            const backgroundCanvasCtx = backgroundCanvas.getContext("2d");
            const newLightLevel = (20 - thisDirection.duration) / 20;
            backgroundCanvas.globalAlpha = newLightLevel;

            // Re-draw the background
            backgroundCanvasCtx.save();
            backgroundCanvasCtx.fillStyle = stage.backgroundColor;
            backgroundCanvasCtx.fillRect(
                0,
                120,
                backgroundCanvas.width,
                stage.sceneHeight
            );
            backgroundCanvasCtx.restore();
            return Object.assign({}, stage, { lightLevel: newLightLevel });
        },
    },
    lightsDown: {
        cue: ({ stage }) => {
            return Object.assign({}, stage);
        },
    },
    fin: {
        cue: ({ stage }) => {
            return Object.assign({}, stage, { isFinished: true });
        },
    },
};

const PUPPET_PROCESSES = {
    goWastedMode: {
        duration: 0,
        play: ({ puppet }) => {
            return Object.assign({}, puppet, {
                visualModifiers: {
                    ...puppet.visualModifiers,
                    stretchY: 3.2,
                    stretchX: 1.2,
                    opacity: 0.5,
                },
            });
        },
    },
    enterStageRight: {
        animation: "walking",
        duration: 60,
        play: ({ puppet, stage }) => {
            const newPuppet = Object.assign({}, puppet);
            if (puppet.x === -100 && puppet.y === -100) {
                // Move from wings to stage right
                newPuppet.x = stage.width + newPuppet.baseWidth / 2;
                newPuppet.y = stage.height / 2;
                newPuppet.currentState = "walking";
                newPuppet.reverseImage = true;
            } else {
                // Make puppet walk left
                newPuppet.x -= newPuppet.speed;
                newPuppet.y = stage.height / 2;
            }
            return Object.freeze(newPuppet);
        },
    },
    enterStageLeft: {
        animation: "walking",
        duration: 60,
        play: ({ puppet, stage }) => {
            const newPuppet = Object.assign({}, puppet);
            if (puppet.x === -100 && puppet.y === -100) {
                // Move from wings to stage left
                newPuppet.x = 0 - newPuppet.baseWidth / 2;
                newPuppet.y = stage.height / 2;
                newPuppet.currentState = "walking";
                newPuppet.reverseImage = false;
            } else {
                // Make puppet walk right
                newPuppet.x -= newPuppet.speed;
                newPuppet.y = stage.height / 2;
            }
            return Object.freeze(newPuppet);
        },
    },
    exitStageRight: {
        animation: "walking",
        duration: -1,
        play: ({ puppet }) => {
            const newPuppet = Object.assign({}, puppet);
            newPuppet.x += newPuppet.speed;
            return newPuppet;
        },
    },
    exitStageLeft: {
        animation: "walking",
        duration: -1,
        play: ({ puppet }) => {
            const newPuppet = Object.assign({}, puppet);
            newPuppet.x -= newPuppet.speed;
            return newPuppet;
        },
    },
    speech: (direction) => {
        const defaults = CUTSCENE_ANIMATION_DEFAULTS;
        return {
            duration: Math.round(
                defaults.baseDialogDuration +
                    defaults.timePerTextCharacter *
                        (direction.data?.length ?? 0)
            ),
            play: ({ foregroundCanvas, puppet }) => {
                const ctx = foregroundCanvas.getContext("2d");
                //TODO: position text based on character position
                //TODO: color text based on character color
                ctx.save();
                ctx.fillStyle = "blue";
                ctx.textAlign = "center";
                ctx.fillText(direction.data, 0, 100);
                ctx.restore();
                return { ...puppet, dialog: [direction.data] };
            },
        };
    },
};

export const createStageDirectionProcess = (direction) => {
    const directionSpec =
        direction.subject === "scene"
            ? SCENE_PROCESSES[direction.process]
            : PUPPET_PROCESSES[direction.process];

    if (directionSpec) {
        // Puppet process
        return Object.freeze({
            subject: direction.subject,
            startTime: direction.timestamp,
            action: direction.process,
            duration: 0, // Duration may be overwritten
            getEndTime() {
                return this.startTime + (this.duration ?? 0);
            },
            ...(typeof directionSpec === "function"
                ? directionSpec(direction)
                : directionSpec),
        });
    } else {
        // Unknown process
        console.log("NO DIRECTION: ", { direction });
        return null;
    }
};
