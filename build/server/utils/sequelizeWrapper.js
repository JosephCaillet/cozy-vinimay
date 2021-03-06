"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
// Load Sequelize module
const Sequelize = require('sequelize');
// Wrapper to singleton-ise Sequelize
class SequelizeWrapper {
    static getInstance(name, force) {
        if (!this.instances) {
            this.instances = new Object();
        }
        if (!this.instances[name]) {
            let dbRoot = path.resolve('./db');
            let files = fs.readdirSync(dbRoot);
            files = files.filter(file => file.match(/\.db$/));
            if (files.indexOf(name + '.db') < 0 && !force) {
                throw new Error('UNKNOWN_USER');
            }
            let instance = new Sequelize(name, '', '', {
                dialect: 'sqlite',
                logging: false,
                define: {
                    timestamps: false
                },
                storage: path.join(__dirname, '/../../../db/', name + '.db')
            });
            // Load and define Sequelize models
            instance.define('post', require('../models/sequelize/post'), { freezeTableName: true });
            instance.define('friend', require('../models/sequelize/friend'), { freezeTableName: true });
            instance.define('comment', require('../models/sequelize/comment'), { freezeTableName: true });
            instance.define('profile', require('../models/sequelize/profile'), { freezeTableName: true });
            instance.define('reaction', require('../models/sequelize/reaction'), { freezeTableName: true });
            instance.define('user', require('../models/sequelize/user'), { freezeTableName: true });
            // friend/user associations with profile
            // this is needed for join requests we do in controllers/friends
            // and controllers/user
            // Detail the association between a friend and its local profile
            instance.model('friend').belongsTo(instance.model('profile'), {
                foreignKey: 'username',
                targetKey: 'username'
            });
            instance.model('friend').belongsTo(instance.model('profile'), {
                foreignKey: 'url',
                targetKey: 'url'
            });
            // Detail the association between an user and its profile
            instance.model('user').belongsTo(instance.model('profile'), {
                foreignKey: 'username',
                targetKey: 'username'
            });
            instance.model('user').belongsTo(instance.model('profile'), {
                foreignKey: 'url',
                targetKey: 'url'
            });
            this.instances[name] = instance;
        }
        return this.instances[name];
    }
    // Will only be called by the sync script
    static syncModels(name, params) {
        let instance = this.getInstance(name, true);
        return new Promise((ok, ko) => {
            instance.sync(params).then(() => {
                this.sync = true;
                ok(name);
            }).catch((e) => {
                ko(e);
            });
        });
    }
    static isSync() {
        return this.sync;
    }
}
SequelizeWrapper.sync = false;
exports.SequelizeWrapper = SequelizeWrapper;
