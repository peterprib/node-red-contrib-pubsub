const logger = new (require("node-red-contrib-logger"))("publish");
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");

function error(node,message,shortMessage) {
	if(logger.active) logger.error({message:message,shortMessage:shortMessage});
	node.error(message);
	node.status({fill:"red",shape:"ring",text:shortMessage||message});
}

function evalFunction(id,statements){
	try{
		const f=new Function("RED", "node","msg","try{ return "+statements+ "} catch(ex) {throw Error('"+id +" '+ex.message)}");
		if(logger.active) logger.send({label:"evalFunction",id:id,statements:statements,callableFunction:JSON.stringify(f)});
		return f;
	} catch(ex) {
		throw Error(id+" "+ex.message);
	}
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
}
function publishMsgTopic(msg) { 
	if(logger.active) logger.send({label:"publishMsgTopic",topic:msg.topic});
	publish(this,msg,msg.topic);
}
function publishViaFunctions(RED,node,msg) { 
	if(logger.active) logger.send({label:"publishViaFunctions",topicFunctions:node.topicFunctions.length});
	let topics=[];
	node.topicFunctions.forEach((f,i)=>{
		const topic=f(RED,node,msg);
		if(logger.active) logger.send({label:"publishViaFunctions",index:i,topic:topic});
		if(topic==null || topics.includes(topic)) return;
		topics.push(topic);
		publish(node,msg,topic);
	})
}
module.exports = function (RED) {
	function baseNode(config) {
		RED.nodes.createNode(this, config);
		const node=Object.assign(this,{topics:[]},config,{msgCnt:0});
		node.inputFunction=function(msg) {
			if(logger.active) logger.send({label:"inputFunction initial message",msgCnt:node.msgCnt});
			try{
				node.hubNode=RED.nodes.getNode(node.hub);
				if(!node.hubNode)  throw Error("hub not found");
				node.hubBase=node.hubNode.hub;
				if(node.topics.length==0) {
					if(logger.active) logger.send({label:"default to publishMsgTopic"});
					node. topicFunctions=[evalFunction("default","msg.topic").bind(node)];
				} else{  
					node.topicFunctions=node. topics.map((c,i)=>{
						if(logger.active) logger.send({label:"setup topicFunctions",type:c.type,value:c.value});
						switch(c.type){
						case "text": return evalFunction(i,'"'+c.value+'"').bind(node);
						case "msg": return evalFunction(i,"msg."+c.value+"?msg."+c.value+":undefined").bind(node);
						case "expression": return evalFunction(i,c.value).bind(node);
						}
					});
				} 
				if(logger.active) logger.send({label:" topicFunctions",count:node.topicFunctions.length});
				const callFunction=publishViaFunctions.bind(node);
				node.inputFunction=((msg)=>{
					callFunction(RED,node,msg);
					node.send(msg);
				});
	    		node.status({fill:"green",shape:"ring"});
	    		node.inputFunction(msg);
			} catch(ex) {
				if(logger.active) logger.send({label:"nodes-started failed",error:ex.message,stack:ex.stack});
				error(node,"Invalid setup "+ex.message);
			}
		}
		node.on("input", (msg)=>node.inputFunction(msg));
		node.status({fill:"yellow",shape:"ring",text:"awaiting first message"});
	}
	RED.nodes.registerType(logger.label,baseNode);
};
