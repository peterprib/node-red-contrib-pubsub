const PubSubFunction=require("./PubSubFunction");
function PubSubPool(logger) {
	this.functions=[];
	this.pointer=0;
	this.logger=logger;
}
PubSubPool.prototype.subscribe=function(node,options,callFunction) {
	const callFunctionNode=new PubSubFunction({node:node,options:options,callFunction:callFunction,active:true,logger:this.logger});
	this.functions.push(callFunctionNode);
	if(this.logger.active) this.logger.send({label:"PubSubPool.subscribe",functions:this.functions.length,node:node.id,name:node.name});
	return callFunctionNode;
};
PubSubPool.prototype.publish=function(msg,i) {
	if(++this.pointer>=this.functions.length) this.pointer=0;
	const functionNode=this.functions[this.pointer];
	if(functionNode.publish(msg)) return;
	if(i) {
		if(this.pointer==i) {
			if(this.logger.active) this.logger.send({label:"PubSubPool.publish",functions:this.functions.length,message:"no active subscriptions"});
		} else this.publish(msg,i)
	} else this.publish(msg,this.pointer);
}
module.exports=PubSubPool;