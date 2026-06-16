# Lumii 地点数据源策略 2026-06-16

## 1. 结论

Lumii 宠物友好地点采用“地图 POI 打底 + Lumii 自有宠物友好层”的混合策略。

不是单纯依赖用户手工上传，也不是直接把高德 POI 原样展示为“宠物友好地点”。

## 2. 业务分工

### 2.1 地图 POI 负责基础地点

高德/腾讯 POI 提供基础地点信息：

- 地点名称。
- 地址。
- 经纬度。
- 地点分类。
- 与用户当前位置的距离。
- 外部导航能力。

适合从 POI 获取的类型：

- 宠物医院。
- 宠物店。
- 公园、绿地、可遛区域。
- 咖啡店、餐厅、商场。
- 洗护、美容、寄养。

### 2.2 Lumii 负责宠物友好属性

“宠物友好”不是普通地图 POI 能稳定给出的标准字段，所以这部分要沉淀成 Lumii 自有数据：

- 是否允许猫/狗。
- 是否允许大型犬。
- 是否可进室内。
- 是否需要牵引。
- 是否有饮水点。
- 是否有草坪或可活动区域。
- 是否需要预约。
- 是否适合约遛见面。
- 用户点评、照片、避坑提示。
- 平台审核状态。

这些信息来自用户点评、用户新增地点、运营补充和后续审核体系。

## 3. MVP 到生产的演进

### 3.1 当前 MVP

当前测试版地点主列表已接入 Lumii 测试后端的高德 POI 聚合层；当没有定位、没有 Web Service Key、外部接口失败或无有效 POI 时，再回退到 Lumii 测试后端 seed 数据。

已有能力：

- 地点搜索。
- 分类筛选。
- 猫狗友好筛选。
- 距离/评分/点评数排序。
- 地点详情。
- 收藏。
- 点评提交。
- 新增地点提交。
- 审核中状态。
- 高德地图底图、定位和外部导航。

当前不足：

- ~~地点主列表还没有接真实高德 POI。~~ 2026-06-16 已在测试后端接入高德 Web Service POI，App 通过 Lumii `/places/nearby` 和 `/places/search` 间接获取。
- ~~3km/5km 距离筛选主要依赖地点对象中的距离字段，不是后端基于经纬度实时计算。~~ 2026-06-16 后端已支持基于用户经纬度和半径查询高德 POI；历史 seed 地点仍保留距离字段兜底。
- 用户新增地点提交后进入审核中，不会自动进入附近地点列表。
- 高德 POI 只能作为“候选宠物友好地点”，仍需要 Lumii 自有点评、审核和运营数据确认。

### 3.2 下一阶段

后端新增 POI 聚合层，App 仍调用 Lumii 自己的地点接口，不直接调用高德 Web 服务。该层已在 2026-06-16 测试后端上线，后续继续优化 POI 分类、缓存和宠物友好评分。

推荐接口形态：

```http
GET /places/nearby?lat=23.1291&lng=113.2644&radius=3000&category=park&species=dog
GET /places/search?q=宠物医院&lat=23.1291&lng=113.2644&radius=5000
```

后端处理流程：

1. 接收 App 传入的经纬度、半径、搜索词和分类。
2. 调用高德 POI 周边搜索或关键字搜索。
3. 把高德 POI 标准化为 Lumii `Place`。
4. 用 `source=amap` 和 `sourcePoiId` 记录来源。
5. 与 Lumii 自有宠物友好层合并。
6. 返回给 App。

### 3.3 生产后

生产地点库应拆成两层：

```ts
type BasePoi = {
  source: 'amap' | 'tencent' | 'manual';
  sourcePoiId?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
};

type LumiiPlaceOverlay = {
  placeId: string;
  petFriendlyStatus: 'unknown' | 'pending' | 'verified' | 'rejected';
  supportedSpecies: Array<'cat' | 'dog'>;
  tags: string[];
  reviewCount: number;
  rating?: number;
  verifiedAt?: string;
};
```

App 展示的是二者合并后的 `Place`，而不是裸 POI。

## 4. 用户新增地点逻辑

用户新增地点不应直接创建公开地点。

推荐流程：

1. 用户填写地点名称、地址、宠物友好体验和照片。
2. 后端先用高德关键字搜索/逆地理信息尝试匹配已有 POI。
3. 如果匹配到 POI，则创建“宠物友好补充提交”，绑定该 POI。
4. 如果没有匹配到 POI，则创建 `source=manual` 的待审核地点。
5. 审核通过后进入 Lumii 自有宠物友好层。

这样可以避免重复地点、假地点和错误地址。

## 5. Key 与接入方式

### 5.1 当前 Android 高德 Key

现有 Android 高德 Key 继续用于 App 内 Android 地图 SDK：

- 地图底图。
- 定位展示。
- 地图样式。
- 原生地图组件。

它绑定 Android 包名和 SHA1，属于 Android 平台 SDK Key。

### 5.2 POI 搜索需要 Web 服务 Key

高德 POI 周边搜索和关键字搜索属于 Web 服务 API，需要在高德控制台新增“Web 服务”类型 Key。

该 Key 不应写入 App，不应打进 APK，应放在后端环境变量中：

```bash
AMAP_WEB_SERVICE_KEY=...
```

如果启用数字签名，也需要后端保存安全密钥：

```bash
AMAP_WEB_SERVICE_SECURITY_CODE=...
```

建议在高德控制台给 Web 服务 Key 配置服务器出口 IP 白名单。当前测试服务器出口 IP 可先按 `193.112.92.111` 配置，正式环境再按云厂商出口 IP 调整。

### 5.3 为什么不在 App 里直接调高德 POI

- Web 服务 Key 放在 App 里容易泄露。
- 后端需要做缓存、去重、合并 Lumii 宠物友好层。
- 后端需要做频控和费用控制。
- 后端可以屏蔽高德/腾讯差异，App 只依赖 Lumii API。

## 6. 高德 Web 服务接入点

优先使用高德地点搜索服务：

- 周边搜索：`https://restapi.amap.com/v5/place/around`
- 关键字搜索：`https://restapi.amap.com/v5/place/text`
- POI ID 搜索：按高德官方地点搜索服务能力补充。

接入时后端需要处理：

- `keywords`：宠物医院、宠物店、公园、咖啡、餐厅、商场等。
- `types`：后续可用高德 POI 分类码精细化。
- `location`：用户当前位置经纬度。
- `radius`：1km/3km/5km 等半径。
- 分页：高德搜索不支持一次返回全量数据，需要分页并限制最大数量。
- 缓存：按 geohash/城市/分类/半径缓存，降低费用和 QPS。

## 7. 当前需要用户提供

1. 高德控制台新增一个 Web 服务 Key，建议命名为 `Lumii灵伴-WebService`。
2. 确认是否启用 IP 白名单，建议先加入测试服务器出口 IP。
3. 确认是否启用数字签名；如果启用，需要把安全密钥提供给后端环境变量。
4. 确认高德免费额度、日调用量、QPS 和后续商业成本。
5. 后续 iOS 地图 SDK Key 仍需单独创建。

## 8. 官方依据

- 高德 Web 服务 API 创建 Key：`https://lbs.amap.com/api/webservice/create-project-and-key`
- 高德搜索 POI 2.0：`https://lbs.amap.com/api/webservice/guide/api-advanced/newpoisearch`
- 高德 Android 地图 SDK 获取 Key：`https://lbs.amap.com/api/android-sdk/guide/create-project/get-key`
- 高德 Web 服务错误码与平台不匹配/IP 白名单：`https://lbs.amap.com/api/webservice/info/`
