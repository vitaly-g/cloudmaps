/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var crypto = require('crypto');

module.exports = {

  register: function(req, res){
    if(req.method == 'POST'){
      var model = req.allParams();
      model.password = crypto.createHash('sha256').update(model.password).digest('hex');
      delete model.id;
      User.create(model, function(error, data){
        if(error){
          res.view('user/error', {message: 'При регистрации пользователя произошла ошибка: ' + error.message});
        }
        else{
          var nodemailer = require('nodemailer');
          var smtpTransport = require('nodemailer-smtp-transport');
          var transporter = nodemailer.createTransport(smtpTransport({
              host: 'localhost',
              port: 25,
              ignoreTLS: true
            })
          );
          var mailOptions ={
            from: 'test@cloudmaps.ru' ,
            to: model.email,
            subject: 'User Activation Email',
            text: 'http://localhost:1337/user/register/?id='+data.id+'&t='+model.password
          };
          transporter.sendMail(mailOptions, function(error, info){
            if(error){
              res.view('user/error', {message: 'При регистрации пользователя произошла ошибка: ' + error.message});
            }
            else res.view('user/after_register');
          });
        }
      });
    }
    else if(req.method == 'GET'){
      if(req.param('id') && req.param('t')){
        var id = parseInt(req.param('id')),
            token = req.param('t');
        User.findOne(id).exec(function(error,user){
          if(error){
            res.view('user/error',{message: 'При активации пользователя произошла ошибка: ' + error.message});
          }
          else{
            if(user.password == token){
              User.update(id, {active: true}).exec(function(error){
                if(error){
                  res.view('user/error',{message: 'При активации пользователя произошла ошибка: ' + error.message});
                }
                else{
                  res.redirect('/login');
                }
              });
            }
            else{
              res.view('user/error',{message: 'При активации пользователя произошла ошибка: неверный ключ активации'});
            }
          }
        });
      }
      else{
        res.view();
      }
    }
  },

  login: function(req, res){
    if(req.method == 'POST'){
      User.findOne({username: req.param('username')}).exec(function(error, user){
        if(error){
          res.view('user/error',{message: 'При проверке логина и пароля произошла ошибка: ' + error.message});
        }
        else{
          if(user.password == crypto.createHash('sha256').update(req.param('password')).digest('hex')){
            req.session.user = user;
            return res.redirect('/user/profile/'+user.id);
          }
          else{
            res.view('user/error',{message: 'Неверный логин или пароль'});
          }
        }
      });
    }
    else{
      if(typeof req.session.user == 'undefined'){
        return res.view();
      }
      else{
        return res.redirect('/user/profile/'+req.session.user.id);
      }
    }
  },

  profile: function(req, res){
    User.findOne(req.param('id')).exec(function(error, user){
      if(error){
        res.view('user/error',{message: 'Ошибка: ' + error.message});
      }
      else{
        res.view({
          user: _.omit(user, 'password')
        });
      }
    });
  },

  friends: function(req, res){
    if(req.xhr){
      switch(req.method){
        case 'GET':
          User.findOne(parseInt(req.param('id', 0))).populate('friends').exec(function(error, user){
            if(error)
              return res.negotiate(error);
            else {
              var friend_ids = _.map(user.friends, function(friend){return friend.id_friend;});
              User.find(friend_ids).exec(function(error, friends){
                if(error)
                  return res.negotiate(error);
                else{
                  return res.view({friends: friends});
                }
              });
            }
          });
          break;
        case 'DELETE':
          var id = parseInt(req.param('id'));
          Friend.destroy({
            id_user: [id, req.session.user.id],
            id_friend: [id, req.session.user.id]
          }).exec(function(error){
            if(error){
              return res.negotiate(error);
            }
            else{
              sails.sockets.blast('delete_friend',{
                id_user: req.session.user.id,
                id_friend: id
              });
              return res.ok();
            }
          });
          break;
        default:
          return res.badRequest();
      }
    }
    else{
      return res.badRequest();
    }
  },

  requests: function(req, res){
    if(req.xhr){
      switch(req.method){
        case 'GET':
          Request.find({
            id_requested: parseInt(req.param('id', 0))
          }).populate('id_requesting').exec(function(error, requests){
            if(error){
              return res.negotiate(error);
            }
            else {
              return res.view({requests: _.map(requests, function(request){return request.id_requesting;})});
            }
          });
          break;
        case 'PUT':
          Friend.create([{
            id_user: req.session.user.id,
            id_friend: parseInt(req.param('id'))
          },{
            id_friend: req.session.user.id,
            id_user: parseInt(req.param('id'))
          }]).exec(function(error, data){
            if(error)
              return res.negotiate(error);
            else{
              Friend.publishCreate(data[0], req);
              Request.destroy({
                id_requesting: parseInt(req.param('id')),
                id_requested: req.session.user.id
              }).exec(function(error){
                if(error)
                  return res.negotiate(error);
                else{
                  return res.ok();
                }
              });
            }
          });
          break;
        case 'DELETE':
          Request.destroy({
            id_requesting: parseInt(req.param('id')),
            id_requested: req.session.user.id
          }).exec(function(error){
            if(error)
              return res.negotiate(error);
            else{
              return res.ok();
            }
          });
          break;
        default:
          return res.badRequest();
      }
    }
    else{
      return res.badRequest();
    }
  },

  avatar: function(req, res){
    var fs = require('fs');
    var avatar_dir = sails.config.rootPath + '/avatars/';
    if(req.method == 'GET'){
      var avatar = avatar_dir + req.param('id') + '.jpg';
      fs.stat(avatar, function(error, stats){
        if(error){
          return res.sendfile(avatar_dir + 'default-avatar.jpg');
        }
        else if(stats.isFile()){
          return res.sendfile(avatar);
        }
        else{
          return res.notFound();
        }
      });
    }
    else if(req.method == 'POST'){
      req.file('file').upload({}, function(error, files){
        if(error)
          return res.negotiate(error);
        else{
          fs.rename(files[0].fd, avatar_dir+req.session.user.id+'.jpg', function(error){
            if(error)
              return res.negotiate(error);
            else
              return res.ok();
          });
        }

      });
    }
  },

  logout: function(req, res){
    delete req.session.user;
    return res.redirect('/');
  },

  list: function(req, res){
    if(req.xhr){
      Friend.find({id_user: req.session.user.id}).exec(function(error, friends){
        if(error)
          return res.negotiate(error);
        else{
          var exclude = _.map(friends, function(friend){return friend.id_friend;});
          Request.find({id_requesting: req.session.user.id}).exec(function(error, requests){
            if(error)
              return res.negotiate(error);
            else{
              exclude = exclude.concat(_.map(requests, function(request){return request.id_requested;}));
              exclude.push(req.session.user.id);
              User.find({id: {'!': exclude}}).exec(function(error, list){
                if(error)
                  return res.negotiate(error);
                else {
                  return res.view({list: list});
                }
              });
            }
          });
        }
      });
    }
    else{
      return res.badRequest();
    }
  },

  subscribe: function(req, res){
    if(req.isSocket && req.session.user){
      Request.watch(req);
      Friend.watch(req);
    }
    return res.ok();
  },

  request: function(req, res){
    if(req.xhr){
      var id_requested = req.param('id_requested');
      Request.count({
        id_requesting: req.session.user.id,
        id_requested: id_requested
      }).exec(function(error, count){
        if(error)
          return res.negotiate(error);
        else{
          if(!count){
            Request.create({
              id_requesting: req.session.user.id,
              id_requested: id_requested
            }).exec(function(error, request){
              if(error){
                return res.send({
                  success: false,
                  error: error
                });
              }
              else{
                Request.findOne(request.id).populateAll().exec(function(error, request){
                  request.id_requesting = _.omit(request.id_requesting, 'password');
                  Request.publishCreate(request, req);
                  return res.send({
                    success: true,
                    message: "Заявка успешно отправлена"
                  });
                });
              }
            });
          }
          else{
            return res.send({
              success: true,
              message: "Заявка уже существует"
            });
          }
        }
      });
    }
    else{
      return res.badRequest();
    }
  }
};

