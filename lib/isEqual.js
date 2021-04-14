const isEqual = (obj1, obj2) =>{
	const obj1Keys=Object.keys(obj1);
	const obj2Keys=Object.keys(obj2);
	if(obj1Keys.length !== obj2Keys.length) return false;
	for (let objKey of obj1Keys) {
		const obj1Val=obj1[objKey];
		const obj2Val=obj2[objKey];
		if (obj1Val== obj2[objKey]) continue;
		if(typeof obj1Val !== "object" || typeof obj2[objKey] !== "object") return false
		if(!isEqual(obj1Val, obj2Val)) return false;
	}
	return true;
};
module.exports=isEqual;