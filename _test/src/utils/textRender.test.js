import { drawStatusText } from "../../../src/utils/textRender.js";

describe("drawStatusText", () => {
    const CANVAS_ID = "status-text-canvas";

    beforeEach(() => {
        const canvas = sauce.createElement("canvas");
        canvas.id = CANVAS_ID;
    });

    afterEach(() => {
        sauce.clearElements();
    });

    it("draw status text on canvas", () => {
        const canvas = sauce.getElement(CANVAS_ID);
        const ctx = canvas.getContext("2d");
        drawStatusText(ctx, "Test Status");
    });

    it("draw next line of status text on canvas", () => {
        const canvas = sauce.getElement(CANVAS_ID);
        const ctx = canvas.getContext("2d");
        drawStatusText(ctx, "Test Status", 2);
    });
});
