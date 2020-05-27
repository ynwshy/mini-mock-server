// 可以使用测试号: https://developers.weixin.qq.com/sandbox
module.exports = {
    aaa: 'aaaaaaaaaaaaaaaaaaaa',
    pageUtil:function(total ,pageSize,pageNo){
        total = total || 53;
        
        // 列 第5页的数据 第一个开始的id 为 41 ~50
        var itemStartid = (pageNo - 1) * pageSize + 1;
        /**
         * 返回的页面数
         */
        var pageSize_return = 0;
        // 最后一页
        var lastPageNo = Math.ceil(total / pageSize) || 1;
        // 第4页 31~ 40 还有16页  56 - 4*10 = 16  -->10
        // 第5页 41~ 50 还有6 页  56 - 5*10 =  6  -->10
        // 第6页 51~ 60 还有-4页  56 - 6*10 = -4  --> 6
        // 第7页 61~ 70 还有-14页 56 - 7*10 = -14  -->0
        // 当前应返回几条记录
        var afterItemNums = total - pageNo * pageSize;
        if (afterItemNums >= 0) { // 后面页码  还有下一页 可能还有数据
            pageSize_return = pageSize
        } else if (afterItemNums <= -1 * pageSize) {
            // 已经是最后一页了 返回小于pageSize 数量
            pageSize_return = 0
        } else if (afterItemNums < 0) {
            // 页码超出 总页数
            pageSize_return = pageSize + afterItemNums
        }
        // console.log('     ---- lastPageNo: ', lastPageNo);
        // console.log('     ---- afterItemNums: ', afterItemNums);
        // console.log('     ---- pageSize_return: ', pageSize_return);
        return{
            total ,pageSize,pageNo,lastPageNo,pageSize_return,itemStartid
        }
    }
  }
  