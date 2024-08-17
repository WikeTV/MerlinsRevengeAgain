/**
 * Should return true if the x,y coordinate provided is within, or on an edge of, the bounding rectangle.
 * @param {{ x: Number, y: Number }} point 2D x,y coordinate
 * @param {{ top: Number, bottom: Number, left: Number, right: Number}} rectangle The rectangular bounding box, defined by the x or y coordinates of all 4 of its edges
 * @returns { Boolean }
 */
export const checkPointIsInsideRectangle = (
    point = { x: 0, y: 0 },
    rectangle = { top: 0, bottom: 1, left: 0, right: 1 }
) => {
    return (
        point.x >= rectangle.left &&
        point.x <= rectangle.right &&
        point.y >= rectangle.bottom &&
        point.y <= rectangle.top
    );
};
