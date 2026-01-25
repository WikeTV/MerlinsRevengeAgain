export const getSceneByIndex = ({ map, col, row }) => {
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

export const getAdjacentScenes = ({ map, sceneColumnIndex, sceneRowIndex }) => {
    const adjacentScenes = {
        up: getSceneByIndex({
            map,
            col: sceneColumnIndex,
            row: sceneRowIndex - 1,
        }),
        right: getSceneByIndex({
            map,
            col: sceneColumnIndex + 1,
            row: sceneRowIndex,
        }),
        down: getSceneByIndex({
            map,
            col: sceneColumnIndex,
            row: sceneRowIndex + 1,
        }),
        left: getSceneByIndex({
            map,
            col: sceneColumnIndex - 1,
            row: sceneRowIndex,
        }),
    };

    // Remove empty adjacent scenes
    Object.keys(adjacentScenes).forEach((direction) => {
        if (adjacentScenes[direction]?.backgroundTiles?.[0]?.length == 0) {
            adjacentScenes[direction] = null;
        }
    });
    return adjacentScenes;
};
