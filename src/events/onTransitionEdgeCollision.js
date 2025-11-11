import { emitCustomGameEvent } from "./useCustomEvent.js";

export const SCENE_EDGE_COLLISION_EVENT_NAME = "playerTouchedSceneEdge";

const edgeDirections = {
    top: "up",
    bottom: "down",
    left: "left",
    right: "right",
};

export const emitPlayerTouchedSceneEdge = ({
    sceneEdge, // "top", "bottom", "left", "right"
    positionCoordinates, // x, y
    ...other
}) => {
    return emitCustomGameEvent({
        name: SCENE_EDGE_COLLISION_EVENT_NAME,
        sceneEdge,
        direction: edgeDirections[sceneEdge],
        positionCoordinates,
        ...other,
    });
};
