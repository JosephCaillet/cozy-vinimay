import * as s from 'sequelize';

module.exports = <s.DefineAttributes>{
	username: <s.DefineAttributeColumnOptions>{
		type: s.TEXT,
		primaryKey: true
	},
	url: <s.DefineAttributeColumnOptions>{
		type: s.TEXT,
		primaryKey: true
	},
	creationTs: <s.DefineAttributeColumnOptions>{
		type: s.TEXT,
		primaryKey: true
	}
}