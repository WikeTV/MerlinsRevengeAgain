import { renderSceneTiles } from "./renderScene.js";
import { rescaleElement } from "../utils/scaling.js";
import { publicJSONFileLoader } from "../utils/fileFetcher.js";
import { immutableCopy } from "../utils/helper.js";

export const getSceneManager = ({ tileDisplayCanvasElement }) => {
    const sceneManagerState = {
        map: null,
        currentScene: null,
        canvas: tileDisplayCanvasElement,
        ctx: tileDisplayCanvasElement.getContext("2d"),
    };

    sceneManagerState.drawScene = ({
        customCanvas,
        customContext,
        options,
    } = {}) => {
        if (sceneManagerState.currentScene) {
            (customContext ?? sceneManagerState.ctx).clearRect(
                0,
                0,
                (customCanvas ?? sceneManagerState.canvas).width,
                (customCanvas ?? sceneManagerState.canvas).height
            );
            renderSceneTiles(
                customCanvas ?? sceneManagerState.canvas,
                customContext ?? sceneManagerState.ctx,
                sceneManagerState.currentScene,
                options
            );
        } else {
            throw new Error(
                "No sceneManagerState.currentScene loaded. Unable to render nothing."
            );
        }
        return immutableCopy(sceneManagerState);
    };
    // Dev method
    sceneManagerState.loadSceneFromFile = async (filePath) => {
        let newScene = await publicJSONFileLoader(filePath);
        sceneManagerState.currentScene = newScene;
        sceneManagerState.drawScene();
        return immutableCopy(sceneManagerState);
    };
    sceneManagerState.loadSceneFromJSON = (fileText) => {
        let newScene;
        try {
            newScene = JSON.parse(fileText);
            sceneManagerState.currentScene = newScene;
            sceneManagerState.drawScene();
        } catch (err) {
            console.error(err);
        }
        return immutableCopy(sceneManagerState);
    };
    sceneManagerState.loadMap = async (filePath) => {
        // Retrieve file data
        sceneManagerState.map = await publicJSONFileLoader(filePath);

        // Select initially loaded scene as the one with merlin in it at the start
        sceneManagerState.map.scenes.forEach((sceneCol) =>
            sceneCol.forEach(
                (scene) =>
                    (sceneManagerState.currentScene = scene.entities?.find(
                        (entity) => entity.name === "merlin"
                    )
                        ? scene
                        : sceneManagerState.currentScene)
            )
        );
        sceneManagerState.drawScene();
        return immutableCopy(sceneManagerState);
    };
    sceneManagerState.resizeCanvas = ({ scalingMultiplier, style = {} }) => {
        rescaleElement(sceneManagerState.canvas, scalingMultiplier);
        Object.assign(sceneManagerState.canvas.style, style);
        if (sceneManagerState.currentScene) {
            sceneManagerState.drawScene();
        }
        return immutableCopy(sceneManagerState);
    };
    sceneManagerState.initializeEmptyScene = ({ spriteSheetId } = {}) => {
        const newScene = {
            spriteSheet: spriteSheetId ?? "tileset",
            foregroundTiles: [],
            backgroundTiles: [],
        };
        for (let col = 0; col < 18; col++) {
            newScene.backgroundTiles.push(Array.from(Array(9)));
        }
        for (let col = 0; col < 18; col++) {
            newScene.foregroundTiles.push(Array.from(Array(9)));
        }
        sceneManagerState.currentScene = newScene;
        return immutableCopy(sceneManagerState);
    };

    sceneManagerState.getScene = () => sceneManagerState.currentScene;

    return immutableCopy(sceneManagerState);
};
