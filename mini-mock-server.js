var express = require("express");
var bodyParser = require("body-parser");
var stream = require("stream");
// var Buffer = require("Buffer")
var session = require("express-session");
var ejs = require("ejs");
var axios = require("axios");
const multer = require('multer');

const multiparty = require('multiparty')
const uuid = require('uuid')
let uploadsrc = '/static/upload'

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'static/upload/' + file.fieldname)
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
})

var upload = multer({ storage: storage })

// const upload = multer({ dest: '.' + uploadsrc })

var baseconfig = require("./config");
var config = baseconfig;
var page = require("./page");
var path = require("path");
var fs = require("fs");
var WXBizDataCrypt = require("./WXBizDataCrypt");
var app = express();
var Mock = require("mockjs");

let Random = Mock.Random;

const util = require("./util.js");

const port = 9999;

global.str = "global.str 9999"

function returnTimeout(cb, times = Random.natural(1, 500)) {
  console.log(...arguments);
  setTimeout(() => {
    return cb();
  }, times);
}

function log() {
  console.log(...arguments);
}

function error() {
  console.error(...arguments);
}
global.returnTimeout = returnTimeout
global.log = log
global.error = error
global.startTime = util.formatTime(new Date())
// 存储所有用户信息
global.users = [];

//定义模板引擎
app.engine("html", ejs.__express);
app.set("engine", "ejs");
// app.set('view engine', 'ejs');
app.set('views','./views');
app.use(bodyParser.json());
// 引入其他路由 接口
app.use('/api/goods', require('./api/goods'));



app
  .use("/static", express.static("static"))
  .use(
    session({
      secret: "alittlegirl",
      // cookie: ('name', 'SESSION', { path: '/', httpOnly: true,secure: false, maxAge:  60000 }),
      resave: false,
      saveUninitialized: true,
    })
  )

  .use((req, res, next) => {
    log(`\n\n<------------------------------------`);
    log(`<------------------------------------`);
    // log(`req       : `, req);
    log(`<------------------------------------`);
    log(`url       : ${req.url}`);
    log(`method    : ${req.method}`);
    log(util.formatTime(new Date()));
    log(`query     : `, req.query);
    log(`params    : `, req.params);
    log(`body      : `, req.body);
    log(`session   : `, req.session);
    // log(`headers   : `, req.headers);
    log(`wxappUserId    : `, req.headers.wxappUserId);
    log(`token     : `, req.headers.token);
    log(`openid    : `, req.headers.openid);
    log(`service   : `, req.headers.service);
    log(`platform   : `, req.headers.platform);
    config = baseconfig[req.headers.service || "master"];
    log(`config    : `, config);
    // log(`sessionStore  sessions[${req.sessionStore.sessions.length}]  : `, req.sessionStore);
    log(`session.id   : `, req.session.id);
    log(`cookie    : `, req.headers.cookie);
    log(`session.SESSION   : `, req.session.SESSION);
    log(`session.openid   : `, req.session.openId);

    log(`global.users.length[${global.users.length}]}]   : \n`, users);

    req.user = null;
    users.forEach((uu) => {
      if (uu.wxappUserId === req.headers.wxappUserId) {
        req.user = uu;
        req.user.activeTime = util.formatTime(new Date())
      }
    });
    if (req.user) {
      log(`存在的用户 curUser:`, req.user);
    } else {
      log(`不存在的用户 session`, req.session.id);
    }

    next();
  })
  .get("/", function (req, res) {
    res.render("index.ejs", {
      title: "hello get " + config.api + "/ ",
      users: users,
      startTime: startTime,
      serverTime: util.formatTime(new Date()) + '  ' + new Date().getTime()
    })
  })
  .get("/test/get", (req, res) => {
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
  .post("/user/info", (req, res) => {
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

  .post("/apicustom/logout", (req, res) => {
    return res.send({
      code: 0,
      data: {},
      msg: '退出成功',
      reqData: req.body,
    });
  })

  .post("/apicustom/getUserInfo", (req, res) => {
    // res.redirect('/user/info');
    log(`session   : `, req.session);
    log(`session.id   : `, req.session.id);
    log(`session.SESSION   : `, req.session.SESSION);
    log(`session.openid   : `, req.session.openId);
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
  // .post("/apimaster/login", (req, res) => {
    // res.location('/apimaster/login');
    // res.redirect('/apicustom/login');
    // res.('/foo/bar');
  // })
  .post("/apicustom/login", (req, res) => {
    // .post("/apicustom/login", (req, res) => {
    // res.redirect('/test/get');

    // var user = req.user;
    // if (user) {
    var { encryptedData, iv, code, signature } = req.body;
    let pa = {
      appid: config.appId,
      secret: config.appSecret,
      js_code: code,
      grant_type: "authorization_code",
    };
    log("jscode2session params ", pa);
    var res_openId = "openId";
    var res_session_key = "session_key";
    axios
      .get("https://api.weixin.qq.com/sns/jscode2session", {
        params: pa,
      })
      .then(({ data }) => {
        log("jscode2session: ", data);
        if (data.openid) {
          res_openId = data.openid;
          res_session_key = data.session_key;
          try {
            var pc = new WXBizDataCrypt(config.appId, res_session_key);
            var decryptData = pc.decryptData(encryptedData, iv);

            openId = decryptData.openId;
            let isNewUser = false;
            var user = null;
            global.users.forEach((uu) => {
              if (uu.openId === res_openId) {
                user = uu;
              }
            });
            log("user ", user);
            if (!user) {
              isNewUser = true;
              user = {
                wxappUserId: Random.guid(),
                phone: "",
                wxappNickName: decryptData.nickName,
                wxappAvatarUrl: decryptData.avatarUrl,
                openId: decryptData.openId,
                sessionKey: data.session_key,
                creatTime: util.formatTime(new Date()),
              };
              global.users.push(user);
              log("创建了新用户 ：", user);
            } else {
              log("老用户上线了 ：", user);
              user.wxappNickName = decryptData.nickName;
              user.wxappAvatarUrl = decryptData.avatarUrl;
              // 更新session——key
              user.sessionKey = data.session_key;
            }
            req.session.openId = user.openId;
            req.session.SESSION = req.session.id;
            log("req.session - ", req.session);
            return res.send({
              code: 0,
              data: {
                ...user,
                // wxappUserId: user.wxappUserId,
                isNewUser: isNewUser,
              },
              sessionId: req.session.id,
              msg: "wxlogin 获取用户信息 成功",
            });
          } catch (err) {
            //
            return res.send({
              code: 202,
              data: {
                res_openId,
                res_session_key,
              },
              msg: "服务授权解析异常",
              msgerr: "服务授权解析异常232 获取到openid 解析用户信息失败",
              reqData: req.body,
            });
          }
        } else {
          log("/user/bindinfo jscode2session 获取失败");
          return res.send({
            code: 203,
            data: {},
            msg: data,
            reqData: req.body,
          });
        }
      })
      .catch((err) => {
        error("jscode2session: params err", err);
      });

    // }
    // throw new Error("用户未登录");
  })

  .post("/user/bindphone", (req, res) => {
    var user = req.user;
    if (user) {
      var res_session_key = "session_key";
      var { encryptedData, iv, code, signature } = req.body;

      var res_openId = "openId";
      var res_session_key = "session_key";
      let pa = {
        appid: config.appId,
        secret: config.appSecret,
        js_code: code,
        grant_type: "authorization_code",
      };
      log("jscode2session params ", pa);
      axios
        .get("https://api.weixin.qq.com/sns/jscode2session", {
          params: pa,
        })
        .then(({ data }) => {
          log("jscode2session: ", data);
          if (data.openid) {
            var pc = new WXBizDataCrypt(config.appId, user.sessionKey);
            try {
              var data = pc.decryptData(encryptedData, iv);
              log("bindphone  ", data);
            } catch (err) {
              return res.send({
                code: 201,
                data: {
                  userInfo: user,
                },
                msg: "session 失效建议重新登录",
              });
            }
            // Object.assign(user, data);
            user.phone = data.phoneNumber;
            return res.send({
              code: 0,
              data: {
                userInfo: user,
                phone: data.phoneNumber,
              },
            });
          }
        });
    } else {
      return res.send({
        code: 201,
        data: {},
        msg: "未获取到用户信息",
      });
    }
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
            log("global.users ", global.users);
            let isNewUser = false;
            var user = null;
            global.users.forEach((uu) => {
              if (uu.openId === res_openId) {
                user = uu;
              }
            });

            log("user ", user);
            if (!user) {
              isNewUser = true;
              user = {
                id: Random.guid(),
                wxappNickName: Random.cname(),
                wxappAvatarUrl:
                  "https://www.baidu.com/img/flexible/logo/pc/result.png",
                openId: res_openId,
                sessionKey: res_session_key,
                creatTime: util.formatTime(new Date()),
              };
              global.users.push(user);
              log("新用户", user);
            } else {
              log("老用户", user);
              // 更新session——key
              user.sessionKey = res_session_key;
            }
            req.session.openId = user.openId;
            // log(req.session)
            return res.send({
              code: 0,
              data: {
                wxappUserId: user.wxappUserId,
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

  .post("/test/buffer", function (req, res) {
    const buffer = Buffer.from("p8AuXbAKFihL9N1H4aYi7w==", "base64");
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(res);
    // const buffer = Buffer.from('p8AuXbAKFihL9N1H4aYi7w==', 'base64');
    // res.send(buffer);
  })

  .post("/test/uploadImg", upload.single('file'), function (req, res) {
    log('test/uploadImg')
    returnTimeout(() =>
      res.send({
        code: 0,
        data: {
          hello: "888999439 id: ",
          filename: config.api + '/' + req.file.path,
          file: req.file,
        },
        reqData: req.query,
      })
    );
  })

  .post("/get/location", function (req, res) {
    log('/get/location')
    // location=lat<纬度>,lng<经度>
    let lat = req.body.lat || '39.984154';
    let lng = req.body.lng || '116.307490';
    // list接口： 获取全部行政区划数据。该请求为GET请求。
    // https://apis.map.qq.com/ws/district/v1/list
    // getchildren接口：获取指定行政区划的子级行政区划。该请求为GET请求。
    // https://apis.map.qq.com/ws/district/v1/getchildren
    // search接口：根据关键词搜索行政区划。该请求为GET请求。
    // https://apis.map.qq.com/ws/district/v1/search
    axios
      .get(
        // `http://apis.map.qq.com/ws/geocoder/v1/?location=39.984154,116.307490&key=NS7BZ-3ZBWU-JPRVS-4MWUV-D5EKT-2SBSQ`,
        `http://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}&key=NS7BZ-3ZBWU-JPRVS-4MWUV-D5EKT-2SBSQ`,
        { params: {} }
      )
      .then((res_t) => {
        console.log(res_t.data);
        return res.send({
          code: 0,
          data: {
            location: res_t.data,
          },
          reqData: req.body,
          msg: "获取 定位 成功",
        });
      });

  })

  /**
   *获取 access_token
   */
  .post("/cgi-bin/token", (req, res) => {
    let access_token;
    axios
      .get(
        "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" +
        config.appId +
        "&secret=" +
        config.appSecret,
        { params: {} }
      )
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
      });
  })

  /**
   *获取 access_token 获取 二维码
   */
  .post("/wxa/getwxacodeunlimit", (req, res) => {
    let access_token;
    axios
      .get(
        "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" +
        config.appId +
        "&secret=" +
        config.appSecret,
        { params: {} }
      )
      .then((res_t) => {
        console.log(res_t.data);
        access_token = res_t.data.access_token;
        axios({
          headers: { "Content-type": "application/json" },
          method: "post",
          responseType: "arraybuffer",
          url:
            "https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=" +
            access_token +
            "",
          data: req.body.config || {
            scene: "id=234",
            // page:'pages/index/index', // 未发布小程序不行
            width: 280,
          },
        }).then((res_img) => {
          let src = `static/img/qrcodeshare.png`;
          // let src = path.dirname(__dirname).replace(/\\/g, '/') + `/mini-mock-server/static/img/qrcodeshare.png`;
          console.log(res_img);
          fs.writeFile(src, res_img.data, function (err) {
            if (err) {
              console.log(err);
            }
            return res.send({
              code: 0,
              data: {
                imgurl: config.api + "/" + src,
              },
              msg: "获取 图片 成功",
            });
          });
          // return res.send(res_img);
        });
      });
  })

  /**
   * 页面列表
   */
  .post("/get/info", (req, res) => {
    // log('\n\n---------------------------------------');
    // log('---------------------------------------');
    // log("     -- body ", req.body);
    // log(Random.dataImage('200x100'));

    let imglistnums = Random.natural(0, 5);
    let imglist = [];
    for (let index = 0; index < imglistnums; index++) {
      imglist.push({
        id: index,
        imgurl: Random.image('200x200', Random.color()),
        name: Mock.mock('@cname()') + '套餐',
        price: Random.float(0.01, 100, 2, 2)
      });
    }

    let resData = {
      code: 0,
      data: {
        info: Mock.mock({
          id: Mock.mock("@id()"),
          cname: Mock.mock("@id()") + Mock.mock("@cname()"),
          namesort: Mock.mock("@cname()"),
          name: Mock.mock("@cname()") + "xxx店铺",
          namelong: "" + Mock.mock("@cname()") + "xxx店铺",
          time: Mock.mock('@date("yyyy-MM-dd")') + Random.time("HH:mm:ss"),
          time_HHmmss: Random.time("HH:mm:ss"),
          time_HHmm: Random.time("HH:mm"),
          data_yyyyMMdd: Mock.mock('@date("yyyy-MM-dd")'),
          data_MMdd: Mock.mock('@date("MM-dd")'),
          title: Random.ctitle(),
          cparagraph: Random.cparagraph(),
          permissions: ["CHN", "JPN", "FRA"],
          imglists: imglist,
          imglist: [
            {
              id: 0,
              imgurl: Random.image("200x200", Random.color()),
              name: Mock.mock("@cname()") + "0套餐",
              price: Random.float(0.01, 100, 2, 2),
            },
            {
              id: 1,
              imgurl: Random.image("200x200", Random.color()),
              name: Mock.mock("@cname()") + "1套餐",
              price: Random.float(0.01, 100, 2, 2),
            },
            {
              id: 2,
              imgurl: Random.image("200x200", Random.color()),
              name: Mock.mock("@cname()") + "2套餐",
              price: Random.float(0.01, 100, 2, 2),
            },
            {
              id: 3,
              imgurl: Random.image("200x200", Random.color()),
              name: Mock.mock("@cname()") + "3套餐",
              price: Random.float(0.01, 100, 2, 2),
            },
            {
              id: 4,
              imgurl: Random.image("200x200", Random.color()),
              name: Mock.mock("@cname()") + "4套餐",
              price: Random.float(0.01, 100, 2, 2),
            },
          ],
          address: Mock.mock("@county(true)"),
          imgurl: Random.image("200x200", Random.color()),
          "num|1-100": 1,
          "number|1-3": 1,
          "boolean|1-2": true,
          price: Random.float(0.01, 100, 2, 2),
          aaguid: "@guid",
        }),
      },
      reqData: req.body,
    };

    // log("             || ");
    // log("             || \n\n");
    // log("---- resData---- \n");
    // log(resData);
    // log("---------------------------------------");
    // log("---------------------------------------", " \n \n");
    returnTimeout(() => res.send(resData));
  })

  /**
   * 通用列表查询
   */
  .post("/page/list", (req, res) => {
    // log("     -- body ", req.body);
    var { keyword, pageNo, pageSize } = req.body;

    var pageObj = page.pageUtil(pageNo, pageSize);
    var { curPageNums, itemStartid, totalPages } = { ...pageObj };
    // log(pageObj);

    // Random.image("200x100") http://dummyimage.com/200x100

    let lists = [];
    while (curPageNums > 0) {
      let randomStr = Number(
        Math.random().toString().substr(3, 5) + Date.now()
      ).toString(36);

      let imglistnums = Random.natural(0, 5);
      let imglist = [];
      for (let index = 0; index < imglistnums; index++) {
        imglist.push({
          id: index,
          imgurl: Random.image('200x200', Random.color()),
          name: Mock.mock('@cname()') + '套餐',
          price: Random.float(0.01, 100, 2, 2)
        });
      }

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
          time:
            Mock.mock('@date("yyyy-MM-dd")') + " " + Random.time("HH:mm:ss"),
          time_HHmmss: Random.time("HH:mm:ss"),
          time_HHmm: Random.time("HH:mm"),
          data_yyyyMMdd: Mock.mock('@date("yyyy-MM-dd")'),
          data_MMdd: Mock.mock('@date("MM-dd")'),
          imglists: imglist,
          imglist: [
            {
              id: 0,
              imgurl: Random.image("200x200", Random.color()),
              name: Mock.mock("@cname()") + "0套餐",
              price: Random.float(0.01, 100, 2, 2),
            },
            {
              id: 1,
              imgurl: Random.image("200x200", Random.color()),
              name: Mock.mock("@cname()") + "1套餐",
              price: Random.float(0.01, 100, 2, 2),
            },
            {
              id: 2,
              imgurl: Random.image("200x200", Random.color()),
              name: Mock.mock("@cname()") + "2套餐",
              price: Random.float(0.01, 100, 2, 2),
            },
            {
              id: 3,
              imgurl: Random.image("200x200", Random.color()),
              name: Mock.mock("@cname()") + "3套餐",
              price: Random.float(0.01, 100, 2, 2),
            },
            {
              id: 4,
              imgurl: Random.image("200x200", Random.color()),
              name: Mock.mock("@cname()") + "4套餐",
              price: Random.float(0.01, 100, 2, 2),
            },
          ],
          title: Random.ctitle(),
          cparagraph: Random.cparagraph(),
          address: Mock.mock("@county(true)"),
          imgurl: Random.image("200x200", Random.color()),
          "num|1-100": 1,
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

    // log("             || ");
    // log("             || \n\n");
    // log("---- resData---- \n");
    // log(resData);
    // log("---- resData.data.list---- \n");
    // log(resData.data.list);
    // log("---------------------------------------");
    // log("---------------------------------------", " \n \n");

    returnTimeout(() => res.send(resData));
  })

  /**
   * 页面列表
   */
  .post("/form/add", (req, res) => {
    // log('\n\n---------------------------------------');
    // log('---------------------------------------');
    // log("     -- body ", req.body);

    let resData = {
      code: 0,
      data: req.body,
      reqData: req.body,
    };

    // log("             || ");
    // log("             || \n\n");
    // log("---- resData---- \n");
    // log(resData);
    // log("---------------------------------------");
    // log("---------------------------------------", " \n \n");
    returnTimeout(() => res.send(resData));
  })

  /**
   * 页面列表
   */
  .post("/form/edit", (req, res) => {
    // log('\n\n---------------------------------------');
    // log('---------------------------------------');
    // log("     -- body ", req.body);

    let resData = {
      code: 0,
      data: req.body,
      reqData: req.body,
    };

    // log("             || ");
    // log("             || \n\n");
    // log("---- resData---- \n");
    // log(resData);
    // log("---------------------------------------");
    // log("---------------------------------------", " \n \n");
    returnTimeout(() => res.send(resData));
  })

  /**
   * 页面列表
   */
  .post("/delete", (req, res) => {
    // log('\n\n---------------------------------------');
    // log('---------------------------------------');
    // log("     -- body ", req.body);

    let resData = {
      code: 0,
      data: {},
      reqData: req.body,
    };

    // log("             || ");
    // log("             || \n\n");
    // log("---- resData---- \n");
    // log(resData);
    // log("---------------------------------------");
    // log("---------------------------------------", " \n \n");
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
