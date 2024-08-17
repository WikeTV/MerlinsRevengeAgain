//TODO: Refactor maps to be row-major instead of column-major (adhere to more common convention)

import {
    createCustomizedElement,
    createButton,
    downloadBlob,
} from "./htmlHelpers.js";
import {
    insertColumnIn2DArray,
    insertRowIn2DArray,
    removeColumnFrom2DArray,
    removeRowFrom2DArray,
} from "./arrayFunctions.js";

const ROW_HEIGHT = 50;
const COLUMN_WIDTH = 70;

const defaultScenePlaceholder = {
    name: "",
    foregroundTiles: [[]],
    backgroundTiles: [[]],
    entities: [],
};

const gameMap = {
    name: "test",
    scenes: [[]],
    selectedScene: null,
};

const tableDivRef = { current: null };

// Get data of scene currently saved in selected slot
const getCurrentlySelectedScene = () => {
    return gameMap.scenes[gameMap.selectedScene[0]][gameMap.selectedScene[1]];
};

// This should an array that specifies the array index and column index [x, y] of the newly selected scene
const setSelectedScene = (sceneIndex) => {
    gameMap.selectedScene = sceneIndex;
};

const createScenePickerElement = (
    sceneName = "",
    props = {},
    options = { isSelected: false }
) => {
    return createCustomizedElement({
        tagName: "button",
        innerText: sceneName,
        style: {
            width: COLUMN_WIDTH + "px",
            height: ROW_HEIGHT + "px",
            display: "flex",
            textAlign: "center",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            border: options.isSelected ? "solid 2px purple" : "solid 1px gray",
            "&:hover": { color: "blue" },
        },
        ...props,
    });
};

let onSceneSelect = (scene) => {};

const insertSceneColumnInMap = (insertAtIndex, emptyItem) => {
    gameMap.scenes = insertColumnIn2DArray(
        gameMap.scenes,
        insertAtIndex,
        emptyItem
    );
    if (gameMap.selectedScene && insertAtIndex <= gameMap.selectedScene[0]) {
        gameMap.selectedScene[0]++;
    }
};

const removeSceneColumnFromMap = (removeAtIndex) => {
    gameMap.scenes = removeColumnFrom2DArray(gameMap.scenes, removeAtIndex);
    if (gameMap.selectedScene && removeAtIndex <= gameMap.selectedScene[0]) {
        setSelectedScene(null);
    }
};

const insertSceneRowInMap = (insertAtIndex, emptyItem) => {
    gameMap.scenes = insertRowIn2DArray(
        gameMap.scenes,
        insertAtIndex,
        emptyItem
    );
    if (gameMap.selectedScene && insertAtIndex <= gameMap.selectedScene[1]) {
        gameMap.selectedScene[1]++;
    }
};

const removeSceneRowFromMap = (removeAtIndex) => {
    gameMap.scenes = removeRowFrom2DArray(gameMap.scenes, removeAtIndex);
    if (gameMap.selectedScene && removeAtIndex === gameMap.selectedScene[1]) {
        setSelectedScene(null);
    }
};


// Create a table cell for each scene in the map
// The full table will overwrite the innerHTML of the container element
// mapGrid should be at least an empty 2-d array `[[]]`
// mapGrid must be rectangular, or else there will be out of bounds errors
const renderMapButtonGrid = (containerElement) => {
    let mapGrid = gameMap.scenes;
    // Prevent errors from null parameter input
    if (!mapGrid || !mapGrid[0] || !containerElement || mapGrid.length === 0) {
        return;
    }

    // forEach column, add each element to a separate table row
    containerElement.innerHTML = "";
    const tableElement = createCustomizedElement({ tagName: "table" });
    const tableBodyElement = createCustomizedElement({ tagName: "tbody" });

    // Take length of the first column and create a tableRow element for each one
    const tableRowElements = mapGrid[0].map?.(() =>
        createCustomizedElement({ tagName: "tr" })
    );

    // Traverse column pointers
    mapGrid.forEach((column, columnIndex) => {
        // Traverse element pointers
        column.forEach((scene, rowIndex) => {
            // Create tableCell element with scene name displayed on a button inside
            let tableCellElement = createCustomizedElement({
                tagName: "td",
                innerHTML: "",
            });
            const [selectedColumn, selectedRow] = gameMap?.selectedScene ?? [];
            let sceneItem = createScenePickerElement(
                scene.name ?? "Unnamed",
                // props
                {
                    id: columnIndex + "-" + rowIndex,
                },
                // options
                {
                    isSelected:
                        selectedRow === rowIndex &&
                        selectedColumn === columnIndex,
                }
            );
            tableCellElement.appendChild(sceneItem);

            // Attach tableCell to correct tableRow
            tableRowElements[rowIndex].appendChild(tableCellElement);

            // Add event listener for when a tableCell is clicked on by the user
            tableCellElement.addEventListener("click", (e) => {
                if (typeof onSceneSelect === "function") {
                    onSceneSelect(gameMap.scenes[columnIndex][rowIndex], e);
                } else {
                    // Default click handler
                    console.log("Row: " + rowIndex + " Column: " + columnIndex);
                }
                setSelectedScene([columnIndex, rowIndex]);
                renderMapButtonGrid(tableDivRef.current);
            });
        });
    });

    // Create +/- buttons for inserting and removing new rows
    // Add newly-filled table rows to the table body
    tableRowElements.forEach((tableRow, rowIndex) => {
        const removeRowButton = createButton({
            innerText: "-",
            style: {
                width: COLUMN_WIDTH / 2 + "px",
                height: ROW_HEIGHT / 2 + "px",
            },
        });
        removeRowButton.addEventListener("click", () => {
            removeSceneRowFromMap(rowIndex);
            renderMapButtonGrid(tableDivRef.current);
        });
        const addRowButton = createButton({
            innerText: "+",
            style: {
                width: COLUMN_WIDTH / 2 + "px",
                height: ROW_HEIGHT / 2 + "px",
            },
        });
        addRowButton.addEventListener("click", () => {
            insertSceneRowInMap(rowIndex + 1, defaultScenePlaceholder);
            renderMapButtonGrid(tableDivRef.current);
        });
        const addRemoveButtonContainer = createCustomizedElement({
            tagName: "div",
            style: {
                display: "flex",
                flexDirection: "column",
                width: COLUMN_WIDTH / 2 + "px",
                height: ROW_HEIGHT + "px",
            },
        });
        addRemoveButtonContainer.appendChild(removeRowButton);
        addRemoveButtonContainer.appendChild(addRowButton);

        // Attach buttons to row
        tableRow.appendChild(addRemoveButtonContainer);
        // Attach row to table
        tableBodyElement.appendChild(tableRow);
    });

    // Create +/- buttons for inserting and removing new columns
    const addAndRemoveColumnButtonsRow = createCustomizedElement({
        tagName: "tr",
    });
    mapGrid.forEach((column, columnIndex) => {
        const removeRowButton = createButton({
            innerText: "-",
            style: {
                width: COLUMN_WIDTH / 2 + "px",
                height: ROW_HEIGHT / 2 + "px",
            },
        });
        removeRowButton.addEventListener("click", () => {
            removeSceneColumnFromMap(columnIndex);
            renderMapButtonGrid(tableDivRef.current);
        });
        const addRowButton = createButton({
            innerText: "+",
            style: {
                width: COLUMN_WIDTH / 2 + "px",
                height: ROW_HEIGHT / 2 + "px",
            },
        });
        addRowButton.addEventListener("click", () => {
            insertSceneColumnInMap(columnIndex + 1, defaultScenePlaceholder);
            renderMapButtonGrid(tableDivRef.current);
        });
        const addRemoveButtonContainer = createCustomizedElement({
            tagName: "td",
            style: {
                width: COLUMN_WIDTH + "px",
                height: ROW_HEIGHT / 2 + "px",
            },
        });
        addRemoveButtonContainer.appendChild(removeRowButton);
        addRemoveButtonContainer.appendChild(addRowButton);

        addAndRemoveColumnButtonsRow.appendChild(addRemoveButtonContainer);
    });
    tableBodyElement.appendChild(addAndRemoveColumnButtonsRow);

    //
    tableElement.appendChild(tableBodyElement);
    containerElement.appendChild(tableElement);
};

// Save scene data to currently selected slot
const saveSceneToMap = (sceneData) => {
    gameMap.scenes[gameMap.selectedScene[0]][gameMap.selectedScene[1]] =
        sceneData;
    renderMapButtonGrid(tableDivRef.current);
};

const copyScene = () => {};

const pasteScene = () => {};

const loadMap = (newMapJson) => {
    const newMap = JSON.parse(newMapJson);
    Object.assign(gameMap, newMap);
    setSelectedScene([0, 0]);
    onSceneSelect(getCurrentlySelectedScene());
    renderMapButtonGrid(tableDivRef.current);
};

const saveMap = (mapName) => {
    const map = Object.assign(
        {},
        { name: gameMap.name, scenes: gameMap.scenes }
    );
    downloadBlob(mapName, JSON.stringify({ ...map, name: mapName }, null, 1));
};

export const getMapManager = (mainDiv, options = {}) => {
    if (options.onSceneSelect) {
        onSceneSelect = options.onSceneSelect;
    }

    mainDiv.style.overflow = "overlay";
    let displayedScenes = Array.from(gameMap.scenes);
    let innerContainerDiv = createCustomizedElement();
    tableDivRef.current = createCustomizedElement();

    // Plus button to add column to right side of map
    let prependColumnButton = createButton({
        innerText: "Prepend Column",
    });
    prependColumnButton.addEventListener("click", () => {
        insertSceneColumnInMap(0, Object.assign({}, defaultScenePlaceholder));
        renderMapButtonGrid(tableDivRef.current);
    });
    mainDiv.appendChild(prependColumnButton);

    let prependRowButton = createButton({
        innerText: "Prepend Row",
        style: { width: "100%" },
    });
    prependRowButton.addEventListener("click", () => {
        insertSceneRowInMap(0, Object.assign({}, defaultScenePlaceholder));
        renderMapButtonGrid(tableDivRef.current);
    });

    // Assign starting width and height if specified
    if (options.height) {
        for (let i = 0; i < options.height; i++) {
            insertSceneRowInMap(i, Object.assign({}, defaultScenePlaceholder));
        }
    }
    if (options.width) {
        for (let j = 1; j < options.width; j++) {
            insertSceneColumnInMap(
                j,
                Object.assign({}, defaultScenePlaceholder)
            );
        }
    }

    innerContainerDiv.appendChild(prependRowButton);

    mainDiv.appendChild(innerContainerDiv);
    innerContainerDiv.appendChild(tableDivRef.current);
    renderMapButtonGrid(tableDivRef.current);

    return {
        getCurrentlySelectedScene,
        setSelectedScene,
        saveSceneToMap,
        loadMap,
        saveMap,
        copyScene,
        pasteScene,
    };
};
