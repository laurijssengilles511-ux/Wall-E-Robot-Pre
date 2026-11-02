import catalog from './catalog.json'
import inventory from './model-inventory.json'
import type { ModelAsset, ModelInventoryItem, ProjectSection, SourceDocument } from './types'

export const sections: ProjectSection[] = [
  { id: 'story', path: '/', title: '故事与灵感', number: '01', subtitle: '从电影中的角色，到我们的选题' },
  { id: 'structure', path: '/structure', title: '结构与制造', number: '02', subtitle: '把形象拆解成可以制造的零件' },
  { id: 'electronics', path: '/electronics', title: '电路与搭建', number: '03', subtitle: '从控制指令，到具体的机械动作' },
  { id: 'reflection', path: '/reflection', title: '困难与复盘', number: '04', subtitle: '记录没有完成的部分，也记录收获' },
  { id: 'future', path: '/future', title: '未来构想', number: '05', subtitle: '在可靠的实体基础上，继续探索' },
  { id: 'virtual', path: '/virtual', title: '虚拟平台', number: '06', subtitle: '从不同角度观察整机数字装配' },
]
export const models: ModelAsset[] = catalog.models
export const modelInventory: ModelInventoryItem[] = inventory
export const documents: SourceDocument[] = catalog.documents
export const members = ['胡承越', '陆轩', '朱兴宇', '李汶远']
export const asset = (path: string) => encodeURI(`${import.meta.env.BASE_URL}${path}`)
export const imagePath = (name: string) => `portfolio/${name}`
export const documentNamed = (name: string) => documents.find(document => document.name === name)!
export const fileSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
export const documentDescriptions: Record<string, string> = {
  '瓦力机器人设计方案.docx': '选题动机、拟实现功能与结构方向',
  '项目目标与排期.docx': '基础、进阶目标和阶段安排，属于项目计划',
  '项目进展.docx': '打印、接线、组装等阶段待办记录',
  '瓦利机器人硬件选型.docx': 'Otto 主控复用与摄像头的前期选型',
  '瓦力机器人接线调整方案.pdf': '摄像头通信接线与三路电源分配设计',
  '瓦力BOM清单.xlsm': '参考 BOM，与当前接线方案存在器件差异',
}
export function sectionFromHash(hash: string) { return sections.find(section => section.path === (hash.replace(/^#/, '') || '/')) || sections[0] }
