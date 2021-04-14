function PubSubFunction(p) {
	Object.assign(this,p); //node, callFunction,active);
};
PubSubFunction.prototype.pause=function() {
	this.active=false;
};
PubSubFunction.prototype.resume=function() {
	this.active=true;
};
PubSubFunction.prototype.publish=function(msg,callback,error) {
	if(this.active){
		try{
			this.callFunction(msg,callback);
			return true;
		} catch(ex) {
			this.active=false;
			error&&error(ex.message)
			if(this.logger) this.logger.error({label:"PubSubFunction publish",error:ex.message})
		}
	}
	return false;
};

module.exports=PubSubFunction;