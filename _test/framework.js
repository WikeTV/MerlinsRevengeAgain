// Currently have to load all test files individually here.
// This file gets loaded into the webpage automatically, and any files imported here will be loaded (usually in order) after `sauce.js`

// Testing the tests
import "./sauce.test.js";

// Utility functions
import "./src/utils/Vector2D.test.js";
import "./src/utils/textRender.test.js";

// Entities
import "./src/entities/entity.test.js";

// Projectiles
import "./src/entities/projectiles/projectile.test.js";

// Magic
import "./src/entities/projectiles/magic/magicBlast.test.js";

// Attempt to fetch all files in /src/ directory from the LiveServer host
//! Current Status: FAILURE

const getLinksInUrl = (url) => {
    return new Promise((resolve) => {
        fetch(url).then((res) => {
            res.text().then((page) => {
                // Load page data with DOMParser to make HTML easier to traverse
                const foodom = new DOMParser().parseFromString(
                    page,
                    "text/html"
                );

                // Find all <a> tag elements, and read their "href" values
                const allLinkElements = foodom.getElementsByTagName("a");
                const allLinks = Array.from(allLinkElements).map(
                    (ele) => ele.href
                );

                // Return list of URL strings
                resolve(allLinks);
            });
        });
    });
};

const deDuplicateArray = (array) => {
    return Object.keys(Object.fromEntries(array.map((val, i) => [val, i])));
};

const urlCrawler = (baseUrl, currentLinks) => {
    // console.log("fetching: " + baseUrl);
    return new Promise(async (resolve) => {
        const allLinks = currentLinks ?? {
            files: [],
            directories: [],
        };

        // console.log({ currentLinks })

        const subRouteLinks = (await getLinksInUrl(baseUrl)).filter((link) =>
            link.includes(baseUrl)
        );

        // Extract file and directory links that have not yet been seen

        // If a link ends in ".js", it is a JS file
        const newFileLinks = subRouteLinks.filter(
            (link) =>
                !allLinks.files.includes(link) &&
                link.split(".")[link.split(".").length - 1] === "js"
        );

        // If a link does not end in a file extension, then it is a directory
        const newDirectoryLinks = subRouteLinks.filter(
            (link) =>
                !allLinks.directories.includes(link) &&
                !link.split("/")[link.split("/").length - 1].includes(".")
        );

        allLinks.files = Array.from(allLinks.files).concat(newFileLinks);
        allLinks.directories = Array.from(allLinks.directories).concat(
            newDirectoryLinks
        );

        const out = Object.assign({}, allLinks);

        //! Something here not recursing and awaiting correctly... too tired to sort it out now
        // await newDirectoryLinks.reduce(async (output, dirLink) => {
        //     const newLinks = await urlCrawler(dirLink, output);
        //     // console.log({ newLinks });
        //     output.files = deDuplicateArray(
        //         output.files.concat(newLinks.files)
        //     );
        //     output.directories = deDuplicateArray(
        //         output.directories.concat(newLinks.directories)
        //     );
        //     // console.log({ output });
        //     return Object.assign({}, output);
        // }, Object.assign({}, allLinks));

        resolve(out);
    });
};

urlCrawler("/_test/src").then((result) => {
    // console.log({ allLinks: result });
});
