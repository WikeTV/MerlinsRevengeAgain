import tileSet from "../spriteDefinitions/background.js";

export const renderSceneTiles = (
    canvasElement,
    context,
    scene,
    { skipBackground, skipForeground, drawGridLines } = {}
) => {
    let tileSize = {
        w: canvasElement.width / 18,
        h: canvasElement.height / 9,
    };
    const tilesetPng = document.getElementById(scene.spriteSheet);
    if (!skipBackground) {
        scene.backgroundTiles.forEach((column, columnNumber) => {
            // columnNumber is the "X" coordinate
            column.forEach((tileName, rowNumber) => {
                // rowNumber is the "Y" coordinate
                if (Boolean(tileName)) {
                    let backgroundTileSprite = tileSet.frames[tileName]?.frame;
                    let { gridX, gridY, gridW, gridH } = {
                        gridX: columnNumber * tileSize.w,
                        gridY: rowNumber * tileSize.h,
                        gridW: tileSize.w,
                        gridH: tileSize.h,
                    };
                    const {
                        x: sourceX,
                        y: sourceY,
                        w: sourceW,
                        h: sourceH,
                    } = backgroundTileSprite || {};
                    context.drawImage(
                        tilesetPng,
                        sourceX,
                        sourceY,
                        sourceW,
                        sourceH,
                        // 1% size increase to fill any gaps that may be present due to imperfect scaling atrifacts
                        gridX - gridW * 0.01,
                        gridY - gridH * 0.01,
                        gridW + gridW * 0.02,
                        gridH + gridH * 0.02
                    );
                }
            });
        });
    }
    if (!skipForeground) {
        scene.foregroundTiles.forEach((column, columnNumber) => {
            // columnNumber is the "X" coordinate
            column.forEach((tileName, rowNumber) => {
                // rowNumber is the "Y" coordinate
                if (Boolean(tileName)) {
                    let foregroundTileSprite = tileSet.frames[tileName]?.frame;
                    let { gridX, gridY, gridW, gridH } = {
                        gridX: columnNumber * tileSize.w,
                        gridY: rowNumber * tileSize.h,
                        gridW: canvasElement.width / 18,
                        gridH: canvasElement.height / 9,
                    };
                    const {
                        x: sourceX,
                        y: sourceY,
                        w: sourceW,
                        h: sourceH,
                    } = foregroundTileSprite || {};
                    context.drawImage(
                        tilesetPng,
                        sourceX,
                        sourceY,
                        sourceW,
                        sourceH,
                        gridX - gridW * 0.01,
                        gridY - gridH * 0.01,
                        gridW + gridW * 0.02,
                        gridH + gridH * 0.02
                    );
                }
            });
        });
    }
    if (Boolean(drawGridLines)) {
        scene.foregroundTiles.forEach((column, columnNumber) => {
            // columnNumber is the "X" coordinate
            column.forEach((tileName, rowNumber) => {
                // rowNumber is the "Y" coordinate
                let { gridX, gridY, gridW, gridH } = {
                    gridX: columnNumber * tileSize.w,
                    gridY: rowNumber * tileSize.h,
                    gridW: canvasElement.width / 18,
                    gridH: canvasElement.height / 9,
                };
                context.save();
                context.strokeStyle = "black";
                context.strokeRect(gridX, gridY, gridW, gridH);
                if (
                    (skipBackground && !tileName) ||
                    (skipForeground &&
                        !scene.backgroundTiles[columnNumber][rowNumber])
                ) {
                    context.font = `${Math.round(gridW / 3)}px Helvetica`;
                    context.fillText(
                        columnNumber + ", " + rowNumber,
                        gridX + 2,
                        gridY + gridH / 2,
                        gridW
                    );
                }
                context.restore();
            });
        });
    }
};
