const logger = new (require("node-red-contrib-logger"))("pubsubhub");
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");

function PubSubFunction(p) {
	Object.assign(this,p); //node, callFunction,active);
}
PubSubFunction.prototype.pause=function() {
	this.active=false;
}
PubSubFunction.prototype.resume=function() {
	this.active=true;
}
PubSubFunction.prototype.publish=function(msg) {
	if(this.active){
		if(logger.active) logger.send({label:"PubSubFunction.publish call",node:this.node.id,name:this.node.name});
		this.callFunction(msg);
		return true;
	}
	return false;
}

function PubSubPool() {
	this.functions=[];
	this.pointer=0;
}
PubSubPool.prototype.subscribe=function(node,callFunction) {
	const callFunctionNode=new PubSubFunction({node:node,callFunction:callFunction,active:true});
	this.functions.push(callFunctionNode);
	if(logger.active) logger.send({label:"PubSubPool.subscribe",functions:this.functions.length,node:node.id,name:node.name});
	return callFunctionNode;
};
PubSubPool.prototype.publish=function(msg,i) {
	if(++this.pointer>=this.functions.length) this.pointer=0;
	const functionNode=this.functions[this.pointer];
	if(functionNode.publish(msg)) return;
	if(i) {
		if(this.pointer==i) {
			if(logger.active) logger.send({label:"PubSubPool.publish",functions:this.functions.length,message:"no active subscriptions"});
		} else this.publish(msg,i)
	} else this.publish(msg,this.pointer);
}

function PubSubNode() {
	this.init();
}
PubSubNode.prototype.init=function() {
	this.functions=[];
	this.pool={};
	this.headings={};
}
PubSubNode.prototype.clear=function() {
	for(const heading in this.headings) this.headings[pool].clear();
	delete this.function;
	delete this.pool;
	delete this.headings;;
	this.init();
}
PubSubNode.prototype.publish=function(headings,msg) {
	if(logger.active) logger.send({label:"PubSubNode.publish",headings:headings,functionCount:this.functions.length,subHeadings:Object.keys(this.headings),msg:msg._msgid});
	this.functions.forEach(c=>c.publish(msg));
	for(const pool in this.pool) this.pool[pool].publish(msg);
	const heading=headings.shift();
	const pubSubNode=this.headings[heading];
	if(pubSubNode) pubSubNode.publish(headings,msg);
}
PubSubNode.prototype.subscribe=function(node,headings,callFunction) {
	if(logger.active) logger.send({label:"PubSubNode.subscribe",node:node.id,name:node.name,headings:headings});
	if(headings.length) {
		const heading=headings.shift();
		const pubSubNode=this.headings[heading];
		if(pubSubNode)
			return pubSubNode.subscribe(node,headings,callFunction);
		this.headings[heading]=new PubSubNode();
		return this.headings[heading].subscribe(node,headings,callFunction);
	}
	if(logger.active) logger.send({label:"PubSubNode.subscribe subscribe",node:node.id,name:node.name});
	const callFunctionNode=new PubSubFunction({node:node,callFunction:callFunction,active:true});
	this.functions.push(callFunctionNode);
	return callFunctionNode;
};
PubSubNode.prototype.subscribePool=function(node,headings,id,callFunction) {
	if(logger.active) logger.send({label:"PubSubNode.subscribePool",headings:headings,id:id});
	if(headings.length) {
		const heading=headings.shift();
		const pubSubNode=this.headings[heading];
		if(pubSubNode) 
			return pubSubNode.subscribePool(node,headings,id,callFunction);
		this.headings[heading]=new PubSubNode();
		return this.headings[heading].subscribePool(node,headings,id,callFunction);
	}
	if(!this.pool.hasOwnProperty(id)) {
		this.pool[id]=new PubSubPool();
	}
	return this.pool[id].subscribe(node,callFunction);
};

function defaultFunction(msg){
	if(logger.active) logger.send({label:"defaultFunction",node:this.id,name:this.name,msg:msg._msgid,clone:this.clone})
	this.send(msg,this.clone);
}

function PubSubHub(a) {
	this.hub=a||new PubSubNode();
};
PubSubHub.prototype.clear=function(){
	if(logger.active) logger.send({label:"PubSubHub.clear"});
	this.hub.clear();
};
PubSubHub.prototype.subscribe=function(node,topic,callFunction){
	if(logger.active) logger.send({label:"PubSubHub.subscribe",node:node.id,name:node.name,topic:topic})
	if(!topic) logger.warn({label:"subscribe",node:node.id,name:node.name,warning:"no topic"});
	const headings=topic.split("/");
	return this.hub.subscribe(node,headings||[],(callFunction||defaultFunction).bind(node));
};
PubSubHub.prototype.subscribePool=function(node,topic,id,callFunction){
	if(logger.active) logger.send({label:"PubSubHub.subscribePool",topic:topic,id:id});
	const headings=topic.split("/");
	return this.hub.subscribePool(node,headings,id,(callFunction||node.send).bind(node));
};
PubSubHub.prototype.publish= function(topic,msg){
	if(logger.active) logger.send({label:"PubSubHub.publish",msg:msg._msgid});
	const headings=topic.split("/");
	return this.hub.publish(headings,msg)
};

module.exports = function(RED) {
    function baseNode(n) {
        RED.nodes.createNode(this,n);
        const node=Object.assign(this,n);
    	node.hub=new PubSubHub();
       	node.on("close", function(removed,done) {
       		if(logger.active) logger.send({label:"PubSubHub.publish close"});
       		node.hub.clear();
       		done();
       	});
   };
   RED.nodes.registerType(logger.label,baseNode,{
	   credentials: {
            user: {type: "text"},
            password: {type: "password"}
       }
   })
};