const PubSubFunction=require("./PubSubFunction");
const PubSubPool=require("./PubSubPool");

function PubSubNode(logger) {
	this.logger=logger;
	this.init();
}
PubSubNode.prototype.init=function() {
	this.functions=[];
	this.pool={};
	this.headings={};
	this.buildTS=new Date();
}
PubSubNode.prototype.clear=function() {
	for(const heading in this.headings) this.headings[pool].clear();
	delete this.function;
	delete this.pool;
	delete this.headings;;
	this.init();
}
PubSubNode.prototype.getConsistencyKey=function(){
	return this.buildTS
};
PubSubNode.prototype.isConsistent=function(key) {
	return this.buildTS<key;
}
PubSubNode.prototype.publish=function(headings,msg) {
	if(this.logger.active) this.logger.send({label:"PubSubNode.publish",headings:headings,functionCount:this.functions.length,subHeadings:Object.keys(this.headings),msg:msg._msgid});
	this.functions.forEach(c=>c.publish(msg));
	for(const pool in this.pool) this.pool[pool].publish(msg);
	const heading=headings.shift();
	const pubSubNode=this.headings[heading];
	if(pubSubNode) pubSubNode.publish(headings,msg);
}
PubSubNode.prototype.subscribe=function(node,headings,options,callFunction) {
	if(this.logger.active) this.logger.send({label:"PubSubNode.subscribe",node:node.id,name:node.name,headings:headings});
	if(headings.length) {
		const heading=headings.shift();
		const pubSubNode=this.headings[heading];
		if(pubSubNode)
			return pubSubNode.subscribe(node,headings,options,callFunction);
		this.headings[heading]=new PubSubNode(this.logger);
		return this.headings[heading].subscribe(node,headings,options,callFunction);
	}
	if(this.logger.active) this.logger.send({label:"PubSubNode.subscribe subscribe",node:node.id,name:node.name});
	const callFunctionNode=new PubSubFunction({node:node,options,callFunction:callFunction,active:true,logger:this.logger});
	this.functions.push(callFunctionNode);
	return callFunctionNode;
};
PubSubNode.prototype.subscribePool=function(node,headings,id,options,callFunction) {
	if(this.logger.active) this.logger.send({label:"PubSubNode.subscribePool",headings:headings,id:id});
	if(headings.length) {
		const heading=headings.shift();
		const pubSubNode=this.headings[heading];
		if(pubSubNode) 
			return pubSubNode.subscribePool(node,headings,id,callFunction);
		this.headings[heading]=new PubSubNode(this.logger);
		return this.headings[heading].subscribePool(node,headings,id,options,callFunction);
	}
	if(!this.pool.hasOwnProperty(id)) {
		this.pool[id]=new PubSubPool(this.logger);
	}
	return this.pool[id].subscribe(node,options,callFunction);
};
module.exports=PubSubNode;