const got = require("got");
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');
const timezone = require('@/utils/timezone');

module.exports = async (ctx) => {
  const rootUrl = `https://jw.scut.edu.cn`;
  const url = `${rootUrl}/zhinan/jw/api/v2/findInformNotice.do?pageNo=1&pageSize=10&tag=0&category=0`;
  const response = await got({
    method: "post",
    url,
    headers: {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "zh-CN,zh;q=0.9,ja;q=0.8",
      Connection: "keep-alive",
      "Content-Length": 0,
      Cookie:
        "JSESSIONID=0D91487F585F1AAE69F30078AF6EDBF3; clwz_blc_pst_JWCx2djw=4211753326.20480",
      DNT: 1,
      Host: "jw.scut.edu.cn",
      Origin: "https://jw.scut.edu.cn",
      Referer: "https://jw.scut.edu.cn/dist/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
    },
  });
  const data = JSON.parse(response.body).data;
  const list = data.list;
  const articleList = list.map((item) => {
    return {
      title: item.title,
      pubDate: parseDate(item.createDate, 'MM.DD'),
      link: `${rootUrl}/zhinan/cms/article/view.do?type=posts&id=${item.id}`,
    };
  });

  const items = await Promise.all(
      articleList.map(
          async (item) =>
              await ctx.cache.tryGet(item.link, async () => {
                const detailResponse = await got.get(item.link);
                const $ = cheerio.load(detailResponse.body);
                const content = $('.detail.fix-width>.content');
                $('img').each((i, e) => {
                  if ($(e).next().text().indexOf('附件') !== -1) {
                    $(e).remove();
                  }
                });
                item.description = content.html();
                return item;
              })
      )
  );


  ctx.state.data = {
    title: "华南理工大学 - 教务处新闻",
    link: rootUrl,
    item: items,
  };
};
