module.exports = function(RED) {
	const { GameDig, games } = require('gamedig');

	const SERVER_DOWN_PATTERNS = [
		/Timed out/i,
		/Failed all \d+ attempts/,
		/ECONNREFUSED/,
		/ENOTFOUND/,
		/EHOSTUNREACH/,
		/ENETUNREACH/,
		/ETIMEDOUT/,
		/ECONNRESET/,
		/EAI_AGAIN/
	];

	function isServerDownError(error) {
		const stack = (error && (error.stack || error.message)) || '';
		const errorLines = stack.split('\n').filter(line => /^\s*Error:/.test(line));
		if (errorLines.length === 0) {
			return SERVER_DOWN_PATTERNS.some(re => re.test(stack));
		}
		return errorLines.every(line => SERVER_DOWN_PATTERNS.some(re => re.test(line)));
	}

	// GameDig returns Results, Players and Player class instances; Node-RED
	// cannot clone those, so convert them to plain objects and arrays.
	function deepCloneToPlain(obj) {
		if (Array.isArray(obj)) {
			return Array.from(obj, deepCloneToPlain);
		}
		if (obj && typeof obj === 'object') {
			const result = {};
			for (const key of Object.keys(obj)) {
				// Skip raw rule bytes
				if (Buffer.isBuffer(obj[key])) {
					continue;
				}
				result[key] = deepCloneToPlain(obj[key]);
			}
			return result;
		}
		return obj;
	}

    function QueryGameServer(config) {
        RED.nodes.createNode(this, config);
		let node = this;
		this.halt_if = config.halt_if;
		this.output_options = config.output_options || false;
        node.on('input', function(msg, send, done) {
			// Node-RED 0.x does not pass send/done
			send = send || function() { node.send.apply(node, arguments); };
			done = done || function(err) { if (err) node.error(err, msg); };

			let options = {
				'type': config.server_type || msg.server_type || undefined,
				'host': config.host || msg.host || undefined,
				'address': config.address || msg.address || undefined,
				'port': config.port || msg.port || undefined,
				'maxRetries': Number(config.max_attempts || msg.max_attempts || 1),
				'socketTimeout': Number(config.socket_timeout || msg.socket_timeout || 2000),
				'attemptTimeout': Number(config.attempt_timeout || msg.attempt_timeout || 10000),
				'givenPortOnly': config.given_port_only || msg.given_port_only || false,
				'ipFamily': Number(config.ip_family) || Number(msg.ip_family) || 0,
				'debug': config.debug || msg.debug || undefined,
				'requestRules': config.request_rules || msg.request_rules || undefined,
				'stripColors': typeof config.strip_colors === "undefined" ? true : config.strip_colors
			};

			if(typeof msg.options === 'object' && msg.options)
			{
				options = {...options, ...msg.options};
			}

			// GameDig only resolves host when address is absent, so drop unset options
			for (const key of Object.keys(options)) {
				if (options[key] === undefined) {
					delete options[key];
				}
			}

			// set the things we want to return
			msg.server_type = options.type;
			if(options.host) {
				msg.host = options.host;
			}
			if(options.address) {
				msg.address = options.address;
			}
			msg.port = options.port;
			if(node.output_options)
			{
				msg.options = options;
			}

			if(!msg.host && !msg.address) {
				done("host/address missing from input.");
				return;
			}

			if(!options.type) {
				done("server_type missing from input.");
				return;
			}

			GameDig.query(options)
				.then(function(state) {
					try {
						msg.payload = 'online';
						msg.data = deepCloneToPlain(state);

						node.status({ fill: "green", shape: "dot", text: `Online ${state.players.length} players` });
						if (msg.payload !== node.halt_if) {
							send(msg);
						}
						done();
					} catch(e) {
						done("Failed returning data: " + e.stack);
					}
				})
				.catch(function(error) {
					msg.payload = 'offline';
					msg.data = {
						error,
						stack: error.stack,
					};
					node.status({ fill: "red", shape: "dot", text: "Offline" });
					if (msg.payload !== node.halt_if) {
						send(msg);
					}
					done(isServerDownError(error) ? undefined : `GameDig Error: \n${error.stack}`);
				});

        });
    }
    RED.nodes.registerType("query-game-server", QueryGameServer);

	const server_types = Object.keys(games).map(type => ({ ...games[type], type }));

	RED.httpAdmin.get(
		"/gamedig/types",
		RED.auth.needsPermission('flows.write'),
		function(req, res) {
			res.json({
				'result': 'ok',
				'server_types': server_types
			});
		}
	);
};