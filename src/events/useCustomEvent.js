import { CANVAS_DIV_ID } from "../utils/constants.js";

export const emitCustomGameEvent = (options) => {
    const event = new CustomEvent("gameEvent", { detail: options});
    document.getElementById(CANVAS_DIV_ID).dispatchEvent(event);
    return event;
}
