var express = require('express');
var router = express.Router();

// http://localhost:9999/api/goods
router.get('/', function (req, res, next) {
  log('api/goods........',this);
  // res.send('GET /api/goods listing.'+global.str+str);

  returnTimeout(() => {
    res.send({
      code: 0,
      data: {
        goodsInfo: {
          id: '234',
          name: 'nike 鞋子',
          cate: '鞋子',
          price: '124.23',
          brand: 'nike'
        },
      },
      api: req.method + " " + req.baseUrl,
      reqUrl: req.headers['x-forwarded-proto'] + '://' + req.headers.host + req.originalUrl,
      reqQuery: req.query,
      reqData: req.body,
      users,
    });
  })
});

module.exports = router;
