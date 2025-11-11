import { renderSceneTiles } from "./renderScene.js";
import { rescaleElement } from "../utils/scaling.js";
import { publicJSONFileLoader } from "../utils/fileFetcher.js";
import { immutableCopy } from "../utils/helper.js";
import {
    drawSceneTransitionBoundaries,
    getSceneTransitionBoundaryTiles,
} from "./transitionHandler.js";
import { getAdjacentScenes } from "../utils/scenes.js";

export const getSceneManager = ({ tileDisplayCanvasElement }) => {
    const sceneManagerState = {
        gameMap: null,
        currentScene: null,
        currentSceneIndex: { col: 0, row: 0 },
        transitionTiles: [],
        adjacentScenes: { top: null, right: null, bottom: null, left: null },
        canvas: tileDisplayCanvasElement,
        ctx: tileDisplayCanvasElement.getContext("2d"),
        loadAdjacentScene({ direction, entityManager }) {
            const newSceneManagerState = { ...this };

            // Save current scene's entities (excluding player) back to gameMap ephemeral state
            newSceneManagerState.gameMap.scenes[this.currentSceneIndex.col][
                this.currentSceneIndex.row
            ].entities = entityManager
                .getCurrentState()
                .entities.filter((ent) => ent.type !== "Player");

            switch (direction) {
                case "up":
                    newSceneManagerState.currentSceneIndex.row -= 1;
                    break;
                case "down":
                    newSceneManagerState.currentSceneIndex.row += 1;
                    break;
                case "left":
                    newSceneManagerState.currentSceneIndex.col -= 1;
                    break;
                case "right":
                    newSceneManagerState.currentSceneIndex.col += 1;
                    break;
                default:
                    throw new Error(
                        `Invalid direction "${direction}" passed to loadAdjacentScene.`
                    );
            }
            newSceneManagerState.currentScene =
                newSceneManagerState.gameMap.scenes[
                    newSceneManagerState.currentSceneIndex.col
                ][newSceneManagerState.currentSceneIndex.row];
            newSceneManagerState.adjacentScenes = getAdjacentScenes({
                map: newSceneManagerState.gameMap,
                sceneColumnIndex: newSceneManagerState.currentSceneIndex.col,
                sceneRowIndex: newSceneManagerState.currentSceneIndex.row,
            });
            newSceneManagerState.transitionTiles =
                getSceneTransitionBoundaryTiles({
                    map: newSceneManagerState.gameMap,
                    sceneColumnIndex:
                        newSceneManagerState.currentSceneIndex.col,
                    sceneRowIndex: newSceneManagerState.currentSceneIndex.row,
                });

            // Draw scene tiles, then return updated state
            newSceneManagerState.drawScene();
            return immutableCopy(newSceneManagerState);
        },
        drawScene({ customCanvas, customContext, options } = {}) {
            const sceneManagerState = { ...this };
            const ctx = customContext ?? sceneManagerState.ctx;
            const canvas = customCanvas ?? sceneManagerState.canvas;

            if (sceneManagerState.currentScene) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                renderSceneTiles(
                    canvas,
                    ctx,
                    sceneManagerState.currentScene,
                    options
                );
            }
            return immutableCopy(sceneManagerState);
        },
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
        sceneManagerState.gameMap = await publicJSONFileLoader(filePath);

        // Select initially loaded scene as the one with merlin in it at the start
        sceneManagerState.gameMap.scenes.forEach((sceneCol, c) =>
            sceneCol.forEach((scene, r) => {
                if (
                    !sceneManagerState.currentScene &&
                    scene.entities?.find((entity) => entity.name === "merlin")
                ) {
                    sceneManagerState.currentScene = scene;
                    sceneManagerState.currentSceneIndex = { col: c, row: r };
                    sceneManagerState.adjacentScenes = getAdjacentScenes(
                        sceneManagerState.gameMap,
                        c,
                        r
                    );
                    sceneManagerState.transitionTiles =
                        getSceneTransitionBoundaryTiles({
                            map: sceneManagerState.gameMap,
                            sceneColumnIndex: c,
                            sceneRowIndex: r,
                        });
                }
            })
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

    sceneManagerState.drawTransitionArrows = () => {
        drawSceneTransitionBoundaries({
            map: sceneManagerState.gameMap,
            sceneRowIndex: sceneManagerState.currentSceneIndex.row,
            sceneColumnIndex: sceneManagerState.currentSceneIndex.col,
            canvasElement: sceneManagerState.canvas,
            context: sceneManagerState.ctx,
        });
    };

    sceneManagerState.getScene = () => sceneManagerState.currentScene;

    return immutableCopy(sceneManagerState);
};
