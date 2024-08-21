import { createNpc } from "./createNpc.js";
import { unitTileMap } from "../../spriteDefinitions/units.js";

const boulderMonster = (initialValues) => {
    const { update: baseUpdate } = initialValues;
    const boulderMonster = createNpc({
        baseWidth: 45,
        baseHeight: 45,
        attackRange: 200,
        spriteSheet: document.getElementById("character-sprites"),
        animationStates: {
            idle: {
                isReversed: true,
                animationFrames: [{ ...unitTileMap.frames["bm2.tif"] }],
            },
            recoil: {
                isReversed: true,
                animationFrames: [{ ...unitTileMap.frames["bm2.tif"] }],
            },
            walking: {
                animationFrames: Array.from(unitTileMap.animations["B2wa"]).map(
                    (frameName) => ({ ...unitTileMap.frames[frameName] })
                ),
            },
            attacking: {
                noLoop: true,
                animationFrames: Array.from(unitTileMap.animations["Bmfi"]).map(
                    (frameName) => ({ ...unitTileMap.frames[frameName] })
                ),
            },
        },
        currentAnimationState: "idle",
        ...(initialValues || initialValues),
    });
    return boulderMonster;
};

export default boulderMonster;
