import { legacyCutsceneFetcher } from "../utils/fileFetcher.js";
import { immutableCopy, deepToString } from "../utils/helper.js";
import {
    CUTSCENE_ENTITIES,
    CUTSCENE_ANIMATION_DEFAULTS,
    CUTSCENE_STAGE_INITIAL_SETTINGS,
    ANIMATION_SLIDES_PER_FRAME,
} from "../utils/constants.js";
import { createPuppet } from "./puppet.js";
import { drawStatusText } from "../utils/textRender.js";
import { createStageDirectionProcess } from "./stageDirectionProcessor.js";
import { IS_DEBUG } from "../utils/constants.js";

const createStageDirection = (options) =>
    immutableCopy({
        timestamp: 0, // The time after animation start that the process should begin on
        subject: "", // "merlin", "berlin", "stage", etc.
        process: "", //
        data: "",
        ...options,
    });

/**
 * Parse a legacy script line into a stage direction (this should not be fed "wait" lines)
 * @param {Object} characterMap the script's map of aliases to characters
 * @param {Number} timestamp the time this process should begin playing on
 * @param {String} scriptLine the line of text in the script to parse
 * @returns {} `Keyframe` object
 */
const convertTextToStageDirection = (characterMap, timestamp, scriptLine) => {
    const options = {
        timestamp,
    };

    const firstSeparatorIndex = scriptLine.includes(":")
        ? scriptLine.indexOf(":")
        : scriptLine.indexOf(" ");
    const firstWord = scriptLine.substring(0, firstSeparatorIndex).trim();
    const lastWords = scriptLine.substring(firstSeparatorIndex).trim();

    // Check if line is a character queue
    if (Object.keys(characterMap ?? {}).includes(firstWord)) {
        options.subject = characterMap[firstWord];
        if (lastWords.startsWith(":")) {
            options.process = "speech";
            options.data = lastWords.substring(1).trim();
        } else {
            options.process = lastWords;
        }
        // If not character, must be scene queue
    } else {
        options.subject = "scene";
        options.process = firstWord || lastWords.trim() || "";
        options.data = lastWords.trim();
    }

    return createStageDirection(options);
};

const parseCutsceneScript = (characterMap, scriptLines) => {
    let currentTimestamp = 0;
    const scriptTimes = scriptLines.reduce((timedLines, currentLine) => {
        if (timedLines?.[timedLines.length - 1]?.split?.(":")?.length > 1) {
            const speakingLine = timedLines?.[timedLines.length - 1]
                ?.split(":")[1]
                .trim();
            currentTimestamp += CUTSCENE_ANIMATION_DEFAULTS.baseDialogDuration;
            currentTimestamp +=
                CUTSCENE_ANIMATION_DEFAULTS.timePerTextCharacter *
                speakingLine.length;
            if (currentLine.split(":")?.length > 1) {
                currentTimestamp +=
                    CUTSCENE_ANIMATION_DEFAULTS.timeBetweenDialogLines;
            }
        }
        if (currentLine.split(" ")?.[0] === "wait") {
            currentTimestamp += Number(
                currentLine.substring(currentLine.indexOf(" ") + 1).trim()
            );
            return [...timedLines];
        } else {
            return [
                ...timedLines,
                { timestamp: currentTimestamp, line: currentLine },
            ];
        }
    }, []);
    return scriptTimes.map(({ timestamp, line }) =>
        convertTextToStageDirection(characterMap, timestamp, line)
    );
};

/**
 * Given the text data of a legacy cutscene file, parse and load it into a format understood by this JS codebase
 * @param {String} cutsceneText
 */
export const legacyCutsceneAdapter = (cutsceneText) => {
    if (!cutsceneText) {
        console.error("NO SCRIPT FOUND!");
    }
    const convertedCutscene = { characters: {}, stageDirections: [] };

    // Parse line-by-line
    const splitScript = cutsceneText
        .split("\n")
        .filter((line) => line && line.trim() !== "")
        .map((line) => line.trim());

    // Map characters defined in first few lines (after "characters", and before "lines")
    const characterLines = Array.from(splitScript).slice(
        splitScript.findIndex((line) => line === "characters") + 1,
        splitScript.findIndex((line) => line === "lines")
    );
    convertedCutscene.characters = characterLines.reduce(
        (charactersMap, characterAlias) => {
            const splitAliasLine = characterAlias
                .split("-")
                .map((word) => word?.trim() ?? "");
            return {
                ...charactersMap,
                [splitAliasLine[splitAliasLine.length - 1]]: splitAliasLine[0],
            };
        },
        {}
    );

    // Convert script lines as follows:

    // All commands get a timestamp, based on how much time of "wait [t]" and "dialog" lines came before
    // Scene commands: "setStage", "showTitle", "backgroundColourTo", "lightsUp", "lightsDown"
    // Entity commands: [alias] + ["goWastedMode", "enterStageRight", "exitStageLeft", ": {dialog}"]

    const scriptLines = splitScript.slice(
        splitScript.findIndex((line) => line === "lines") + 1
    );

    scriptLines.push("wait 10", "fin");

    convertedCutscene.stageDirections = parseCutsceneScript(
        convertedCutscene.characters,
        scriptLines
    );

    return convertedCutscene;
};

export const getCutsceneManager = async ({
    overlayCanvas,
    foregroundCanvas,
    backgroundCanvas,
    cutsceneName,
    fileName,
    onFinish,
    ...options
}) => {
    const cutsceneManagerState = {
        overlayCanvas: overlayCanvas,
        foregroundCanvas: foregroundCanvas,
        backgroundCanvas: backgroundCanvas,
        script: null,
        keyFrames: [],
        puppets: [],
        stage: Object.assign({}, CUTSCENE_STAGE_INITIAL_SETTINGS, {
            title: cutsceneName || fileName || "",
            sceneHeight: (95 / 320) * backgroundCanvas.height, // Height of main stage scene in px
        }),
        stageDirections: [],
        currentStageDirections: [],
        currentFrameTimer: 0,
        // Animation handler
        async drawFrame(cutsceneState) {
            const foregroundCanvas = cutsceneState.foregroundCanvas;
            const ctx = foregroundCanvas.getContext("2d");
            ctx.clearRect(
                0,
                0,
                foregroundCanvas.width,
                foregroundCanvas.height
            );
            ctx.strokeRect(
                0,
                0,
                foregroundCanvas.width,
                foregroundCanvas.height
            );
            drawStatusText(ctx, cutsceneState.currentFrameTimer);

            cutsceneState?.puppets?.forEach?.((puppet) =>
                puppet.draw({
                    context: ctx,
                    scalingMultiplier: backgroundCanvas.height / 320,
                })
            );
        },
        // Update logic
        advanceFrame(cutsceneState = this) {
            // Add any stage directions which are due to begin
            const nextCutsceneState = Object.assign({}, cutsceneState);
            nextCutsceneState.currentFrameTimer += 1;

            // Start processing new stage directions
            const newDirections = cutsceneState.stageDirections
                .filter(
                    (direction) =>
                        direction.timestamp <=
                        nextCutsceneState.currentFrameTimer
                )
                .map((direction) => createStageDirectionProcess(direction));

            if (IS_DEBUG && newDirections.length > 0) {
                console.log({ newDirections });
            }

            // Attach scene cues to the "stageDirections" array, while
            // removing any which have reached the end of their duration
            nextCutsceneState.currentStageDirections = [
                ...nextCutsceneState.currentStageDirections.filter(
                    (direction) => direction.duration !== 0
                ),
                ...newDirections.filter((dir) => dir.subject === "scene"),
            ];

            // Attach puppet directions directly to the target puppets
            // While removing any previous directions which have a duration counter of `0`,
            // or would have a conflict when attempting to set the animation state of the same puppet
            nextCutsceneState.puppets = cutsceneState.puppets.map((puppet) => ({
                ...puppet,
                directions: [
                    ...puppet.directions.filter(
                        (direction) =>
                            direction.duration !== 0 &&
                            (!direction.animation ||
                                !newDirections
                                    .filter(
                                        (dir) => dir.subject === puppet.name
                                    )
                                    .find((dir) => dir.animation))
                    ),
                    ...newDirections.filter(
                        (dir) => dir.subject === puppet.name
                    ),
                ],
            }));

            // Remove used stageDirections from the queue
            nextCutsceneState.stageDirections =
                cutsceneState.stageDirections.filter(
                    (direction) =>
                        direction.timestamp >
                        nextCutsceneState.currentFrameTimer
                );

            // Run all current stageDirections (they should manipluate the `stage` state, and control lighting, transitions, etc.)
            nextCutsceneState.stage =
                nextCutsceneState.currentStageDirections.reduce(
                    (newStageState, direction) =>
                        direction.cue({
                            stage: newStageState,
                            thisDirection: direction,
                            foregroundCanvas:
                                nextCutsceneState.foregroundCanvas,
                            backgroundCanvas:
                                nextCutsceneState.backgroundCanvas,
                        }),
                    cutsceneState.stage
                );

            // Decrement duration of current stage directions
            nextCutsceneState.currentStageDirections =
                nextCutsceneState.currentStageDirections.map((d) => ({
                    ...d,
                    duration: d.duration > 0 ? d.duration - 1 : d.duration,
                }));

            // Run all active puppet directions
            nextCutsceneState.puppets = nextCutsceneState.puppets.map(
                (puppet) => {
                    return puppet.directions.reduce(
                        (newPuppetState, direction) => {
                            return (
                                direction?.play?.({
                                    puppet: newPuppetState,
                                    thisDirection: direction,
                                    stage: nextCutsceneState.stage,
                                    foregroundCanvas:
                                        nextCutsceneState.foregroundCanvas,
                                }) || puppet
                            );
                        },
                        puppet
                    );
                }
            );

            // Decrement duration of puppet directions
            nextCutsceneState.puppets = nextCutsceneState.puppets.map(
                (puppet) => ({
                    ...puppet,
                    directions: puppet.directions.map((d) => ({
                        ...d,
                        duration: d.duration > 0 ? d.duration - 1 : d.duration,
                    })),
                    frameCount:
                        puppet.frameCount + ANIMATION_SLIDES_PER_FRAME > // Check if frame count goes over max frame
                        puppet.states[puppet.currentState].animationFrames
                            .length
                            ? 0
                            : puppet.frameCount + ANIMATION_SLIDES_PER_FRAME,
                })
            );

            return nextCutsceneState;
        },
        // Loop
        async perform(cutsceneState = this) {
            return new Promise((res) => {
                cutsceneState.drawFrame(cutsceneState); // async
                const nextCutsceneState =
                    cutsceneState.advanceFrame(cutsceneState);

                if (!cutsceneState.stage.isFinished) {
                    window.setTimeout(
                        () => res(nextCutsceneState.perform(nextCutsceneState)),
                        1000 / 60
                    );
                } else {
                    res(onFinish);
                }
            });
        },
        ...options,
    };

    // Initial setup for instantiating a cutscene manager

    cutsceneManagerState.script = await legacyCutsceneFetcher(cutsceneName);

    const { characters, stageDirections } = legacyCutsceneAdapter(
        cutsceneManagerState.script
    );

    cutsceneManagerState.stageDirections = stageDirections;
    cutsceneManagerState.characters = characters;

    // Load puppets and initial stage directions
    cutsceneManagerState.puppets = Object.entries(
        cutsceneManagerState.characters
    ).map(([alias, name]) =>
        createPuppet({ puppetName: name, entityData: { alias, name } })
    );

    return immutableCopy(cutsceneManagerState);
};
