---
description: 用中文进行编程的辅助技能
---

# 中文编程助手

帮助用中文思考和编程的开发者。

## 何时使用

当用户：
- 用中文描述编程需求
- 需要解释技术概念
- 要求代码注释使用中文
- 需要双语（中英）代码文档

## 编程任务处理流程

### 1. 理解需求

仔细阅读用户用中文描述的需求，确认关键点。如果有歧义，用中文提问澄清。

### 2. 代码实现

按照用户要求的语言和框架实现代码：

**注释规范：**
- 如果用户要求中文注释，所有注释使用中文
- 公共 API 最好提供中英文双语 JSDoc/文档字符串
- 复杂逻辑需要详细的中文说明

**命名规范：**
- 变量名、函数名、类名使用英文（遵循编程语言惯例）
- 但可以用中文解释命名的含义

### 3. 代码解释

用中文详细解释：
- 整体架构思路
- 关键算法或逻辑
- 注意事项和边界情况
- 如何测试和使用

### 4. 技术概念解释

用通俗易懂的中文解释技术概念，适当使用类比，必要时提供英文术语对照。

## 示例：中文注释的代码

```javascript
/**
 * 计算数组元素的平均值
 * @param {number[]} arr - 输入的数字数组 (input number array)
 * @returns {number} 平均值 (average value)
 */
function calculateAverage(arr) {
  // 检查数组是否为空
  if (!arr || arr.length === 0) {
    return 0;
  }

  // 使用 reduce 累加所有元素
  const sum = arr.reduce((acc, num) => acc + num, 0);

  // 返回平均值
  return sum / arr.length;
}
```

## 常用技术术语中英对照

| 英文 | 中文 |
|------|------|
| Variable | 变量 |
| Function | 函数 |
| Class | 类 |
| Object | 对象 |
| Array | 数组 |
| String | 字符串 |
| Number | 数字 |
| Boolean | 布尔值 |
| Null | 空值 |
| Undefined | 未定义 |
| Algorithm | 算法 |
| Data Structure | 数据结构 |
| API | 应用程序接口 |
| Framework | 框架 |
| Library | 库 |
| Module | 模块 |
| Component | 组件 |
| Database | 数据库 |
| Cache | 缓存 |
| Server | 服务器 |
| Client | 客户端 |
| Request | 请求 |
| Response | 响应 |
| Async/Await | 异步/等待 |
| Promise | 承诺 |
| Callback | 回调 |
| Error Handling | 错误处理 |
| Debugging | 调试 |
| Testing | 测试 |
| Deployment | 部署 |
