/**
 * Friend.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  tableName: 'friends',

  attributes: {
    id: { type: 'integer', primaryKey: true },
    id_user: {
      type: 'integer',
      model: 'user'
    },
    id_friend: { type: 'integer' }
  }
};

