import { Vector2D } from "../../../src/utils/Vector2D.js";

const GRID_PLANE_ORIGIN = Object.freeze({ x: 0, y: 0 });
const TEST_VECTOR_ENDS = Object.freeze({
    start: GRID_PLANE_ORIGIN,
    end: { x: GRID_PLANE_ORIGIN.x + 1, y: GRID_PLANE_ORIGIN.x + 1 },
});

describe("Vector2D", () => {
    beforeEach(() => {
        return {
            testVector: new Vector2D(
                TEST_VECTOR_ENDS.start,
                TEST_VECTOR_ENDS.end
            ),
        };
    });

    it("creates a Vector", () => {
        new Vector2D({ x: 0, y: 0 }, { x: 1, y: 1 });
    });

    it("gives correct end posistion", ({ testVector } = {}) => {
        sauce.assertEqual(testVector.getEndPosition(), { x: 1, y: 1 });
    });
});

describe("Vector2D.createParallelVector()", () => {
    beforeEach(() => {
        return {
            testVector: new Vector2D(
                TEST_VECTOR_ENDS.start,
                TEST_VECTOR_ENDS.end
            ),
        };
    });

    it(" creates an identical vector", ({ testVector }) => {
        // Check testVector
        sauce.assertEqual(testVector, testVector.createParallelVector());

        // Check 4 cardinal directions of vectors
        //? Note: "up" in this coordinate plane is referring to
        //? higher up on the canvas, which is in the -y direction
        const vectorUp = new Vector2D(GRID_PLANE_ORIGIN, {
            x: GRID_PLANE_ORIGIN.x,
            y: GRID_PLANE_ORIGIN.y - 1,
        });
        console.log(vectorUp, vectorUp.createParallelVector());
        sauce.assertEqual(vectorUp, vectorUp.createParallelVector());

        const vectorDown = new Vector2D(GRID_PLANE_ORIGIN, {
            x: GRID_PLANE_ORIGIN.x,
            y: GRID_PLANE_ORIGIN.y + 1,
        });
        sauce.assertEqual(vectorDown, vectorDown.createParallelVector());

        const vectorLeft = new Vector2D(GRID_PLANE_ORIGIN, {
            x: GRID_PLANE_ORIGIN.x - 1,
            y: GRID_PLANE_ORIGIN.y,
        });
        sauce.assertEqual(vectorLeft, vectorLeft.createParallelVector());

        const vectorRight = new Vector2D(GRID_PLANE_ORIGIN, {
            x: GRID_PLANE_ORIGIN.x + 1,
            y: GRID_PLANE_ORIGIN.y,
        });
        sauce.assertEqual(vectorRight, vectorRight.createParallelVector());
    });
});
