import { createEntityOfType } from "../enitites/entityFactory.js";
import { CUTSCENE_ENTITIES } from "../utils/constants.js";

export const createPuppet = ({ puppetName, entityData = {} }) => {
    const puppetBase = {
        isPuppet: true,
        speed: 2.6,
        update() {
            console.log("puppets can't move on their own (:")
        },
        checkWallCollision() {
            console.log("No walls in this production! (puppets should not check for wall collision)")
        },
        directions: [], // Processes which will alter the puppet's state when run
        dialog: [],
        spriteSheetId: "character-sprites",
        currentState: "idle",
        x: -100, // Puppets start offscreen by default
        y: -100,
    };

    const valueOverrides = Object.assign({}, puppetBase, entityData)

    return createEntityOfType(
        CUTSCENE_ENTITIES[puppetName],
        valueOverrides
    );
};
