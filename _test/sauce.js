const suites = [];
let elements = [];

const spotlightDiv = document.createElement("div");
spotlightDiv.id = "spotlight";
document.getElementsByTagName("body")[0].appendChild(spotlightDiv);

var sauce = {
    /**
     * Throws an error if the two parameter values are not exactly equal (or extremely close if floats).
     * 2 parameters required; they can be any type, and will be maintain their typing inside this function.
     * Objects will first be evaluated by reference, then by equality of keys and values.
     * @param {*} a Value 1
     * @param {*} b Value 2
     */
    assertEqual: (a, b) => {
        const VERY_SMALL_NUMBER = 0.0000000001;
        if (a === b) {
            return;
        }
        if (
            // Floats almost equal
            typeof a === "number" &&
            typeof b === "number" &&
            a + VERY_SMALL_NUMBER > b &&
            a - VERY_SMALL_NUMBER < b
        ) {
            return;
        }
        if (
            typeof a === typeof b &&
            typeof a === "object" &&
            typeof b === "object"
        ) {
            // Check all keys and values match (no extra values)
            Object.entries(a).forEach(([aKey, aValue]) =>
                sauce.assertEqual(aValue, b[aKey])
            );
            Object.entries(b).forEach(([bKey, bValue]) => {
                sauce.assertEqual(a[bKey], bValue);
            });
            return;
        }
        throw new Error(a + " not equal to " + b);
    },
    /**
     * This function will present an error if the function it was passed does not present an error when called.
     * @param {function} func A handler to call the function that is expected to error
     * @param {string} expectedErrorMessage The error message that you expect to be emitted from func
     */
    shouldError: (func, expectedErrorMessage = null) => {
        const noErrMessage = "no error detected";
        try {
            func();
            throw new Error(noErrMessage);
        } catch (err) {
            if (
                err.message === noErrMessage ||
                (expectedErrorMessage && err.message !== expectedErrorMessage)
            ) {
                throw new Error(
                    `Function ${func.toString()} did not throw error when it should have`
                );
            }
        }
    },
    assertNonNull: (value) => {
        if (value === undefined || value === null) {
            throw new Error(`Value`);
        }
    },

    // Helpers for DOM manipulation
    createElement: (tagName, id) => {
        const newElement = document.createElement(tagName);
        if (id) {
            newElement.id = id;
        }
        elements.push(newElement);
        return newElement;
    },
    getElement: (id) => {
        return elements.find((ele) => ele.id === id) ?? null;
    },
    removeElement: (id) => {
        let index = elements.findIndex((ele) => ele.id === id);
        if (index > 0) {
            elements.splice(index, 1);
            return true;
        } else {
            return false;
        }
    },
    clearElements: () => {
        elements = [];
    },
    giveSpotlight: (element) => {
        spotlightDiv.appendChild(element);
    },
    clearSpotlight: () => {
        spotlightDiv.style = {};
        spotlightDiv.innerHTML = "";
    },
};

// Each group of tests for a particular function should be part of the same describe
var describe = (suiteName, suiteFunc) => {
    suites.push({ describe: suiteName, testList: [] });
    suiteFunc();
};

// Before each "it" in a test suite, run this funtion and pass
// the output as a parameter when calling "it"
var beforeEach = (initFunc) => {
    suites[suites.length - 1].beforeEach = initFunc;
};

// Each individual test should account for exactly 1 functionality requirement
//     For example, testing "array.push" would have one "it" for: "it adds an item to the array", and
//     a second one for: "it returns a reference to the same array"
var it = async (testName, testFunc) => {
    // Each describe will be loaded one-at-a-time
    suites[suites.length - 1].testList.push({
        name: testName,
        result: async (ctx) => {
            let result = null;
            try {
                await testFunc(ctx);
            } catch (err) {
                // If the test results in an error, display it, and log it to the console
                result = err;
                console.error(err);
            }
            return result;
        },
    });
};

var afterEach = (cleanupFunc) => {
    suites[suites.length - 1].afterEach = cleanupFunc;
};

// Run tests when page loads
window.addEventListener("load", async () => {
    // Display results in output div
    const output = document.createElement("div");

    // Loop through each test group (made from "describe()")
    for (let suiteIndex = 0; suiteIndex < suites.length; suiteIndex++) {
        const testSuite = suites[suiteIndex];
        const sectionDiv = document.createElement("div");
        const sectionTitle = document.createElement("h2");
        sectionTitle.innerText = testSuite.describe;
        sectionDiv.appendChild(sectionTitle);

        // Loop through "it()" tests, awaiting results of any which are asyncronous
        for (let i = 0; i < testSuite.testList.length; i++) {
            let test = testSuite.testList[i];
            const testResult = document.createElement("p");
            testResult.classList.add("test_result");

            // Run test
            const ctx = (await testSuite?.beforeEach?.()) ?? {};
            const error = await test.result(ctx);
            await testSuite?.afterEach?.();

            // Display checkmark + testName on success, or "X" + errorMessage on error
            testResult.classList.add(error ? "failure" : "success");
            testResult.innerText = test.name;

            if (error) {
                testResult.appendChild(document.createElement("br"));
                let errorMessageElement = document.createElement("pre");
                errorMessageElement.innerText = String(error);
                testResult.appendChild(errorMessageElement);
            }
            sectionDiv.appendChild(testResult);
        }

        output.appendChild(sectionDiv);
    }
    document.body.appendChild(output);
});
