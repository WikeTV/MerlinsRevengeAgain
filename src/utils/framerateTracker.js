import { TARGET_FRAMERATE, MILLISECONDS_PER_FRAME } from "./constants.js";

const SECONDS_OF_FRAMETIMES_TO_REMEMBER = 1;

export const getFramerateTracker = () => {
    const framerateTracker = {
        startTime: window.performance.now(),
        frameTimeStamps: [], // Precise time in milliseconds
        currentFrameRate: 0,
        currentExecutionTimeEstimate: 0,
        // This method should be executed once per code execution loop
        // This gets the expected amount of time that the browser should wait before rendering the next frame, to ensure consistent framerate
        calculateFrameRate() {
            const newState = Object.assign({}, this); // Immutability is easier (or something like that)
            const currentTimestamp = window.performance.now();

            // Save the amount of time it took to render the last frame
            newState.frameTimeStamps.push(currentTimestamp);

            // Set current framerate, using timestamp of most recent frame and oldest frame timestamp in buffer
            newState.currentFrameRate = Math.round(
                1000 /
                    (currentTimestamp - newState.frameTimeStamps[0] > 0
                        ? (currentTimestamp - newState.frameTimeStamps[0]) /
                          (newState.frameTimeStamps.length - 1)
                        : MILLISECONDS_PER_FRAME)
            );

            // Persist only most recent frame times
            newState.frameTimeStamps = Array.from(
                newState.frameTimeStamps
            ).filter(
                (timeStamp) =>
                    timeStamp >=
                    currentTimestamp - MILLISECONDS_PER_FRAME * TARGET_FRAMERATE * SECONDS_OF_FRAMETIMES_TO_REMEMBER
            );

            return newState;
        },
    };
    return Object.assign({}, framerateTracker);
};
