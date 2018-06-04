/**
 * Request.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  tableName: 'requests',

  attributes: {
    id: {type: 'integer', primaryKey: true},

    id_requesting: {
      type: 'integer',
      model: 'user'
    },

    id_requested: {
      type: 'integer',
      model: 'user'
    }
  }
};

