"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Joi = require("joi");
const Boom = require("boom");
const posts_1 = require("../models/posts");
const users_1 = require("../models/users");
const sequelizeWrapper_1 = require("../utils/sequelizeWrapper");
const vinimayError_1 = require("../utils/vinimayError");
const username_1 = require("../utils/username");
const commons = require("../utils/commons");
const utils = require("../utils/serverUtils");
const postUtils = require("../utils/postUtils");
const reactionUtils = require("../utils/reactionUtils");
const log = require('printit')({
    prefix: 'reactions',
    date: true
});
exports.reactionsSchema = Joi.array().items(commons.user).required().description('Reactions').label('Reactions');
exports.responseSchema = Joi.object({
    authenticated: Joi.boolean().required().description('Information on authentication status'),
    reactions: exports.reactionsSchema
}).label('Reactions response');
async function add(request, reply) {
    let instance;
    try {
        instance = sequelizeWrapper_1.SequelizeWrapper.getInstance(username_1.username);
    }
    catch (e) {
        return reply(Boom.wrap(e));
    }
    let author = await utils.getUser(username_1.username);
    let postAuthor = new users_1.User(request.params.user);
    let postExists;
    try {
        postExists = await postUtils.exists(username_1.username, parseInt(request.params.timestamp));
    }
    catch (e) {
        return reply(Boom.wrap(e));
    }
    if (!postExists)
        return reply(Boom.notFound());
    // Check if the post is local or not
    if (!postAuthor.instance.localeCompare(author.instance)) {
        // We don't support multi-user instances yet
        let timestamp = (new Date()).getTime();
        return instance.model('reaction').create({
            creationTs: request.params.timestamp,
            username: author.username,
            url: author.instance
        }).then((reaction) => {
            let author = new users_1.User(reaction.get('username'), reaction.get('url'));
            return commons.checkAndSendSchema(author.toString(), commons.user, log, reply);
        }).catch(e => reply(Boom.wrap(e)));
    }
    else {
        instance.model('friend').findOne({ where: {
                username: postAuthor.username,
                url: postAuthor.instance
            } }).then((friend) => {
            let idtoken, sigtoken;
            // Set the token if the post author is known
            // Note: if the author isn't a friend (following doesn't count),
            // tokens will still be null/undefined
            if (friend) {
                idtoken = friend.get('id_token');
                sigtoken = friend.get('signature_token');
            }
            let timestamp = parseInt(request.params.timestamp);
            reactionUtils.createRemoteReaction(author, postAuthor, timestamp, idtoken, sigtoken).then((reaction) => {
                return commons.checkAndSendSchema(reaction, commons.user, log, reply);
            }).catch(e => utils.handleRequestError(postAuthor, e, log, false, reply));
        }).catch(e => {
            if (e.isBoom)
                return reply(e);
            return reply(Boom.wrap(e));
        });
    }
}
exports.add = add;
async function serverAdd(request, reply) {
    let username = utils.getUsername(request);
    let user = await utils.getUser(username);
    let instance;
    try {
        instance = sequelizeWrapper_1.SequelizeWrapper.getInstance(username);
    }
    catch (e) {
        throw Boom.notFound();
    }
    let friend;
    instance.model('post').findById(request.params.timestamp)
        .then(async (post) => {
        if (!post)
            throw Boom.notFound();
        let privacy = posts_1.Privacy[post.get('privacy')];
        let author;
        // Commenting on a public post requires info on the author as identification
        // isn't required
        if (privacy === posts_1.Privacy.public) {
            let schema = commons.user.required().label('Reaction author');
            let err;
            if (err = Joi.validate(request.payload.author, schema).error) {
                throw Boom.badRequest(err);
            }
            // No need to check if we know the author if its a friend
            if (request.query.idToken && request.query.signature) {
                try {
                    let res = await utils.getFriendByToken(username, request.query.idToken);
                    author = new users_1.User(res.username, res.url);
                    if (!author || !await postUtils.canReadPost(username, privacy, author)) {
                        throw Boom.notFound();
                    }
                    let url = user + request.path;
                    let params = Object.assign(request.params, request.query);
                    params = Object.assign(params, request.payload);
                    let sig = utils.computeSignature('POST', url, params, res.signature_token);
                    if (!utils.checkSignature(request.query.signature, sig)) {
                        throw Boom.unauthorized('WRONG_SIGNATURE');
                    }
                }
                catch (e) {
                    if (e instanceof vinimayError_1.VinimayError)
                        throw Boom.notFound();
                    throw e;
                }
            }
            else {
                author = new users_1.User(request.payload.author);
                // Check if we know the author
                let knownAuthor = !!(await instance.model('profile').count({ where: {
                        url: author.instance,
                        username: author.username
                    } }));
                // If we don't know the author, save it
                if (!knownAuthor) {
                    await instance.model('profile').create({
                        url: author.instance,
                        username: author.username
                    });
                }
                // TODO: Ask the server for confirmation on the addition
            }
        }
        else {
            if (!request.query.idToken)
                throw Boom.notFound();
            try {
                let res = await utils.getFriendByToken(username, request.query.idToken);
                author = new users_1.User(res.username, res.url);
                if (!author || !await postUtils.canReadPost(username, privacy, author)) {
                    throw Boom.notFound();
                }
                let url = user + request.path;
                let params = Object.assign(request.params, request.query);
                params = Object.assign(params, request.payload);
                let sig = utils.computeSignature('POST', url, params, res.signature_token);
                if (!utils.checkSignature(request.query.signature, sig)) {
                    throw Boom.unauthorized('WRONG_SIGNATURE');
                }
            }
            catch (e) {
                if (e instanceof vinimayError_1.VinimayError)
                    throw Boom.notFound();
                else
                    throw e;
            }
        }
        let timestamp = (new Date()).getTime();
        return instance.model('reaction').create({
            creationTs: request.params.timestamp,
            username: author.username,
            url: author.instance
        });
    }).then((reaction) => {
        let author = new users_1.User(reaction.get('username'), reaction.get('url'));
        return commons.checkAndSendSchema(author.toString(), commons.user, log, reply);
    }).catch(e => {
        if (e.isBoom)
            return reply(e);
        return reply(Boom.wrap(e));
    });
}
exports.serverAdd = serverAdd;
function count(postTimestamp) {
    return new Promise((ok, ko) => {
        sequelizeWrapper_1.SequelizeWrapper.getInstance(username_1.username).model('reaction').count({ where: {
                creationTs: postTimestamp
            } }).then((count) => {
            ok(count);
        }).catch(ko);
    });
}
exports.count = count;
function reacted(postTimestamp, user) {
    return new Promise(async (ok, ko) => {
        let postUser = user || await utils.getUser(username_1.username);
        sequelizeWrapper_1.SequelizeWrapper.getInstance(username_1.username).model('reaction').count({ where: {
                creationTs: postTimestamp,
                username: postUser.username,
                url: postUser.instance
            } }).then((count) => {
            ok(!!count);
        }).catch(ko);
    });
}
exports.reacted = reacted;
