/**
 * Inserts a new row in a column-major 2-d array
 * @param {Array} arr
 * @param {*} insertAtIndex
 * @param {*} emptyItem
 * @returns copy of the original array, with new row inserted
 */
export const insertRowIn2DArray = (
    arr,
    insertAtIndex = 0,
    emptyItem = undefined
) => {
    if (insertAtIndex < 0 || insertAtIndex > arr?.[0]?.length) {
        console.error(
            "Index out of bounds for insertRowIn2DArray:",
            arr,
            insertAtIndex,
            emptyItem
        );
        return arr;
    }

    let newArray = Array.from(arr).map((column, columnIndex) => {
        let newColumn = [];

        if (insertAtIndex === 0) {
            // If inserting a new row before the first
            newColumn.push(emptyItem);
            newColumn.push(...Array.from(column));
        } else if (insertAtIndex === column.length) {
            // If inserting a new row after the last
            newColumn.push(...Array.from(column));
            newColumn.push(emptyItem);
        } else {
            // If inserting a new row somewhere in between
            newColumn.push(...Array.from(column).slice(0, insertAtIndex));
            newColumn.push(emptyItem);
            newColumn.push(...Array.from(column).slice(insertAtIndex));
        }

        return newColumn;
    });

    return newArray;
};

export const insertColumnIn2DArray = (
    arr,
    insertAtIndex,
    emptyItem = undefined
) => {
    if (insertAtIndex < 0 || insertAtIndex > arr?.length) {
        console.error(
            "Index out of bounds for insertColumnIn2DArray:",
            arr,
            insertAtIndex,
            emptyItem
        );
    }

    const newColumn = Array.from(new Array(arr?.[0]?.length ?? 0)).map(
        () => emptyItem
    );

    let new2DArray = [];

    if (insertAtIndex === 0) {
        // If inserting a new row before the first
        new2DArray.push(newColumn);
        new2DArray.push(...Array.from(arr));
    } else if (insertAtIndex === arr.length) {
        // If inserting a new row after the last
        new2DArray.push(...Array.from(arr));
        new2DArray.push(newColumn);
    } else {
        // If inserting a new row somewhere in between
        new2DArray.push(...Array.from(arr).slice(0, insertAtIndex));
        new2DArray.push(newColumn);
        new2DArray.push(...Array.from(arr).slice(insertAtIndex));
    }
    return new2DArray;
};

export const removeRowFrom2DArray = (arr, removeAtIndex) => {
    if (removeAtIndex < 0 || removeAtIndex > arr?.length) {
        console.error(
            "Index out of bounds for removeRowFrom2DArray:",
            arr,
            removeAtIndex
        );
    }
    const new2DArray = Array.from(arr || []);
    new2DArray.forEach((column) => {
        column.splice(removeAtIndex, 1);
    });
    return new2DArray;
};

export const removeColumnFrom2DArray = (arr, removeAtIndex) => {
    if (removeAtIndex < 0 || removeAtIndex > arr?.length) {
        console.error(
            "Index out of bounds for removeColumnFrom2DArray:",
            arr,
            removeAtIndex
        );
    }
    let new2DArray = Array.from(arr || []);
    new2DArray.splice(removeAtIndex, 1);
    return new2DArray;
};
