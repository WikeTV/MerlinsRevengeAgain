import { getSceneTransitionBoundaryTiles } from "../../../src/scenes/transitionHandler.js";
import { mockMap } from "../../_data/map.mock.js";

describe("getSceneTransitionBoundaryTiles", () => {
    const map = JSON.parse(JSON.stringify(mockMap));

    const scene = { col: 0, row: map.scenes[0].length - 1 };

    it(`scene index: [${scene?.col}, ${scene?.row}]`, () => {
        const canvas = sauce.createElement("canvas");
        const context = canvas.getContext("2D");
    });

    it("return correct tiles", () => {
        const tiles = getSceneTransitionBoundaryTiles({
            map,
            sceneRowIndex: scene?.row,
            sceneColumnIndex: scene?.col,
        });

        console.log({tiles})

        // Should be 11 transition-eligible tiles in this scene
        sauce.assertEqual(true, tiles.length === 11)
    });
});

describe("drawSceneTransitionBoundaries", () => {
    const CANVAS_ID = "scene-transition-canvas";

    beforeEach(() => {
        const canvas = sauce.createElement("canvas");
        canvas.id = CANVAS_ID;
    });

    afterEach(() => {
        sauce.clearElements();
    });
});
