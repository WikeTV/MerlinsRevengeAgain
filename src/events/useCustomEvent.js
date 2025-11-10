import { CANVAS_DIV_ID } from "../utils/constants.js";

// Emits an event from the main game canvas div element, to be captured by the event manager
export const emitCustomGameEvent = (options) => {
    const event = new CustomEvent("gameEvent", { detail: options });
    document.getElementById(CANVAS_DIV_ID).dispatchEvent(event);
    return event;
};
