#!node
const fs = require("fs");

const LOGGER = new console.Console(process.stderr, process.stderr);
const ARGV = minimist()(process.argv.slice(2), {
	alias: {
		'help': ['?', 'h'],
	}
});

if (process.argv.length <= 2) {
	help('');
	return -1;
}

if (ARGV.help) { return help(ARGV.help); }

switch ((ARGV._[0]||'').toLowerCase()) {
	case 'concat': return concat(ARGV._.slice(1));
	case 'download': return download();
	case 'squish': return squish();
	default:
		LOGGER.log("Unhandled command:", ARGV._[0]);
		return -1;
}
return 0;

///////////////////////////////////////////////////////////////////////////////

function help(help) {
	switch(help) {
		case 'concat':
			LOGGER.log(
`./chatArchiveTool.js concat file1 secs1 file2 [secs2] [file3] [...]

This will concatenate the chat logs to one another. Between the path to 
each file to concatenate, is the number of seconds to append between files, 
in the case of breaks in the video.
`); break;
		case 'download':
			LOGGER.log(
`./chatArchiveTool.js download vodID

[Unimplemented.]
`); break;
		case 'squish':
			LOGGER.log(
`./chatArchiveTool.js squish 

[Unimplemented.]
`); break;

		default:
			LOGGER.log(
`./chatArchiveTool.js COMMAND [ARGS...]

This program takes Twitch Chat Archive JSON files and manipulates them
in a variety of ways. Output is put to stdout, and thus you will
want to redirect the output to the file of your choice.

Commands include: concat, download, squish.

Use --help for more info about a given command.

Written by Tustin2121.
`); break;
	}
	return 0;
}

///////////////////////////////////////////////////////////////////////////////

// Needs:
// - Take an offset for time between splices A and B => OFF
// - For every chat message in B:
//    - this.content_offset_seconds += OFF + A.video.end
//    - A.comments.push(this)
// - A.video.end += OFF + (B.video.end - B.video.start)
// - A.emotes.thirdParty <= B.emotes.thirdParty (if not present)
// - A.emotes.firstParty <= B.emotes.firstParty (if not present)
function concat(args = []) {
	try {
		// Check input parameters
		if (args.length < 3) {
			throw "Not enough parameters.";
		}
		
		let files = [{ delay:0, file:args[0], offset:0 }];
		for (let i = 1; i < args.length; i += 2) {
			let delay = Number.parseFloat(args[i]);
			let file = args[i+1];
			if (typeof delay !== 'number' || typeof file !== 'string') {
				throw "Invalid parameters.";
			}
			files.push({ delay, file, offset:0 });
		}
		
		/** @type {import("./global").ChatArchive} */
		const output = {};
		/** @type {Map<string, import("./global").EmoteDef>} */
		const emotes3 = new Map();
		/** @type {Map<string, import("./global").EmoteDef>} */
		const emotes1 = new Map();
		// Start reading files
		for (let f of files) {
			const archive = loadChatArchive(f.file);
			
			// Store emotes
			for (const em of archive.emotes.firstParty) {
				emotes1.set(em.id, em);
			}
			for (const em of archive.emotes.thirdParty) {
				emotes3.set(em.id, em);
			}
			
			// for first file
			if (!output.streamer) {
				output.streamer = archive.streamer;
				output.video = archive.video;
				// output.emotes = archive.emotes;
				output.comments = archive.comments;
				continue; // move on to next file
			}
			// Concatenate
			let endpoint = output.video.end + f.delay;
			
			for (let c of archive.comments) {
				c.content_offset_seconds += endpoint;
				output.comments.push(c);
			}
			output.video.end += (archive.video.end - archive.video.start) + f.delay;
		}
		output.emotes = {
			thirdParty: Array.from(emotes3.values()),
			firstParty: Array.from(emotes1.values()),
		};
		
		// Completed operation, output result.
		LOGGER.log("Operation successful.");
		
		process.stdout.write( JSON.stringify(output, null, '\t') );
		return 0;
	}
	catch(ex) {
		if (ex instanceof Error) {
			LOGGER.log(ex.message);
		} else {
			LOGGER.log(ex);
		}
		help('concat');
		return -1;
	}
}

function download() {
	LOGGER.log("Not yet implemented.");
	return -1;
}

function squish() {
	LOGGER.log("Not yet implemented.");
	return -1;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * 
 * @param {fs.PathLike} file 
 * @returns {import("./global").ChatArchive}
 */
function loadChatArchive(file) {
	return JSON.parse( fs.readFileSync(file, { encoding:'utf8' }) );
}


///////////////////////////////////////////////////////////////////////////////
// Including minimist@1.2.5
function minimist() {
	return function (args, opts) {
		if (!opts) opts = {};
		
		var flags = { bools : {}, strings : {}, unknownFn: null };

		if (typeof opts['unknown'] === 'function') {
			flags.unknownFn = opts['unknown'];
		}

		if (typeof opts['boolean'] === 'boolean' && opts['boolean']) {
		flags.allBools = true;
		} else {
		[].concat(opts['boolean']).filter(Boolean).forEach(function (key) {
			flags.bools[key] = true;
		});
		}
		
		var aliases = {};
		Object.keys(opts.alias || {}).forEach(function (key) {
			aliases[key] = [].concat(opts.alias[key]);
			aliases[key].forEach(function (x) {
				aliases[x] = [key].concat(aliases[key].filter(function (y) {
					return x !== y;
				}));
			});
		});

		[].concat(opts.string).filter(Boolean).forEach(function (key) {
			flags.strings[key] = true;
			if (aliases[key]) {
				flags.strings[aliases[key]] = true;
			}
		});

		var defaults = opts['default'] || {};
		
		var argv = { _ : [] };
		Object.keys(flags.bools).forEach(function (key) {
			setArg(key, defaults[key] === undefined ? false : defaults[key]);
		});
		
		var notFlags = [];

		if (args.indexOf('--') !== -1) {
			notFlags = args.slice(args.indexOf('--')+1);
			args = args.slice(0, args.indexOf('--'));
		}

		function argDefined(key, arg) {
			return (flags.allBools && /^--[^=]+$/.test(arg)) ||
				flags.strings[key] || flags.bools[key] || aliases[key];
		}

		function setArg (key, val, arg) {
			if (arg && flags.unknownFn && !argDefined(key, arg)) {
				if (flags.unknownFn(arg) === false) return;
			}

			var value = !flags.strings[key] && isNumber(val)
				? Number(val) : val
			;
			setKey(argv, key.split('.'), value);
			
			(aliases[key] || []).forEach(function (x) {
				setKey(argv, x.split('.'), value);
			});
		}

		function setKey (obj, keys, value) {
			var o = obj;
			for (var i = 0; i < keys.length-1; i++) {
				var key = keys[i];
				if (key === '__proto__') return;
				if (o[key] === undefined) o[key] = {};
				if (o[key] === Object.prototype || o[key] === Number.prototype
					|| o[key] === String.prototype) o[key] = {};
				if (o[key] === Array.prototype) o[key] = [];
				o = o[key];
			}

			var key = keys[keys.length - 1];
			if (key === '__proto__') return;
			if (o === Object.prototype || o === Number.prototype
				|| o === String.prototype) o = {};
			if (o === Array.prototype) o = [];
			if (o[key] === undefined || flags.bools[key] || typeof o[key] === 'boolean') {
				o[key] = value;
			}
			else if (Array.isArray(o[key])) {
				o[key].push(value);
			}
			else {
				o[key] = [ o[key], value ];
			}
		}
		
		function aliasIsBoolean(key) {
		return aliases[key].some(function (x) {
			return flags.bools[x];
		});
		}

		for (var i = 0; i < args.length; i++) {
			var arg = args[i];
			
			if (/^--.+=/.test(arg)) {
				// Using [\s\S] instead of . because js doesn't support the
				// 'dotall' regex modifier. See:
				// http://stackoverflow.com/a/1068308/13216
				var m = arg.match(/^--([^=]+)=([\s\S]*)$/);
				var key = m[1];
				var value = m[2];
				if (flags.bools[key]) {
					value = value !== 'false';
				}
				setArg(key, value, arg);
			}
			else if (/^--no-.+/.test(arg)) {
				var key = arg.match(/^--no-(.+)/)[1];
				setArg(key, false, arg);
			}
			else if (/^--.+/.test(arg)) {
				var key = arg.match(/^--(.+)/)[1];
				var next = args[i + 1];
				if (next !== undefined && !/^-/.test(next)
				&& !flags.bools[key]
				&& !flags.allBools
				&& (aliases[key] ? !aliasIsBoolean(key) : true)) {
					setArg(key, next, arg);
					i++;
				}
				else if (/^(true|false)$/.test(next)) {
					setArg(key, next === 'true', arg);
					i++;
				}
				else {
					setArg(key, flags.strings[key] ? '' : true, arg);
				}
			}
			else if (/^-[^-]+/.test(arg)) {
				var letters = arg.slice(1,-1).split('');
				
				var broken = false;
				for (var j = 0; j < letters.length; j++) {
					var next = arg.slice(j+2);
					
					if (next === '-') {
						setArg(letters[j], next, arg)
						continue;
					}
					
					if (/[A-Za-z]/.test(letters[j]) && /=/.test(next)) {
						setArg(letters[j], next.split('=')[1], arg);
						broken = true;
						break;
					}
					
					if (/[A-Za-z]/.test(letters[j])
					&& /-?\d+(\.\d*)?(e-?\d+)?$/.test(next)) {
						setArg(letters[j], next, arg);
						broken = true;
						break;
					}
					
					if (letters[j+1] && letters[j+1].match(/\W/)) {
						setArg(letters[j], arg.slice(j+2), arg);
						broken = true;
						break;
					}
					else {
						setArg(letters[j], flags.strings[letters[j]] ? '' : true, arg);
					}
				}
				
				var key = arg.slice(-1)[0];
				if (!broken && key !== '-') {
					if (args[i+1] && !/^(-|--)[^-]/.test(args[i+1])
					&& !flags.bools[key]
					&& (aliases[key] ? !aliasIsBoolean(key) : true)) {
						setArg(key, args[i+1], arg);
						i++;
					}
					else if (args[i+1] && /^(true|false)$/.test(args[i+1])) {
						setArg(key, args[i+1] === 'true', arg);
						i++;
					}
					else {
						setArg(key, flags.strings[key] ? '' : true, arg);
					}
				}
			}
			else {
				if (!flags.unknownFn || flags.unknownFn(arg) !== false) {
					argv._.push(
						flags.strings['_'] || !isNumber(arg) ? arg : Number(arg)
					);
				}
				if (opts.stopEarly) {
					argv._.push.apply(argv._, args.slice(i + 1));
					break;
				}
			}
		}
		
		Object.keys(defaults).forEach(function (key) {
			if (!hasKey(argv, key.split('.'))) {
				setKey(argv, key.split('.'), defaults[key]);
				
				(aliases[key] || []).forEach(function (x) {
					setKey(argv, x.split('.'), defaults[key]);
				});
			}
		});
		
		if (opts['--']) {
			argv['--'] = new Array();
			notFlags.forEach(function(key) {
				argv['--'].push(key);
			});
		}
		else {
			notFlags.forEach(function(key) {
				argv._.push(key);
			});
		}

		return argv;
	};

	function hasKey (obj, keys) {
		var o = obj;
		keys.slice(0,-1).forEach(function (key) {
			o = (o[key] || {});
		});

		var key = keys[keys.length - 1];
		return key in o;
	}

	function isNumber (x) {
		if (typeof x === 'number') return true;
		if (/^0x[0-9a-f]+$/i.test(x)) return true;
		return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(x);
	}
} 
