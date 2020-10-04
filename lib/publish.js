const logger = new (require("node-red-contrib-logger"))("publish");
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");

function error(node,message,shortMessage) {
	if(logger.active) logger.error({message:message,shortMessage:shortMessage});
	node.error(message);
	node.status({fill:"red",shape:"ring",text:shortMessage||message});
}

function publish(node,msg,topic) {
	if(logger.active) logger.send({label:"publishNode input set topic",topic:topic});
	node.msgCnt++;
	try{
		node.hubBase.publish(topic,msg);
	} catch(ex) {
		if(logger.active) logger.send({label:"publish",error:ex.message,stack:ex.stack,properties:Object.keys(node.hubBase)});
		error(node,"publish failed");
	}
	node.send(msg);
}

module.exports = function (RED) {
	function baseNode(config) {
		RED.nodes.createNode(this, config);
		const node=Object.assign(this,config,{msgCnt:0,noTopicCnt:0});
		node.inputFunction=function(msg) {
			if(logger.active) logger.send({label:"inputFunction initial message"});
			try{
				node.hubNode=RED.nodes.getNode(node.hub);
				if(!node.hubNode)  throw Error("hub not found");
				node.hubBase=node.hubNode.hub;
				node.inputFunction=node.topic? 	function(msg) {publish(node,msg,node.topic);} : function(msg) {publish(node,msg,msg.topic);};
	    		node.status({fill:"green",shape:"ring"});
	    		node.inputFunction(msg);
			} catch(ex) {
				if(logger.active) logger.send({label:"nodes-started failed",error:ex.message,stack:ex.stack});
				error(node,"Invalid setup "+ex.message);
			}
		}
		node.on("input", node.inputFunction);
		node.status({fill:"yellow",shape:"ring"});
	}
	RED.nodes.registerType(logger.label,baseNode);
};
