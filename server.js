var express = require("express");
var bodyParser = require("body-parser");
var path = require("path");
var session = require("express-session");
var axios = require("axios");
var config = require("./config");
var page = require("./page");
var WXBizDataCrypt = require("./WXBizDataCrypt");
var app = express();
var Mock = require("mockjs");
let Random = Mock.Random;


const util = require('./util.js')

const port = 9999;

function returnTimeout(cb, times = Random.natural(1, 1000)) {
  console.log(...arguments);
  setTimeout(() => {
    return cb();
  }, times);
}

function log() {
  console.log(...arguments);
}

function err() {
  console.error(...arguments);
}

// 存储所有用户信息
const users = [];

app
  .use(bodyParser.json())
  .use(
    session({
      secret: "alittlegirl",
      resave: false,
      saveUninitialized: true,
    })
  )

  .use((req, res, next) => {
    log(`\n\n<------------------------------------`);
    log(`<------------------------------------`);
    log(`<------------------------------------`);
    // log(req)
    log(`url       : ${req.url}`);
    log(`method    : ${req.method}`);
    log(`query     : `, req.query);
    log(`params    : `, req.params);
    log(`body      : `, req.body);
    log(`session   : `, req.session);
    // log(`headers   : `, req.headers);
    log(`userid    : `, req.headers.userid);
    log(`token     : `, req.headers.token);
    log(`openid    : `, req.headers.openid);
    log(`users     : `, users);
    req.user = null;
    users.forEach((uu) => {
      if (uu.id === req.headers.userid) {
        req.user = uu;
      }
    });
    log(`curUser   : `, req.user);
    if (req.user) {
      log(`存在的用户 wxapp openId`, req.user.openId);
    } else {
      log(`不存在的用户 session`, req.session.id);
    }
    next();
  })

  .get("/test/get", (req, res) => {
    // log(req)
    returnTimeout(() =>
      res.send({
        code: 0,
        data: {
          hello: "888999439 id: " + req.query.id || "",
        },
        "req.Query": req.query,
      })
    );
  })

  /**
   * 小程序登录 code => openid
   */
  .post("/oauth/login/code", (req, res) => {
    var params = req.body;
    log(params);
    var { code, type } = params;
    var res_openId = "openId";
    var res_session_key = "session_key";

    if (type === "wxapp") {
      let pa = {
        appid: config.appId,
        secret: config.appSecret,
        js_code: code,
        grant_type: "authorization_code",
      };
      log(pa);
      axios
        .get("https://api.weixin.qq.com/sns/jscode2session", { params: pa })
        .then(({ data }) => {
          log("jscode2session: ", data);
          if (data.openid) {
            res_openId = data.openid;
            res_session_key = data.session_key;
            log("users ", users);
            let isNewUser = false;
            var user = null;
            users.forEach((uu) => {
              if (uu.openId === res_openId) {
                user = uu;
              }
            });

            log("user ", user);
            if (!user) {
              isNewUser = true;
              user = {
                id: Random.guid(),
                nickName: Random.cname(),
                avatarUrl: "https://www.baidu.com/img/flexible/logo/pc/result.png",
                openId: res_openId,
                sessionKey: res_session_key,
                creatTime: util.formatTime(new Date()),
              };
              users.push(user);
              log("新用户", user);
            } else {
              log("老用户", user);
            }
            req.session.openId = user.openId;
            // log(req.session)
            return res.send({
              code: 0,
              data: {
                userId: user.id,
                // openId: res_openId,
                // session_key: res_session_key,
                isNewUser: isNewUser,
              },
              msg: "wxlogin 获取openid 成功",
            });
          } else {
            return res.send({
              code: 201,
              data: {
                openId: null,
                session_key: null,
              },
              msg: "请求微信服务异常",
              errmsg: data,
            });
          }
        })
        .catch((err) => {
          log("catch -----------------------------------------\n", err);
          return res.send({
            code: 203,
            data: {
              openId: null,
              session_key: null,
            },
            msg: "catch：/jscode2session 请求微信接口服务失败",
            // errmsg:JSON.stringify(err)
          });
        });
    } else {
      throw new Error("未知的授权类型");
    }
  })

  .get("/user/info", (req, res) => {
    if (req.user) {
      return res.send({
        code: 0,
        data:{
          user: req.user
        }
      });
    }
    throw new Error("用户未登录");
  })

  .post("/user/bindinfo", (req, res) => {
    var user = req.user;
    if (user) {
      var { encryptedData, iv } = req.body;
      var pc = new WXBizDataCrypt(config.appId, user.sessionKey);
      try {
        var data = pc.decryptData(encryptedData, iv);
      } catch (err) {
        throw new Error("session 失效建议重新登录");
      }
      Object.assign(user, data);
      return res.send({
        code: 0,
      });
    }
    throw new Error("用户未登录");
  })

  .post("/user/bindphone", (req, res) => {
    var user = req.user;
    if (user) {
      var { encryptedData, iv } = req.body;
      var pc = new WXBizDataCrypt(config.appId, user.sessionKey);
      try {
        var data = pc.decryptData(encryptedData, iv);
      } catch (err) {
        throw new Error("session 失效建议重新登录");
      }
      Object.assign(user, data);
      return res.send({
        code: 0,
      });
    }
    throw new Error("用户未登录");
  })

  /**
   * 商家列表
   */
  .post("/shops/list", (req, res) => {
    // log('\n\n---------------------------------------');
    // log('---------------------------------------');
    log("post -- shops/list");
    log("     -- body ", req.body);
    var { keyword, pageNo, pageSize } = req.body;

    var pageObj = page.pageUtil(pageNo, pageSize);
    var { curPageNums, itemStartid, total_page_nums } = { ...pageObj };
    // log(pageObj);

    let lists = [];
    while (curPageNums > 0) {
      let randomStr = Number(
        Math.random().toString().substr(3, 5) + Date.now()
      ).toString(36);
      lists.push(
        Mock.mock({
          id: itemStartid,
          name:
            itemStartid +
            "" +
            Mock.mock("@cname()") +
            (keyword || "") +
            "xxx店铺" +
            randomStr,
          time: Random.time(),
          aaguid: "@guid",
        })
      );
      itemStartid++;
      curPageNums--;
    }

    let resData = {
      code: 1,
      data: {
        list: lists,
        pageNo,
        pageSize: pageObj.pageSize,
        curPageNums: pageObj.curPageNums,
        total_page_nums: total_page_nums,
        total: pageObj.total,
      },
    };

    log("             || ");
    log("             || \n\n");
    log("---- resData---- \n");
    log(resData);
    log("---- resData.data.list---- \n");
    log(resData.data.list);
    log("---------------------------------------");
    log("---------------------------------------", " \n \n");

    // setreturnTimeout(() => {
    //     return res.send(resData)
    // }, 1000)
    returnTimeout(() => res.send(resData));
  })

  /**
   *
   */
  .use(function (err, req, res, next) {
    log("err", err.message);
    res.send({
      code: 500,
      message: "服务器异常：" + err.message,
    });
  })

  .listen(port, (err) => {
    log(`listen on http://localhost:${port}`);
  });
