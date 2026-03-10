OurOwnWealth

投资记账与资产占比可视化工具 · Personal Asset Allocation Tracker


简介 | Introduction

OurOwnWealth 是一个纯前端的网页工具，用于记录各类资产金额并查看占比分布。不依赖后端，不做任何数据持久化（不写 Cookie、localStorage 或上传服务器），所有数据仅在当前标签页内存中计算，关闭或刷新即清空。

OurOwnWealth is a front-end only web app for recording asset amounts and viewing allocation. It needs no backend and does not persist any data (no cookies, localStorage, or server uploads). All data is computed in memory for the current tab and is cleared on refresh or close.


功能特性 | Features

资产与金额 | Assets & Amounts

默认资产项目：SPY、QQQ、Nikkei、美股、日股、黄金、BTC、ETH、现金USD、现金CNY。
Default assets: SPY, QQQ, Nikkei, US stocks, Japan stocks, Gold, BTC, ETH, Cash USD, Cash CNY.

每项可选择计价单位（人民币/美元/日元/港币/欧元/BTC/ETH/其他），金额支持千分位显示。
Each row has a unit selector (CNY/USD/JPY/HKD/EUR/BTC/ETH/Other); amounts can show thousands separators.

支持自定义资产项目（仅当前会话有效），可删除任意不需要的默认项。
Custom assets (session-only) and removal of any default row are supported.


汇率与基准货币 | Exchange Rates & Base Currency

页面加载时从 Frankfurter Open API（欧洲央行数据，无需 API Key）拉取实时汇率。
On load, Frankfurter Open API (ECB data, no API key) is used for live rates.

总资产与占比按所选基准货币（人民币/美元/欧元/日元/港币）统一折算；加密货币与「其他」单位不参与汇率换算。
Total and percentages are converted to the chosen base currency (CNY/USD/EUR/JPY/HKD); crypto and "Other" units are not converted.


图表与导出 | Chart & Export

右侧环形图展示资产占比，每类资产使用不同低饱和度颜色，标签以小气泡贴附在对应扇区旁。
A doughnut chart shows allocation with distinct, low-saturation colours and small callout labels next to each segment.

下载：可将「环形图 + 下方明细列表」整块导出为一张 PNG 图片。
Download: Export the chart and the table below as a single PNG image.


排序 | Reordering

桌面：在资产行上按住鼠标拖动即可调整顺序。
Desktop: Drag a row with the mouse to reorder.

移动端：在资产行上长按约 0.4 秒后进入拖动，移动手指到目标位置松手即可。
Mobile: Long-press a row (about 0.4 s) then drag with your finger to reorder.


目录结构 | Project Structure

OurOwnWealth/
  html/
    index.html        页面结构 | Page structure
  css/
    style.css         样式与布局 | Styles & layout
  js/
    app.js            业务与图表逻辑 | App & chart logic
  image/
    oow.png           站点头部 Logo | Header logo
  README.md


使用方式 | How to Use

打开页面：用浏览器直接打开 html/index.html，或用静态服务器（如 VSCode Live Server、python -m http.server）以项目根目录为根路径访问。
Open: Load html/index.html in a browser, or serve the project root with any static server (e.g. VSCode Live Server, python -m http.server).

输入与排序：在左侧为每项选择单位并输入金额；通过拖动（桌面）或长按后拖动（移动端）调整行顺序。
Input & reorder: Choose units and enter amounts on the left; reorder by dragging (desktop) or long-press then drag (mobile).

查看与导出：右侧环形图和表格会随输入与基准货币实时更新；点击「下载图表 PNG」可保存当前图表与列表为一张图。
View & export: The chart and table update as you type and change base currency; use "下载图表 PNG" to save the chart and list as one image.


数据与隐私 | Data & Privacy

不写入 Cookie、localStorage、IndexedDB，不向服务器上传任何资产数据。
No cookies, localStorage, or IndexedDB; no asset data is sent to any server.

汇率请求仅访问 Frankfurter API，不携带用户输入。
Only Frankfurter API is called for rates; no user input is sent.

所有输入与顺序仅存在于当前标签页，刷新或关闭后即消失。
All inputs and order exist only in the current tab and are lost on refresh or close.


汇率数据说明 | Exchange Rate Data

汇率与货币换算基于 Frankfurter Open API（欧洲央行公开数据），仅供参考，不构成任何投资建议。
Exchange rates and conversions use Frankfurter Open API (European Central Bank open data), for reference only and not as investment advice.
