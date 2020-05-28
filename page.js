// 可以使用测试号: https://developers.weixin.qq.com/sandbox
module.exports = {
    aaa: 'aaaaaaaaaaaaaaaaaaaa',
    pageUtil: function(pageNo = 1,pageSize = 10 , total = 56 ) {
        // console.log("page-----",total, pageNo, pageSize );
        
        if (pageNo <= 0) {
            pageNo = 1
        }
        if (pageSize <= 0) {
            pageSize = 10
        }

        // 列 第5页的数据 第一个开始的id 为 41 ~50
        var itemStartid = (pageNo - 1) * pageSize + 1;
        /**
         * 返回的页面数
         */
        var curPageNums = 0;
        // 最后一页 总页数 
        var total_page_nums = Math.ceil(total / pageSize) || 1;
        // 第4页 31~ 40 还有16页  56 - 4*10 = 16  -->10
        // 第5页 41~ 50 还有6 页  56 - 5*10 =  6  -->10
        // 第6页 51~ 60 还有-4页  56 - 6*10 = -4  --> 6
        // 第7页 61~ 70 还有-14页 56 - 7*10 = -14  -->0
        // 当前应返回几条记录
        var afterItemNums = total - pageNo * pageSize;
        if (afterItemNums >= 0) { // 后面页码  还有下一页 可能还有数据
            curPageNums = pageSize;
        } else if (afterItemNums <= -1 * pageSize) {
            // 已经是最后一页了 返回小于pageSize 数量
            curPageNums = 0;
        } else if (afterItemNums < 0) {
            // 页码超出 总页数
            curPageNums = pageSize + afterItemNums;
        }
        // console.log('     ---- total_page_nums: ', total_page_nums);
        // console.log('     ---- afterItemNums: ', afterItemNums);
        // console.log('     ---- curPageNums: ', curPageNums);
        return {
            total,
            pageNo,
            pageSize,
            total_page_nums,
            curPageNums,
            itemStartid
        }
    }
}