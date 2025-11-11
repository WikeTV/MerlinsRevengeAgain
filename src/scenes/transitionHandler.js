/*
 * This should handle all the logic required to detect when
 * scene transition arrows appear, what state they should be in,
 * and modify the state correctly when the player enters a
 * scene transition boundary.
 */

import { backgroundTileMap } from "../spriteDefinitions/background.js";
import { BASE_VIEW_WIDTH } from "../utils/constants.js";
import { oppositeDirectionLookup } from "../utils/helper.js";
import { getAdjacentScenes } from "../utils/scenes.js";

const directionAngles = {
    up: 0,
    right: 90,
    down: 180,
    left: 270,
};

const arrowSprites = {
    green: {
        up: JSON.parse(
            JSON.stringify(
                backgroundTileMap.frames["episode_one/arrow_green_up.tif"]
            )
        ),
        down: JSON.parse(
            JSON.stringify(
                backgroundTileMap.frames["episode_one/arrow_green_down.tif"]
            )
        ),
        right: JSON.parse(
            JSON.stringify(
                backgroundTileMap.frames["episode_one/arrow_green.tif"]
            )
        ),
        left: JSON.parse(
            JSON.stringify(
                backgroundTileMap.frames["episode_one/arrow_green_left.tif"]
            )
        ),
    },
    red: {
        up: JSON.parse(
            JSON.stringify(
                backgroundTileMap.frames["episode_one/arrow_red_up.tif"]
            )
        ),
        down: JSON.parse(
            JSON.stringify(
                backgroundTileMap.frames["episode_one/arrow_red_down.tif"]
            )
        ),
        right: JSON.parse(
            JSON.stringify(
                backgroundTileMap.frames["episode_one/arrow_red.tif"]
            )
        ),
        left: JSON.parse(
            JSON.stringify(
                backgroundTileMap.frames["episode_one/arrow_red_left.tif"]
            )
        ),
    },
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
    } else if (edgeDirection === "down") {
        tileX = tileIndexInEdgeArray;
        tileY = tileMatrix[0].length - 1;
    } else if (edgeDirection === "up") {
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

    const adjacentScenes = Object.fromEntries(
        Object.entries(
            getAdjacentScenes({ map, sceneColumnIndex, sceneRowIndex })
        ).filter(([_, value]) => value != null)
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
            scene.entities?.some((ent) => ent.team !== "blue" && !ent.isDead), //TODO: "blue" should be an imported const, probably
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

    /**
        {
            frame: { x: 1565, y: 239, w: 16, h: 16 },
            rotated: false,
            trimmed: false,
            spriteSourceSize: { x: 0, y: 0, w: 16, h: 16 },
            sourceSize: { w: 16, h: 16 },
        }
     */

    tilesToDrawOn.forEach((tile) => {
        let translation = { x: 0, y: 0 };
        // Adjust drawing position based on arrow direction
        if (tile.direction === "up") {
            translation.y = 0;
            translation.x = -4 * scalingMultiplier;
        } else if (tile.direction === "down") {
            translation.y = 20 * scalingMultiplier;
            translation.x = -4 * scalingMultiplier;
        } else if (tile.direction === "left") {
            translation.x = 0;
            translation.y = -4 * scalingMultiplier;
        } else if (tile.direction === "right") {
            translation.x = 20 * scalingMultiplier;
            translation.y = -4 * scalingMultiplier;
        }

        const {
            x: sourceX,
            y: sourceY,
            w: sourceW,
            h: sourceH,
        } = arrowSprites[tile.color][tile.direction].frame;

        // Get center of tile
        const drawCoordinates = {
            x: tile.x * tileSize.w + translation.x,
            y: tile.y * tileSize.h + translation.y,
        };

        // Draw 2 transition arrows within tile, side by side
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
        context.drawImage(
            backgroundTileMapPng,
            sourceX,
            sourceY,
            sourceW,
            sourceH,
            drawCoordinates.x +
                (["up", "down"].includes(tile.direction) ? 12 : 0) *
                    scalingMultiplier,
            drawCoordinates.y +
                (["left", "right"].includes(tile.direction) ? 12 : 0) *
                    scalingMultiplier,
            sourceW * scalingMultiplier,
            sourceH * scalingMultiplier
        );
        context.drawImage(
            backgroundTileMapPng,
            sourceX,
            sourceY,
            sourceW,
            sourceH,
            drawCoordinates.x +
                (["up", "down"].includes(tile.direction) ? 24 : 0) *
                    scalingMultiplier,
            drawCoordinates.y +
                (["left", "right"].includes(tile.direction) ? 24 : 0) *
                    scalingMultiplier,
            sourceW * scalingMultiplier,
            sourceH * scalingMultiplier
        );

        //TODO: ensure tiles are edge-aligned
    });
};
