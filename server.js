var express = require("express");
var bodyParser = require("body-parser");
var path = require("path");
var stream = require("stream");
// var Buffer = require("Buffer")
var session = require("express-session");
var axios = require("axios");
var config = require("./config");
var page = require("./page");
var path = require("path");
var fs = require("fs");
var WXBizDataCrypt = require("./WXBizDataCrypt");
var app = express();
var Mock = require("mockjs");


let Random = Mock.Random;

const util = require("./util.js");

const port = 9999;

function returnTimeout(cb, times = Random.natural(1, 500)) {
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
// .use('/', express.static('img'))
app.use('/static', express.static('static'))
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
        reqData: req.query,
      })
    );
  })
  .post('/test/buffer', function (req, res) {
    const buffer = Buffer.from('p8AuXbAKFihL9N1H4aYi7w==', 'base64');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(res);
    // const buffer = Buffer.from('p8AuXbAKFihL9N1H4aYi7w==', 'base64');
    // res.send(buffer);
  })
  /**
   *获取 access_token
   */
  .post("/cgi-bin/token", (req, res) => {

    let access_token;
    axios
      .get("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" + config.appId + "&secret=" + config.appSecret, { params: {} })
      .then((res_t) => {
        console.log(res_t.data);
        access_token = res_t.data.access_token;
        return res.send({
          code: 0,
          data: {
            access_token: access_token,
          },
          msg: "获取 access_token 成功",
        });
      })
  })
  /**
   *获取 access_token 获取 二维码
   */
  .get("/wxa/getwxacodeunlimit", (req, res) => {

    let access_token;
    axios
      .get("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" + config.appId + "&secret=" + config.appSecret, { params: {} })
      .then((res_t) => {
        console.log(res_t.data);
        access_token = res_t.data.access_token;
        axios({
          headers: { "Content-type": "application/json" },
          method: 'post',
          responseType: 'arraybuffer',
          url: 'https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=' + access_token + '',
          data: {
            scene: 'id=234',
            //
            // page:'pages/infor/main',
            width: 280
          }
        })
          .then((res_img) => {
            let src = `static/img/qrcodeshare.png`;
            // let src = path.dirname(__dirname).replace(/\\/g, '/') + `/mini-mock-server/static/img/qrcodeshare.png`;
            // console.log(src);
            fs.writeFile(src, res_img.data, function (err) {
              if (err) { console.log(err); }
              return res.send({
                code: 0,
                data: {
                  imgurl: config.api + '/' + src,
                },
                msg: "获取 图片 成功",
              });
            });
            // return res.send(res_img);
          })
      })
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
                avatarUrl:
                  "https://www.baidu.com/img/flexible/logo/pc/result.png",
                openId: res_openId,
                sessionKey: res_session_key,
                creatTime: util.formatTime(new Date()),
              };
              users.push(user);
              log("新用户", user);
            } else {
              log("老用户", user);
              // 更新session——key
              user.sessionKey= res_session_key
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
        data: {
          user: req.user,
        },
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
      log("WXBizDataCrypt : ", config.appId, user.sessionKey)
      var pc = new WXBizDataCrypt(config.appId, user.sessionKey);
      try {
        var data = pc.decryptData(encryptedData, iv);
        log(data)
      } catch (err) {return res.send({
        code: 0,
        data: {
          userinfo: user
        },
        msg:"session 失效建议重新登录"
      });
      }
      Object.assign(user, data);
      return res.send({
        code: 0,
        data: {
          phone: data
        }
      });
    } else {
      return res.send({
        code: 201,
        data: {
        },
        msg: "未获取到用户信息"
      });
    }
  })

  /**
   * 页面列表
   */
  .post("/get/info", (req, res) => {
    // log('\n\n---------------------------------------');
    // log('---------------------------------------');
    log("     -- body ", req.body);
    // log(Random.dataImage('200x100'));

    let resData = {
      code: 0,
      data: {
        info: Mock.mock({
          id: Mock.mock("@id()"),
          cname: Mock.mock("@id()") + Mock.mock("@cname()"),
          namesort: Mock.mock("@cname()"),
          name: Mock.mock("@cname()") + "xxx店铺",
          namelong: "" + Mock.mock("@cname()") + "xxx店铺",
          time: Random.time(),
          title: Random.ctitle(),
          cparagraph: Random.cparagraph(),
          permissions: ['CHN', 'JPN', 'FRA'],
          address: Mock.mock("@county(true)"),
          imgurl: Random.image("200x200", Random.color()),
          "number|1-3": 1,
          "boolean|1-2": true,
          price: Random.float(0.01, 100, 2, 2),
          aaguid: "@guid",
        }),
      },
      reqData: req.body,
    };

    log("             || ");
    log("             || \n\n");
    log("---- resData---- \n");
    log(resData);
    log("---------------------------------------");
    log("---------------------------------------", " \n \n");
    returnTimeout(() => res.send(resData));
  })

  /**
   * 商家列表
   */
  .post("/page/list", (req, res) => {
    log("     -- body ", req.body);
    var { keyword, pageNo, pageSize } = req.body;

    var pageObj = page.pageUtil(pageNo, pageSize);
    var { curPageNums, itemStartid, totalPages } = { ...pageObj };
    // log(pageObj);

    // log(",,,img  ", Random.dataImage("200x100"));

    // http://dummyimage.com/200x100
    log(",,,img  ", Random.image("200x100"));

    let lists = [];
    while (curPageNums > 0) {
      let randomStr = Number(
        Math.random().toString().substr(3, 5) + Date.now()
      ).toString(36);
      lists.push(
        Mock.mock({
          id: itemStartid,
          cname: itemStartid + Mock.mock("@cname()"),
          namesort: itemStartid + Mock.mock("@cname()"),
          name:
            itemStartid +
            "" +
            Mock.mock("@cname()") +
            (keyword || "") +
            "xxx店铺",
          namelong:
            itemStartid +
            "" +
            Mock.mock("@cname()") +
            (keyword || "") +
            "xxx店铺" +
            randomStr,
          time: Random.time(),
          title: Random.ctitle(),
          cparagraph: Random.cparagraph(),
          address: Mock.mock("@county(true)"),
          imgurl: Random.image("200x200", Random.color()),
          "number|1-3": 1,
          "boolean|1-2": true,
          price: Random.float(0.01, 100, 2, 2),
          aaguid: "@guid",
        })
      );
      itemStartid++;
      curPageNums--;
    }

    let resData = {
      code: 0,
      data: {
        list: lists,
        pageNo,
        pageSize: pageObj.pageSize,
        curPageNums: pageObj.curPageNums,
        totalPages: totalPages,
        total: pageObj.total,
      },
      reqData: req.body,
    };

    log("             || ");
    log("             || \n\n");
    log("---- resData---- \n");
    log(resData);
    log("---- resData.data.list---- \n");
    log(resData.data.list);
    log("---------------------------------------");
    log("---------------------------------------", " \n \n");

    returnTimeout(() => res.send(resData));
  })

  /**
   * 页面列表
   */
  .post("/form/add", (req, res) => {
    // log('\n\n---------------------------------------');
    // log('---------------------------------------');
    log("     -- body ", req.body);

    let resData = {
      code: 0,
      data: {
      },
      reqData: req.body,
    };

    log("             || ");
    log("             || \n\n");
    log("---- resData---- \n");
    log(resData);
    log("---------------------------------------");
    log("---------------------------------------", " \n \n");
    returnTimeout(() => res.send(resData));
  })

  /**
   * 页面列表
   */
  .post("/form/edit", (req, res) => {
    // log('\n\n---------------------------------------');
    // log('---------------------------------------');
    log("     -- body ", req.body);

    let resData = {
      code: 0,
      data: {
      },
      reqData: req.body,
    };

    log("             || ");
    log("             || \n\n");
    log("---- resData---- \n");
    log(resData);
    log("---------------------------------------");
    log("---------------------------------------", " \n \n");
    returnTimeout(() => res.send(resData));
  })

  /**
   * 页面列表
   */
  .post("/delete", (req, res) => {
    // log('\n\n---------------------------------------');
    // log('---------------------------------------');
    log("     -- body ", req.body);

    let resData = {
      code: 0,
      data: {
      },
      reqData: req.body,
    };

    log("             || ");
    log("             || \n\n");
    log("---- resData---- \n");
    log(resData);
    log("---------------------------------------");
    log("---------------------------------------", " \n \n");
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
