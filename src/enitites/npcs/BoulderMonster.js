import { createNpc } from "./createNpc.js";
import unitSprites from "/src/spriteDefinitions/units.js";

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
                animationFrames: [{ ...unitSprites.frames["bm2.tif"] }],
            },
            recoil: {
                isReversed: true,
                animationFrames: [{ ...unitSprites.frames["bm2.tif"] }],
            },
            walking: {
                animationFrames: Array.from(unitSprites.animations["B2wa"]).map(
                    (frameName) => ({ ...unitSprites.frames[frameName] })
                ),
            },
            attacking: {
                noLoop: true,
                animationFrames: Array.from(unitSprites.animations["Bmfi"]).map(
                    (frameName) => ({ ...unitSprites.frames[frameName] })
                ),
            },
        },
        currentAnimationState: "idle",
        ...(initialValues || initialValues),
    });
    return boulderMonster;
};

export default boulderMonster;
