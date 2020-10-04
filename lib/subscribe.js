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
		node.status({fill:"yellow",shape:"ring"});
/*
		RED.events.on("nodes-started",function() {  // don't do done as stops other success
			if(logger.active) logger.send({label:"nodes-started",topic:node.topic});
    		try{
    			node.hubNode=RED.nodes.getNode(node.hub);
    			if(!node.hubNode)  throw Error("hub not found");
   				node.hubBase=node.hubNode.hub;
   				if(node.pool) node.hubBase.subscribePool(node,node.topic,node.pool);
   				else node.hubBase.subscribe(node,node.topic);
        		node.status({fill:"green",shape:"ring"});
    		} catch(ex) {
    			logger.error({label:"nodes-started failed",error:ex.message,stack:ex.stack});
    			error(node,"Invalid setup "+ex.message);
    		}
		});
*/	};
	RED.events.on("nodes-started",function() {  // don't do done as stops other success
		if(logger.active) logger.send({label:"nodes-started",nodes:nodes.length});
		nodes.forEach(node=>{
			if(logger.active) logger.send({label:"nodes-started",topic:node.topic});
			try{
				node.hubNode=RED.nodes.getNode(node.hub);
				if(!node.hubNode)  throw Error("hub not found");
					node.hubBase=node.hubNode.hub;
					if(node.pool) node.hubBase.subscribePool(node,node.topic,node.pool);
					else node.hubBase.subscribe(node,node.topic);
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
};