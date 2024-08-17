import { legacyCutsceneFetcher } from "../utils/fileFetcher.js";
import { immutableCopy } from "../utils/helper.js";
import {
    CUTSCENE_ENTITIES,
    CUTSCENE_ANIMATION_DEFAULTS,
    CUTSCENE_STAGE_INITIAL_SETTINGS,
} from "../utils/constants.js";
import { createPuppet } from "./puppet.js";
import { drawStatusText } from "../utils/textRender.js";

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
        options.process = firstWord;
        options.data = lastWords.trim();
    }

    return getKeyFrame(options);
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

    convertedCutscene.stageDirections = convertScriptLinesToKeyFrames(
        convertedCutscene.characters,
        scriptLines
    );

    console.log({ splitScript, characterLines, scriptLines });

    return convertedCutscene;
};
