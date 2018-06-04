/**
 * User.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  tableName: 'users',

  attributes: {
    id: { type: 'integer', primaryKey: true },
    username: { type: 'string' },
    firstname: { type: 'string' },
    lastname: { type: 'string' },
    email: { type: 'string' },
    active: { type: 'boolean' },
    password: { type: 'string' },
    friends: {
      collection: 'friend',
      via: 'id_user'
    }
  }
};

