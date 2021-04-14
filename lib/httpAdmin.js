
function httpAdmin(RED,logger,hubs,type,actions){
	RED.httpAdmin[type]("/"+logger.label+"/:id/:action/", RED.auth.needsPermission(logger.label+".write"), function (request, response) {
		const action=request.params.action;
		const hub=request.params.id;
		const c=request.connection;
		if(logger.active) logger.send({label:"httpAdmin",params:request.params,query:request.query,remoteAddress:c.remoteAddress,remotePort:c.remotePort,localAddress:c.localAddress,localPort:c.localPort});
		if( !actions.hasOwnProperty(action)) {
			response.status(404).send(type+' request to "' + action + '" failed for id: "' + hub+'" available actions: '+Object.keys(actions));
			return;
		}
		if(hub==null) {
			response.status(404).send(type+' request to "' + action + '" failed for id: "' + hub);
			return;
		}
		if(hub=="*") {
			let count=0,result=[],status=200;
			hubs.forEachInstance(hub=>{
				count++;
				if(logger.active) logger.send({label:"httpAdmin *",count:count,hub:hub.id});
				actions[action](request,response,hubs[hub],
						data=>{
							if(logger.active) logger.send({label:"httpAdmin * callback",count:count,hub:hub.id,data:data});
							result.push(data);
							if(--count) return;
							response.status(200).json(result);
						},
						error=>{
							if(logger.active) logger.send({label:"httpAdmin * error",count:count,hub:hub.id,error:error.message});
							status=Math.max(error.status,500);
							result.push({hub:hub,error:error.message});
							if(--count) return;
							response.status(status).json(result);
						}
				);
			});
			return;
		}
		try {
			const hubNode=RED.nodes.getNode(request.params.id)||hubs[hub];
			if(hubNode==null) throw Error("hub not found for "+hub+ " available:"+Object.keys(hubs))
			actions[action](request,response,hubNode,
				data=>response.status(200).json(data||{ok:true,syncKey:hubNode.hub.getConsistencyKey()}),
				ex=>{
					logger.error({label:"httpAdmin",action:action,error:ex.message,stack:ex.stack})
					response.status(ex.status||500).json({error:ex.message})
				}
			);
		} catch (ex) {
			const reason = 'Internal Server Error, ' + request.params.action + ' failed ' + ex.toString()
			logger.error({label:"httpAdmin."+type,error:reason,stack:ex.stack});
			response.status(500).json({error:ex.message});
		}
	});
}
module.exports=httpAdmin;