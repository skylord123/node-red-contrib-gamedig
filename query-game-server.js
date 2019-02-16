console.log("test");
module.exports = function(RED) {
	var Gamedig = require('gamedig');
    function queryGameServer(config) {
		console.log("CREATED YAY");
		console.log(Gamedig);
        RED.nodes.createNode(this, config);
        var node = this;
        node.on('input', function(msg) {
        	var serverInfo = {
        		'type': this.nodeConfig.type,
        		'host': this.nodeConfig.host
        	};

        	if(this.nodeConfig.port) {
        		serverInfo['port'] = this.nodeConfig.port;
        	}

			Gamedig.query(serverInfo)
				.then(function(state) {
					msg.payload = 'online';
					msg.data = state;
					const shouldHaltIfState = this.nodeConfig.halt_if && ('online' === this.nodeConfig.halt_if);
		            if (shouldHaltIfState) {
		                return null;
		            }
	            	node.send(msg);
				}).catch(function(error) {
					msg.payload = 'offline';
					msg.data = {
						'error': error
					};
					const shouldHaltIfState = this.nodeConfig.halt_if && ('offline' === this.nodeConfig.halt_if);
		            if (shouldHaltIfState) {
		                return null;
		            }
	            	node.send(msg);
				});
        });
    }
    RED.nodes.registerType("query-game-server", queryGameServer);
};