### Merlin's Revenge (The Whole Trilogy, and Then Some!)
- by Wike
(rewritten with permission from original creator Steve Riddett)

## Some notes for any who may wish to adapt this code for their own purposes

The game scene area has position coordinates from x0, y0 to x640, y320.
Scaling is utilized for display purposes only, and as such, all hitbox detection should utilize non-scaled position values.
All MR games (1-3) rely on an 18-wide, 9-high, grid of map tiles.
After MR1, some floor tiles have speed-altering properties for certain entities (TODO: still need to implement this here).

# Style Conventions 

In general, I will try to follow the [Google JS Style Guide](https://google.github.io/styleguide/jsguide.html) in this codebase. I discovered this document long (too long) after starting this project, so there may be instances of broken convention for some time until I care to resolve them. New code will all follow the Google convention as well as I'm able to.

## File & Directory Names

Should all be "snake-case". The filestructure does not currently follow this standard, but it will in time.

## Whitespace

Indentation will use 4 spaces (no "tab" characters ever ever ever!). Google standard is 2-space indentations, but I prefer 4 spaces for better readability, and to promote more shallowly nested code. If you have to scroll horizontally, you're almost always looking at poorly structured code, and it will serve you well to factor out some functions for better maintainability.

# Development and Runtime

This codebase is 100% vanilla JS, and this project was conceived as a way for me to become more comfortable with functional programming. As such, most of the functions are as pure as I could think to make them, and I welcome any improvements and
alterations to make this codebase a more educational resource for others on a similar path.

To run the app for development purposes, you can use any web serving solution that hosts all the files. I use the VS Code extension "Live Server" by Ritwick Dey, since it hot-reloads by default.

Opening the HTML file in the browser without a server won't work is because JS modules are denied access to local machine files (web browser security measure).

# Screen and Canvas positional coordinates system - notes:

The screen coordinates system is the vertical reverse of a Cartesian coordinate plane (-y is at the top, -x is on the left)

```
   -y
-x  . +x
   +y
```

This creates a mental challenge when it comes to how we think about mathematical concepts based in the Cartesian plane, such as sine, cosine, angle, etc.
Most of the difficulty should be handled by the "Vector2D" object and its methods,
but it should be noted that positional angle measurements are usually rotated 180 degrees, and reversed as a consequence of this.

# Testing

I have implemented a custom vanilla JS testing library from scratch, taking inspiration from mocha-style libraries, and [this article](https://alexwlchan.net/2023/testing-javascript-without-a-framework/)

To create a new testing suite, add a file in the `/_test/` directory, then load it in an HTML file *after* the `sauce.js` file.
For your convenience, you can instead import your test file into the `framework.js` file, and run it along with the other tests in this project.

To run tests in your browser, navigate to the URL that the tests are imported into. The main test runner endpoint is `/_test`
