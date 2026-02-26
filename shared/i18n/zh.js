// Chinese (Simplified) Translations
I18n.register('zh', {
  // Common
  common: {
    back: '返回工具集',
    backShort: '返回',
    download: '下载',
    downloadPng: '下载 PNG',
    downloadGif: '下载 GIF',
    clear: '清除',
    reset: '重置',
    close: '关闭',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    saved: '已保存',
    saving: '保存中...',
    export: '导出',
    upload: '上传',
    dragHere: '拖拽文件到这里',
    orClick: '或者点击选择文件',
    supportedFormats: '支持 {formats} 格式',
    processing: '正在处理，请稍候...',
    pleaseWait: '请稍候...',
    error: '错误',
    success: '成功',
    undo: '撤销',
    redo: '重做',
    delete: '删除',
    preview: '预览',
    compare: '对比',
    single: '单图',
    original: '原图',
    result: '处理结果',
    size: '大小',
    width: '宽度',
    height: '高度',
    quality: '质量',
    color: '颜色',
    thickness: '粗细',
    opacity: '透明度'
  },

  // Main Index Page
  index: {
    title: 'Xin Utilities',
    subtitle: 'Xin 的实用工具',
    toolCount: '{count} 个工具',

    // Categories
    imageTools: '图片工具',
    imageToolsDesc: '裁剪、标注、去背景、转换',
    textTools: '文字工具',
    textToolsDesc: '比较、转换、格式化',
    canvasTools: '画板工具',
    canvasToolsDesc: '白板、涂鸦、创意',
    shareTools: '分享工具',
    shareToolsDesc: '二维码、链接分享',

    // Tool counts
    imageToolsCount: '5 个工具',
    textToolsCount: '1 个工具',
    canvasToolsCount: '1 个工具',
    shareToolsCount: '2 个工具',

    // Badges
    badgeEdit: '编辑',
    badgeCollab: '协作',
    badgeEffect: '特效',
    badgeConvert: '转换',
    badgeAnnotate: '标注',
    badgeAI: 'AI',
    badgeCompare: '对比',
    badgeDoodle: '涂鸦',
    badgeGenerate: '生成',

    // Tool Cards
    cropperTitle: '图片修剪器',
    cropperDesc: '矩形、圆形、多边形剪裁。旋转自动扩展画布。支持翻转和调整分辨率。',
    pixelateTitle: '图片像素化',
    pixelateDesc: '7 种颜色算法，包括平均值、中位数、众数、主导色等。实时预览效果。',
    videoGifTitle: '视频转 GIF',
    videoGifDesc: '可视化时间轴选择片段。自定义帧数、宽度、质量。纯浏览器编码。',
    annotateTitle: '图片标注',
    annotateDesc: '画笔涂鸦，添加矩形、圆形、箭头。可调整形状大小和位置。Ctrl+Z 撤销。',
    bgRemoveTitle: '背景移除',
    bgRemoveDesc: '使用 AI 智能移除图片背景，支持人物、物品等各种场景。',
    textDiffTitle: '文本对比',
    textDiffDesc: '并排显示差异，类似 Git Diff。可选择使用哪一侧内容，下载合并结果。',
    whiteboardTitle: '在线白板',
    whiteboardDesc: '随时涂鸦的画板。画笔、橡皮擦、形状，支持拖入图片。自动保存到浏览器。',
    qrGeneratorTitle: '二维码生成器',
    qrGeneratorDesc: '快速生成二维码，支持链接、文本、WiFi 信息等。可调整大小，下载 PNG 图片。',
    kanbanTitle: '看板',
    kanbanDesc: '简单的任务看板，支持拖拽排序。通过分享码与他人协作。',

    startUsing: '开始使用'
  },

  // Image Cropper
  cropper: {
    title: '图片修剪器',
    upload: {
      dragHere: '拖拽图片到这里',
      orClick: '或者点击选择文件',
      supportedFormats: '支持 JPG, PNG, WebP, GIF'
    },
    actions: {
      reset: '重置',
      applyCrop: '应用剪裁',
      clear: '清除图片'
    },
    cropMode: {
      title: '剪裁模式',
      rectangle: '矩形',
      circle: '圆形',
      polygon: '多边形',
      hintRect: '拖拽画布上的方框来选择剪裁区域',
      hintCircle: '拖拽画布上的圆形来选择剪裁区域',
      hintPolygon: '点击画布添加顶点'
    },
    aspectRatio: {
      free: '自由',
      apply: '应用',
      width: '宽',
      height: '高'
    },
    polygon: {
      hint: '点击画布添加顶点,至少需要 3 个点',
      undo: '撤销点',
      clear: '清除'
    },
    rotate: {
      title: '旋转',
      ccw90: '逆时针90°',
      cw90: '顺时针90°'
    },
    flip: {
      title: '翻转',
      horizontal: '水平翻转',
      vertical: '垂直翻转'
    },
    resize: {
      title: '调整分辨率',
      width: '宽度',
      height: '高度',
      lockAspect: '锁定比例',
      apply: '应用'
    },
    export: {
      title: '导出',
      png: 'PNG (无损)',
      jpeg: 'JPEG (压缩)',
      webp: 'WebP (推荐)',
      quality: '质量',
      download: '下载图片'
    }
  },

  // Image Pixelate
  pixelate: {
    title: '图片像素化',
    upload: {
      drag: '拖拽图片到这里',
      click: '或者点击选择文件'
    },
    canvas: {
      original: '原图',
      result: '像素化'
    },
    blocks: {
      title: '块数量',
      horizontal: '水平块数',
      vertical: '垂直块数',
      auto: '自动',
      description: '根据图片比例自动计算，1 = 原图',
      count: '{cols} × {rows} 块'
    },
    algorithm: {
      title: '颜色算法',
      average: {
        name: '平均值',
        desc: '计算块内所有像素 RGB 的平均值，效果平衡'
      },
      median: {
        name: '中位数',
        desc: '取各通道中位数，对噪点更鲁棒'
      },
      center: {
        name: '中心像素',
        desc: '直接取块中心点颜色，速度最快'
      },
      mode: {
        name: '众数',
        desc: '取出现最多的颜色，适合纯色图片'
      },
      dominant: {
        name: '主色提取',
        desc: '找块内的主导颜色，效果最好'
      },
      luminance: {
        name: '亮度加权',
        desc: '根据人眼敏感度加权，更自然'
      },
      minmax: {
        name: '最亮/最暗',
        desc: '取最亮或最暗像素，艺术效果',
        brightest: '最亮像素',
        darkest: '最暗像素'
      }
    },
    export: {
      title: '导出',
      format: {
        png: 'PNG (无损)',
        jpeg: 'JPEG (压缩)',
        webp: 'WebP (推荐)'
      },
      download: '下载图片'
    }
  },

  // Background Remove
  bgRemove: {
    title: '背景移除',
    dragImage: '拖拽图片到这里',
    supportedFormats: '支持 JPG, PNG, WebP 格式',
    removeBackground: '移除背景',
    downloadOriginal: '下载原尺寸',
    downloadCropped: '下载修剪版',
    processingFailed: '处理失败'
  },

  // Video to GIF
  videoGif: {
    title: '视频转 GIF',
    dragDrop: '拖拽视频到这里',
    orClick: '或者点击选择文件',
    supportedFormats: '支持 MP4, WebM, AVI, MOV 等格式',
    previewSelection: '预览选区',
    timeRange: '时间范围',
    start: '开始',
    end: '结束',
    duration: '时长',
    seconds: '秒',
    gifSettings: 'GIF 设置',
    frames: '帧数',
    framesUnit: '帧',
    width: '宽度',
    quality: '质量',
    qualityBest: '最高',
    qualityHigh: '高',
    qualityMedium: '中等',
    qualityLow: '低',
    generateGif: '生成 GIF',
    generating: '正在生成...',
    encoding: '编码中...',
    result: '生成结果',
    downloadGif: '下载 GIF'
  },

  // Image Annotate
  annotate: {
    title: '图片标注',
    dragHere: '拖拽图片到这里',
    orClick: '或者点击选择文件',
    brush: '画笔',
    rectangle: '矩形',
    circle: '圆形',
    arrow: '箭头',
    strokeSize: '粗细',
    selectedShape: '选中形状:',
    deleteShape: '删除形状',
    resetEdit: '重置编辑',
    deleteImage: '删除图片',
    hint: '提示：按 Ctrl+Z 撤销 | 拖拽形状中心移动，拖拽边缘调整大小',
    red: '红色',
    orange: '橙色',
    yellow: '黄色',
    green: '绿色',
    blue: '蓝色',
    white: '白色',
    undo: '撤销 (Ctrl+Z)',
    reset: '重置编辑',
    clear: '删除图片'
  },

  // Text Diff
  textDiff: {
    title: '文本对比',
    pasteText: '粘贴文本',
    uploadFile: '上传文件',
    originalText: '原始文本',
    modifiedText: '修改后文本',
    originalFile: '原始文件',
    modifiedFile: '修改后文件',
    dragOrClick: '拖拽或点击选择',
    leftPlaceholder: '在此输入或粘贴左侧文本...',
    rightPlaceholder: '在此输入或粘贴右侧文本...',
    originalPlaceholder: '粘贴或输入原始文本...',
    modifiedPlaceholder: '粘贴或输入修改后的文本...',
    compareDiff: '对比差异',
    compare: '对比',
    clearAll: '清空',
    diffResult: '对比结果',
    clickToSelect: '点击行选择版本',
    defaultSelect: '默认选择:',
    leftSide: '左侧',
    rightSide: '右侧',
    additions: '新增',
    deletions: '删除',
    deleted: '删除',
    added: '新增',
    selected: '已选择',
    downloadMerged: '下载合并结果',
    diffBlock: '差异 #{num}',
    clickSelectLeft: '点击选择左侧',
    clickSelectRight: '点击选择右侧',
    selectedLeft: '✓ 已选择左侧',
    selectedRight: '✓ 已选择右侧',
    diffCount: '{count} 处差异',
    addedLines: '+{count} 行',
    deletedLines: '-{count} 行'
  },

  // Whiteboard
  whiteboard: {
    title: '在线白板',
    controls: {
      strokeSize: '粗细',
      fontSize: '字号',
      opacity: '透明度',
      bold: '粗体'
    },
    actions: {
      download: '下载',
      undo: '撤销 (Ctrl+Z)',
      redo: '重做 (Ctrl+Y)',
      clear: '清空画布'
    },
    tools: {
      select: '选择',
      brush: '画笔',
      eraser: '橡皮擦',
      rectangle: '矩形',
      rect: '矩形',
      circle: '圆形',
      arrow: '箭头',
      stickyNote: '便利贴',
      sticky: '便利贴',
      textBox: '文本框',
      text: '文本框'
    },
    colors: {
      black: '黑色',
      red: '红色',
      blue: '蓝色',
      green: '绿色',
      orange: '橙色'
    },
    page: {
      previous: '上一页',
      next: '下一页',
      add: '新建页面'
    },
    hint: '拖拽框选 | Shift+点击多选 | Ctrl+C/V 复制粘贴 | Ctrl+Z 撤销 | Delete 删除 | 双击编辑文字',
    placeholder: {
      sticky: '输入便利贴内容...',
      text: '输入文本...'
    },
    confirm: {
      clear: '确定要清空当前页面吗？'
    },
    status: {
      saving: '保存中...',
      saved: '已保存',
      storageFull: '存储空间已满'
    },
    // Collaboration
    collab: {
      selectBoard: '选择白板',
      createNew: '创建新白板',
      joinExisting: '加入已有白板',
      boardName: '白板名称',
      boardNamePlaceholder: '输入白板名称...',
      create: '创建',
      join: '加入',
      boardNotFound: '未找到该白板',
      boardExists: '该白板已存在，请加入或使用其他名称',
      connecting: '连接中...',
      connected: '已连接',
      disconnected: '连接断开',
      reconnecting: '重新连接中...',
      liveSync: '实时同步',
      usersOnline: '{count} 人在线',
      you: '你',
      localMode: '本地模式',
      switchToLocal: '切换到本地',
      yourName: '你的名称',
      namePlaceholder: '输入你的名称...',
      randomName: '随机名称',
      userJoined: '{name} 加入了白板',
      userLeft: '{name} 离开了白板'
    }
  },

  // QR Generator
  qrGenerator: {
    title: '二维码生成器',
    inputLabel: '输入链接或文本',
    inputPlaceholder: 'https://example.com 或任意文本',
    size: '大小',
    foregroundColor: '前景色（码点）',
    backgroundColor: '背景色',
    dotShape: '码点形状',
    cornerShape: '定位角形状',
    square: '方形',
    rounded: '圆角',
    dots: '圆点',
    extraRounded: '大圆角',
    classy: '经典',
    classyRounded: '经典圆角',
    circular: '圆形',
    centerLogo: '中心 Logo（可选）',
    uploadLogo: '点击上传 Logo 图片',
    logoHint: '建议使用方形图片',
    logoWillShow: 'Logo 将显示在二维码中心',
    removeLogo: '移除',
    generate: '生成二维码',
    enterContent: '请输入链接或文本',
    generateFirst: '请先生成二维码',
    placeholderHint: '输入内容后点击生成',
    logoSize: 'Logo 大小',
    safeZoneShape: '安全区域形状',
    rectZone: '矩形',
    circleZone: '圆形',
    logoMargin: '边距',
    logoMarginHint: '正值扩展留白，负值让码点露出',
    logoRotation: '旋转',
    logoPosition: '位置偏移',
    resetPosition: '重置位置',
    dragToMove: '拖动 Logo 调整位置',
    // Tracking
    enableTracking: '启用扫描统计',
    trackingDesc: '追踪二维码被扫描的次数和设备信息',
    viewStats: '查看统计',
    trackingEnabled: '已启用追踪，短链接:',
    trackingServiceError: '无法连接追踪服务，将使用原始链接生成',
    // Stats modal
    scanStats: '扫描统计',
    loading: '加载中...',
    loadFailed: '加载失败，请检查后台服务',
    totalScans: '总扫描次数',
    uniqueVisitors: '唯一访客',
    deviceDistribution: '设备分布',
    noData: '暂无数据',
    targetUrl: '目标链接',
    createdAt: '创建时间'
  }
});
