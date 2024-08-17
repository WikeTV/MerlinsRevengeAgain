// Test to ensure test functions are working
describe("sauce testing tool", () => {
    it("sauce successfully pollutes namespace", () => {
        if (!sauce) {
            throw new Error("NO SAUCE!!!");
        }
        return;
    });

    it("shouldError detects errors", () => {
        // shouldError should catch this error and not emit one of its own
        sauce.shouldError(() => {
            throw new Error(
                "this error should be caught. you shouldn't see this"
            );
        });

        // shouldError should emit an error, since the function it called did not create an error
        const noErrMessage = "shouldError detected an error when none exists";
        try {
            sauce.shouldError(() => {});
            throw new Error(noErrMessage);
        } catch (err) {
            if (err.message === noErrMessage) {
                throw new Error(
                    "shouldError did not throw error when it should have"
                );
            }
        }
    });

    it("assertEqual numbers", () => {
        // Equality detection
        sauce.assertEqual(1, 1);
        sauce.assertEqual(12, 12);
        sauce.assertEqual(-121, -121);
        sauce.assertEqual(1.5, 1.5);

        // Inequality detection
        sauce.shouldError(() => sauce.assertEqual(1, 2));
        sauce.shouldError(() => sauce.assertEqual(1, -1));
        sauce.shouldError(() => sauce.assertEqual(1.01, 1.001));
    });

    it("assertEqual strings", () => {
        // Equality detection
        sauce.assertEqual("test", "test");

        // Inequality detection
        sauce.shouldError(() => sauce.assertEqual("test", "wrong"));
        sauce.shouldError(() => sauce.assertEqual("test", "t"));
    });

    it("assertEqual booleans", () => {
        // Equality detection
        sauce.assertEqual(true, true);
        sauce.assertEqual(false, false);

        // Inequality detection
        sauce.shouldError(() => sauce.assertEqual(true, false));
        sauce.shouldError(() => sauce.assertEqual(false, true));
    });

    it("assertEqual objects", () => {
        // Equality detection
        sauce.assertEqual(
            { test: true, test2: { test3: true } },
            { test: true, test2: { test3: true } }
        );

        // Inequality detection
        sauce.shouldError(() => sauce.assertEqual({ test: 1 }, { test: 2 }));
        sauce.shouldError(() => sauce.assertEqual({ test: "2" }, { test: 2 }));
        sauce.shouldError(() =>
            sauce.assertEqual({ fieldKey1: "test" }, { fieldKey2: true })
        );
    });
});
