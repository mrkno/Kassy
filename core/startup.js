/**
 * Handles the startup of Concierge.
 *
 * Written By:
 *         Matthew Knox
 *
 * Contributors:
 *         Dion Woolley
 *         Jay Harris
 *         Matt Hartstonge
 *         (Others, mainly strange people)
 *
 * License:
 *        MIT License. All code unless otherwise specified is
 *        Copyright (c) Matthew Knox and Contributors 2015.
 */
let platform = null,
    startArgs = null;

const checkShutdownCode = (code) => {
        if (code === StatusFlag.ShutdownShouldRestart) {
            platform.removeListener('shutdown', checkShutdownCode);
            exports.run();
        }
        else {
            process.exit(0);
        }
    };

exports.run = (startArgsP) => {
    try {
        if (!startArgs && startArgsP) {
            startArgs = startArgsP;
        }
        global.$$ = require.once('./translations/translations.js');

        // quickest way to clone in JS, prevents reuse of same object between startups
        const startClone = JSON.parse(JSON.stringify(startArgs)),
            Platform = require.once('./platform.js');
        platform = new Platform();
        platform.on('shutdown', checkShutdownCode);
        platform.start(startClone);
    }
    catch (e) {
        console.critical(e);
        console.error('A critical error occurred while running. Please check your configuration or report a bug.');
        process.exit(-3);
    }
};

exports.stop = () => {
    if (platform) {
        platform.shutdown();
    }
    process.exit(0);
};
