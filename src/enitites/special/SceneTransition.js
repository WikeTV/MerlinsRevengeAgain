import { immutableCopy } from "../../utils/helper.js";

const SceneTransition = (initialValues = {}) => {
    const transitionArrows = {
        spriteSheetId: "tileset",
        type: "sceneTransition",
    };

    return immutableCopy(transitionArrows);
};

export default SceneTransition;
