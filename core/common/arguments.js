class OutputBuffer {
    constructor(consoleOutput) {
        this.output = '';
        this.consoleOutput = consoleOutput;
    }
    write(data) {
        this.output += data;
        if (this.consoleOutput) {
            process.stdout.write(data);
        }
    }
    log(data) {
        this.write(data + '\n');
    }
    clear() {
        this.output = '';
        if (this.consoleOutput) {
            process.stdout.write('\u001b[2J\u001b[0;0H');
        }
    }
    toString() {
        return this.output;
    }
}

const verifyUnique = (options) => {
    const uniqueTest = {};
    for (let arg of options) {
        if (uniqueTest.hasOwnProperty(arg.long) || uniqueTest.hasOwnProperty(arg.short)) {
            throw new Error(`Options should not overlap (check "${uniqueTest.hasOwnProperty(arg.long) ? arg.long : arg.short}").`);
        }
        uniqueTest[arg.long] = uniqueTest[arg.short] = true;
    }
};

const generateHelp = (options, config) => {
    const colourise = (str, col) => {
        return config.colours ? str[col] : str;
    };
    options.push({
        long: '--help',
        short: '-h',
        description: 'Shows this help.',
        run: (out) => {
            let result = 'USAGE\n\t' + colourise(config.string, 'red') + ' ' + colourise('<options...>', 'cyan') + '\nOPTIONS\n';
            for (let i = 0; i < options.length; i++) {
                let infoStr = '\t' + colourise(options[i].short + ', ' + options[i].long, 'cyan');
                if (options[i].expects) {
                    infoStr += ' ';
                    for (let j = 0; j < options[i].expects.length; j++) {
                        infoStr += '{' + colourise(options[i].expects[j], 'yellow') + '} ';
                    }
                }
                result += infoStr + '\n\t\t' + options[i].description + '\n';
            }
            out.clear();
            out.log(result);
            return true;
        }
    });
};

/**
 * parseArguments - Parses arguments contained within an array.
 *
 * @param  {Array<string>} args Input arguments from which to extract meaning.
 * @param  {Array<Object>} options Array of option objects to parse. See example.
 * @param  {Object} help An object determining if a help option (-h/--help) should be added to the options, and if so what its options are. See method prototype for options.
 * @param  {boolean} consoleOutput For arguments that output data, determines if that data should be forwarded to the console.
 * @param  {boolean} ignoreError When parsing, determines if errors should be ignored (by default this is turned off).
 * @return {Object} An object representing the parsed arguments. General structure is as follows: {parsed:{'-i':{vals:['en'],output:''}}, unassociated:['foo','bar']}
 *
 * @example
 * ```js
 * {
 *    long: '--example',
 *    short: '-e',
 *    description: 'An example option that calls a function with its associated arguments "FILE" and "FOLDER"',
 *    expects: ['FILE', 'FOLDER'],
 *    defaults: ['default_folder'],
 *    run: (out, vals) => {
 *        // vals[0] === file
 *    }
 * }
 * ```
 * @example
 * ```js
 * {
 *    long: '--example2',
 *    short: '-e2',
 *    description: 'A second example option that takes no arguments and calls no method'
 * }
 * ```
 */
exports.parseArguments = (args, options, help = {enabled:false, string:null, colours:true}, consoleOutput = false, ignoreError = false) => {
    if (help && help.enabled) {
        generateHelp(options, help);
    }
    if (!ignoreError) {
        verifyUnique(options);
    }
    args = args.slice();
    const parsed = {
        parsed: {},
        unassociated: null
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i],
            pargs = options.filter(value => value.short === arg || value.long === arg);
        if (pargs.length === 0) {
            continue;
        }
        else if (pargs.length > 1 && !ignoreError) {
            throw new Error('Invalid Arguments');
        }

        const vals = [],
            count = (pargs[0].expects || {}).length || 0;
        for (let j = 1; j <= count; j++) {
            const nexta = args[i + j];
            if (nexta && !options.some(value => value.short === nexta || value.long === nexta)) {
                vals.push(args[i + j]);
            }
            else if (pargs[0].defaults && j > count - pargs[0].defaults.length) {
                vals.push(pargs[0].defaults[j - pargs[0].defaults.length]);
            }
            else if (!ignoreError) {
                console.log();
                throw new Error(`Too few arguments given to "${arg}"`);
            }
        }
        const out = new OutputBuffer(consoleOutput),
            p = {
                vals: vals,
                out: null
            };
        let res;
        try {
            res = pargs[0].run ? pargs[0].run(out, vals) : false;
            p.out = out.toString();
        }
        catch (e) {
            // if there is a default, execute that instead
            if (pargs[0].defaults && pargs[0].run) {
                for (let j = pargs[0].defaults.length - 1, k = vals.length - 1; j >= 0; j--, k--) {
                    vals[k] = pargs[0].defaults[j];
                }
                out.clear();
                res = pargs[0].run(out, vals);
                p.out = out.toString();
            }
        }
        if (parsed.parsed[pargs[0].short]) {
            let next = parsed.parsed[pargs[0].short];
            while (next.next) {
                next = next.next;
            }
            next.next = p;
        }
        else {
            parsed.parsed[pargs[0].short] = p;
        }

        const diff = 1 + count;
        args.splice(i, diff);
        i -= diff;

        if (res) {
            break;
        }
    }
    parsed.unassociated = args;
    return parsed;
};
