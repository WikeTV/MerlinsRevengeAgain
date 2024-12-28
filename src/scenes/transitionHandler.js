/*
 * This should handle all the logic required to detect when
 * scene transition arrows appear, what state they should be in,
 * and modify the state correctly when the player enters a
 * scene transition boundary.
 */

import { uiTileMap } from "../../spriteDefinitions/ui"

const directionAngles = {
    "up": 0,
    "right": 90,
    "down": 180,
    "left": 270,
}

const arrowSprites = {
    "green": JSON.parse(JSON.stringify(uiTileMap.frames["episode_one/arrow_green.tif"])),
    "red": JSON.parse(JSON.stringify(uiTileMap.frames["episode_one/arrow_red.tif"]))
}

/**
 * Detects which tiles are valid entrypoints to an adjacent scene, and returns a list of tile coordinates,
 * along with which direction the arrows should be pointing, and whether the arrows should be green or red for each tile.
 * (Green means the adjacent scene contains entities of a different team than the player)
 * @returns [{x, y, direction: "up"|"down"|"left"|"right", color: "green"|"red" },...]
 */
export const getSceneTransitionBoundaryTiles = ({map, sceneRowIndex, sceneColumnIndex}) => {
    // Get foreground tiles in current scene
    const currentSceneForegroundTiles = ""
}

/**
 * Draws scene transition arrows to the tile canvas. This should only be invoked once,
 * when it is detected that no enemies are left alive on the current scene.
 * The "context" passed should be the canvas context for the tile canvas.
 */
export const drawSceneTransitionBoundaries = ({map, sceneRowIndex, sceneColumnIndex, canvasElement, context, scalingMultiplier}) => {
    // Paint-on scene boundary arrows for now, and handle transition logic elsewhere >:)

    let tileSize = {
        w: canvasElement.width / 18,
        h: canvasElement.height / 9,
    };

    const tilesToDrawOn = getSceneTransitionBoundaryTiles({map, sceneRowIndex, sceneColumnIndex});

    tilesToDrawOn.forEach(tile => {
        // Get center of tile
        const {
            x: sourceX,
            y: sourceY,
            w: sourceW,
            h: sourceH,
        } = arrowSprites[tile.color];

        const drawCoordinates = {
            x: tile.x * (tileSize.w / 2),
            y: tile.y * (tileSize.h / 2),
        };

        context.drawImage(
            backgroundTileMapPng,
            sourceX,
            sourceY,
            sourceW,
            sourceH,
            drawCoordinates.x,
            drawCoordinates.y,
            sourceW,
            sourceH
        );
    });
}