/*
 * This should handle all the logic required to detect when
 * scene transition arrows appear, what state they should be in,
 * and modify the state correctly when the player enters a
 * scene transition boundary.
 */

import { backgroundTileMap } from "../spriteDefinitions/background.js";
import { BASE_VIEW_WIDTH } from "../utils/constants.js";
import { oppositeDirectionLookup } from "../utils/helper.js";

const directionAngles = {
    up: 0,
    right: 90,
    down: 180,
    left: 270,
};

const arrowSprites = {
    green: JSON.parse(
        JSON.stringify(
            backgroundTileMap.frames["episode_one/arrow_green_up.tif"]
        )
    ),
    red: JSON.parse(
        JSON.stringify(backgroundTileMap.frames["episode_one/arrow_red_up.tif"])
    ),
};

/**
 * Return an array containing all entries of the 2D array that are on the
 * edge of the matrix specified by the direction.
 *
 * The 2D array should be column-indexed, left to right,
 *   with row 0 being farthest "up", and the last row being farthest "down"
 * @param {*} tileMatrix 2D array of tiles, where falsy is a missing tile, and truthy is an impassable tile
 * @param {*} direction "up" | "down" | "left" | "right"
 */
export const getBorderTiles = (tileMatrix, direction) => {
    if (direction === "left") {
        return tileMatrix[0];
    } else if (direction === "right") {
        return tileMatrix[tileMatrix.length - 1];
    } else if (direction === "up") {
        return tileMatrix.reduce((row, col) => [...row, col[0]], []);
    } else if (direction === "down") {
        return tileMatrix.reduce(
            (row, col) => [...row, col[tileMatrix[0].length - 1]],
            []
        );
    }
};

export const getTileIndices = (
    tileIndexInEdgeArray,
    tileMatrix,
    edgeDirection
) => {
    let tileX = 0;
    let tileY = 0;
    if (edgeDirection === "left") {
        tileX = 0;
        tileY = tileIndexInEdgeArray;
    } else if (edgeDirection === "right") {
        tileX = tileMatrix.length - 1;
        tileY = tileIndexInEdgeArray;
    } else if (edgeDirection === "up") {
        tileX = tileIndexInEdgeArray;
        tileY = tileMatrix[0].length - 1;
    } else if (edgeDirection === "down") {
        tileX = tileIndexInEdgeArray;
        tileY = 0;
    }

    return { x: tileX, y: tileY };
};

/**
 * Detects which tiles are valid entrypoints to an adjacent scene, and returns a list of tile coordinates,
 * along with which direction the arrows should be pointing, and whether the arrows should be green or red for each tile.
 * (Green means the adjacent scene contains entities of a different team than the player)
 * @returns [{x, y, direction: "up"|"down"|"left"|"right", color: "green"|"red" },...]
 */
export const getSceneTransitionBoundaryTiles = ({
    map,
    sceneRowIndex,
    sceneColumnIndex,
}) => {
    // Get foreground tiles in current scene
    const currentSceneForegroundTiles =
        map.scenes[sceneColumnIndex][sceneRowIndex].foregroundTiles;

    const getSceneSafe = (col, row) => {
        if (
            col >= 0 &&
            col <= map.scenes.length - 1 &&
            row >= 0 &&
            row <= map.scenes[0].length - 1
        ) {
            return map.scenes[col][row];
        } else {
            return null;
        }
    };

    const adjacentScenes = Object.fromEntries(
        Object.entries({
            up: getSceneSafe(sceneColumnIndex, sceneRowIndex - 1),
            right: getSceneSafe(sceneColumnIndex + 1, sceneRowIndex),
            down: getSceneSafe(sceneColumnIndex, sceneRowIndex + 1),
            left: getSceneSafe(sceneColumnIndex - 1, sceneRowIndex),
        }).filter(([_, value]) => value != null)
    );

    // Get the tiles of each neighboring scene which border the current scene
    const adjacentScenesEdgeTiles = Object.fromEntries(
        Object.entries(adjacentScenes).map(([direction, scene]) => [
            direction,
            getBorderTiles(
                scene.foregroundTiles,
                oppositeDirectionLookup[direction]
            ),
        ])
    );

    // True or false, whether or not there are hostile entities in the adjacent scene
    const adjacentSceneHostility = Object.fromEntries(
        Object.entries(adjacentScenes).map(([direction, scene]) => [
            direction,
            scene.entities?.some((ent) => ent.team !== "blue"), //TODO: "blue" doesn't seem very cash-money. might have to make this a constant
        ])
    );

    // Get all border tiles for the current scene on edges where there is an adjacent scene
    const currentSceneBorderTiles = Object.fromEntries(
        Object.keys(adjacentScenes).map((direction) => [
            direction,
            getBorderTiles(currentSceneForegroundTiles, direction),
        ])
    );

    // For each adjacent scene, get the bordering tiles, and add to the array of passable
    // tiles with the current scene tile index of any instances where the current scene
    // tile and its adjacent scene tile are both empty.
    const transitionTiles = Object.keys(adjacentScenes).reduce(
        (passableTiles, direction) => {
            const sceneEdgeTiles = currentSceneBorderTiles[direction];
            const adjacentBorderTiles = adjacentScenesEdgeTiles[direction];
            const isHostileScene = adjacentSceneHostility[direction];

            const edgeTileIsPassable = sceneEdgeTiles.map(
                (tile, index) =>
                    tile == null && adjacentBorderTiles[index] == null
            );

            const transitionTileCoordinates = edgeTileIsPassable
                .map((isPassable, index) => {
                    return isPassable
                        ? {
                              ...getTileIndices(
                                  index,
                                  currentSceneForegroundTiles,
                                  direction
                              ),
                              direction,
                              color: isHostileScene ? "red" : "green",
                          }
                        : null;
                })
                .filter((tile) => tile != null);

            return [...passableTiles, ...transitionTileCoordinates];
        },
        []
    );

    return transitionTiles;
};

/**
 * Draws scene transition arrows to the tile canvas. This should only be invoked once,
 * when it is detected that no enemies are left alive on the current scene.
 * The "context" passed should be the canvas context for the tile canvas.
 */
export const drawSceneTransitionBoundaries = ({
    map,
    sceneRowIndex,
    sceneColumnIndex,
    canvasElement,
    context,
}) => {
    // Safely exit if missing requirements
    if (
        map == null ||
        sceneRowIndex == null ||
        sceneColumnIndex == null ||
        canvasElement == null ||
        context == null
    ) {
        return;
    }
    const scene = map.scenes[sceneColumnIndex][sceneRowIndex];
    const backgroundTileMapPng = document.getElementById(scene.spriteSheet);

    // Paint-on scene boundary arrows for now, and handle transition logic elsewhere >:)

    let tileSize = {
        w: canvasElement.width / 18,
        h: canvasElement.height / 9,
    };

    const scalingMultiplier = canvasElement.width / BASE_VIEW_WIDTH;

    const tilesToDrawOn = getSceneTransitionBoundaryTiles({
        map,
        sceneRowIndex,
        sceneColumnIndex,
    });

    tilesToDrawOn.forEach((tile) => {
        // Get center of tile
        const {
            x: sourceX,
            y: sourceY,
            w: sourceW,
            h: sourceH,
        } = arrowSprites[tile.color];

        const drawCoordinates = {
            x: tile.x * tileSize.w,
            y: tile.y * tileSize.h,
        };

        // Draw transition arrow within tile
        context.drawImage(
            backgroundTileMapPng,
            sourceX,
            sourceY,
            sourceW,
            sourceH,
            drawCoordinates.x,
            drawCoordinates.y,
            sourceW * scalingMultiplier,
            sourceH * scalingMultiplier
        );

        //TODO: draw a couple arrows for each tile
        //TODO: ensure tiles are edge-aligned

        // //! Entity draw function (WIP)
        // const currentFrame =
        //     currentAnimationStateObject.animationFrames[
        //         Math.floor(this.frameCount ?? 0)
        //     ];
        // const { x: sx, y: sy, w: sw, h: sh } = currentFrame.frame;
        // let scaledX = this.x * scalingMultiplier;
        // let scaledY = this.y * scalingMultiplier;
        // let spriteWidth = (this?.baseWidth ?? sw) * scalingMultiplier;
        // let spriteHeight = (this.baseHeight ?? sh) * scalingMultiplier;

        // context.save();

        // // Hitbox visualization
        // if (showHitbox) {
        //     context.strokeStyle = "red";
        //     context.strokeRect(
        //         scaledX - spriteWidth / 2,
        //         scaledY - spriteHeight / 2,
        //         spriteWidth,
        //         spriteHeight
        //     );
        //     context.strokeStyle = "black";
        // }

        // // Apply visual modifiers
        // context.globalAlpha = this.visualModifiers.opacity;

        // // Center context on sprite in spritesheet
        // context.translate(scaledX, scaledY);

        // // Apply sprite rotation
        // context.rotate(((this.rotation ?? 0) * Math.PI) / 180);

        // // Apply horizontal flip
        // if (this.reverseImage) {
        //     context.scale(-1, 1);
        // }
        // if (currentAnimationStateObject.isReversed) {
        //     context.scale(-1, 1);
        // }

        // // Source image coordinates
        // const source = [sx, sy, sw, sh];

        // // Start coordinates and size dimensions of image destination on canvas
        // // Apply image stretching here
        // const destination = [
        //     ((this.reverseImage ? spriteWidth : -1 * spriteWidth) *
        //         this.visualModifiers.stretchX) /
        //         2,
        //     (-1 * spriteHeight * this.visualModifiers.stretchY) / 2,
        //     (this.reverseImage ? -1 * spriteWidth : spriteWidth) *
        //         this.visualModifiers.stretchX,
        //     spriteHeight * this.visualModifiers.stretchY,
        // ];

        // // Render sprite to canvas
        // // image element, spriteLocationX, spriteLocationY, spriteWidth, spriteHeight, canvasPositionX, canvasPositionY, drawWidth, drawHeight
        // context.drawImage(this.spriteSheet, ...source, ...destination);

        // // if (
        // //     Math.floor(this.frameCount) <
        // //     currentAnimationStateObject.animationFrames.length - 1
        // // ) {
        // //     this.frameCount +=
        // //         currentAnimationStateObject.animationSpeed ?? 0.2; // Default animation speed will be 5 frames per image
        // // } else {
        // //     this.frameCount = 0;
        // //     if (currentAnimationStateObject?.onFinish) {
        // //         currentAnimationStateObject.onFinish(this);
        // //     }
        // //     if (currentAnimationStateObject?.noLoop) {
        // //         this.animationTimer = 0;
        // //         this.currentAnimationState =
        // //             currentAnimationStateObject?.noLoop;
        // //     }
        // // }
        // context.restore();
    });
};
