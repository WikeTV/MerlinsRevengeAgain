
/**
 * Status text display helper
 * @param {Context} context - the canvas 2D context to draw to
 * @param {String} status - The text to draw
 * @param {Number} lineHeight - Which line the text should be positioned on
 */
export const drawStatusText = (context, status, lineHeight = 1) => {
    context.save();
    context.font = "oblique bold 30px Helvetica";
    context.fillStyle = "white";
    context.fillText(status, 10, 30 * lineHeight);
    context.lineWidth = 1.5;
    context.strokeStyle = "black";
    context.strokeText(status, 10, 30 * lineHeight);
    context.restore();
};
