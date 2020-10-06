const logger = new (require("node-red-contrib-logger"))("subscribe");
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");

function error(node,message,shortMessage) {
	if(logger.active) logger.error({message:message,shortMessage:shortMessage});
	node.error(message);
	node.status({fill:"red",shape:"ring",text:shortMessage||message});
}

let nodes=[];

module.exports = function (RED) {
	function baseNode(config) {
		RED.nodes.createNode(this, config);
		const node=Object.assign(this,config);
		nodes.push(node);
		node.status({fill:"yellow",shape:"ring",text:"awaiting node start"});
	};
	RED.events.on("nodes-started",function() {  // don't do done as stops other success
		if(logger.active) logger.send({label:"nodes-started",nodes:nodes.length});
		nodes.forEach(node=>{
			if(logger.active) logger.send({label:"nodes-started",topic:node.topic});
			try{
				node.hubNode=RED.nodes.getNode(node.hub);
				if(!node.hubNode)  throw Error("hub not found");
					node.hubBase=node.hubNode.hub;
					if(!node.topics) return;
					node.topics.forEach(topic=>{
						if(!topic.value) return;
						node.pubsubFunction=node.pool ? node.hubBase.subscribePool(node,topic.value,node.pool) :  node.hubBase.subscribe(node,topic.value);
					});
	    		node.status({fill:"green",shape:"ring"});
			} catch(ex) {
				logger.error({label:"nodes-started failed",error:ex.message,stack:ex.stack});
				error(node,"Invalid setup "+ex.message);
			}
		});
	});
	RED.events.on("nodes-stopped",function() {  // don't do done as stops other success
		if(logger.active) logger.send({label:"nodes-stopped",nodes:nodes.length});
		nodes=[];
	});
	RED.nodes.registerType(logger.label,baseNode);
	RED.httpAdmin.get("/"+logger.label+"/:id/:action/", RED.auth.needsPermission(logger.label+".write"), function (req, res) {
		var node = RED.nodes.getNode(req.params.id)
		if (node && node.type === logger.label) {
			try {
				switch (req.params.action) {
					case 'pause':
						node.pubsubFunction.pause();
						node.status({fill:"yellow",shape:"ring",text:"paused"});
						break
					case 'resume':
						node.pubsubFunction.resume();
						node.status({fill:"green",shape:"ring",shape:""});
						break
					default:
						throw Error('unknown action: ' + req.params.action)
				}
				node.warn('Request to ' + req.params.action)
				res.sendStatus(200)
			} catch (err) {
				var reason1 = 'Internal Server Error, ' + req.params.action + ' failed ' + err.toString()
				node.error(reason1)
				res.status(500).send(reason1)
			}
		} else {
			var reason2 = 'request to ' + req.params.action + ' failed for id:' + req.params.id
			res.status(404).send(reason2)
		}
	})
};