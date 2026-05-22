import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'qiankun 源码深度解析',
  description: 'qiankun 源码深度解析 - 微前端框架源码学习指南',
  base: '/qiankun-source-code-analysis/',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#ff6a00' }],
  ],

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/overview' },
      { text: '架构', link: '/architecture/overview' },
      { text: '核心', link: '/core/sandbox-overview' },
      { text: '进阶', link: '/advanced/single-spa' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南篇',
          items: [
            { text: '项目概览', link: '/guide/overview' },
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '源码结构', link: '/guide/structure' },
            { text: '调试指南', link: '/guide/debugging' },
          ],
        },
      ],
      '/architecture/': [
        {
          text: '架构篇',
          items: [
            { text: '整体架构', link: '/architecture/overview' },
            { text: 'Monorepo 结构', link: '/architecture/monorepo' },
            { text: '沙箱机制', link: '/architecture/sandbox' },
            { text: '通信系统', link: '/architecture/communication' },
          ],
        },
      ],
      '/core/': [
        {
          text: '核心篇',
          items: [
            { text: '沙箱总览', link: '/core/sandbox-overview' },
            { text: '应用加载', link: '/core/app-loading' },
            { text: '路由系统', link: '/core/routing-system' },
            { text: '资源加载器', link: '/core/resource-loader' },
            { text: 'JS 沙箱', link: '/core/js-sandbox' },
            { text: '样式隔离', link: '/core/style-isolation' },
            { text: 'DOM 沙箱', link: '/core/dom-sandbox' },
            { text: 'JS 执行器', link: '/core/js-executor' },
            { text: '模块系统', link: '/core/module-system' },
          ],
        },
      ],
      '/advanced/': [
        {
          text: '进阶篇',
          items: [
            { text: '📦 single-spa 核心', link: '/advanced/single-spa' },
            { text: '🔌 插件系统', link: '/advanced/plugins' },
            { text: '⚡ 性能优化', link: '/advanced/performance' },
            { text: '📝 最佳实践', link: '/advanced/best-practices' },
            { text: '🎯 实战案例', link: '/advanced/case-studies' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xuyuxiong/qiankun-source-code-analysis' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present',
    },

    outline: {
      label: '本页目录',
      level: [2, 3],
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                },
              },
            },
          },
        },
      },
    },
  },
  
  markdown: {
    theme: {
      light: 'vitesse-light',
      dark: 'vitesse-dark',
    },
  },
})