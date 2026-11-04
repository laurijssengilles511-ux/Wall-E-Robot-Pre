// Based on the companion project's README, state_machine.py, runtime.py and
// examples/portfolio_knowledge.md. These are explanatory scenes, not API calls.
export type InteractionState = 'IDLE' | 'LISTENING' | 'PLANNING' | 'WAITING_USER' | 'EXECUTING' | 'PAUSED' | 'SUCCEEDED' | 'CANCELED'

export const interactionStates: Record<InteractionState, { label: string; behavior: string; detail: string }> = {
  IDLE: { label: '等待开始', behavior: '—', detail: '选择场景，开始体验。' },
  LISTENING: { label: '接收输入', behavior: 'listen', detail: '接收问题，进入本轮任务。' },
  PLANNING: { label: '理解与规划', behavior: 'think', detail: '根据问题选择检索或观察工具。' },
  WAITING_USER: { label: '等待确认', behavior: 'ask_user', detail: '是否允许本次画面观察？' },
  EXECUTING: { label: '执行任务', behavior: 'work', detail: '调用工具，整理结果。' },
  PAUSED: { label: '任务已暂停', behavior: 'paused', detail: '继续任务，或取消本次体验。' },
  SUCCEEDED: { label: '任务完成', behavior: 'success', detail: '返回回答与动作反馈。' },
  CANCELED: { label: '任务已取消', behavior: 'canceled', detail: '可重新开始或切换场景。' },
}

export type InteractionScene = {
  id: string
  title: string
  subtitle: string
  question: string
  input: string
  planning: string
  execution: string
  resultTitle: string
  result: string
  source?: { file: string; excerpt: string }
  steps: InteractionState[]
}

export const interactionScenes: InteractionScene[] = [
  {
    id: 'knowledge', title: '资料问答', subtitle: '让回答有据可查',
    question: '机器人有多少种模型、多少个打印零件？',
    input: '接收问题，查找个人知识库。',
    planning: '检索与零件种类、数量相关的资料。',
    execution: '整理检索片段，保留原文与来源。',
    resultTitle: '资料摘录',
    result: '机器人由 60 种模型、310 个 3D 打印零件组成。',
    source: { file: 'portfolio_knowledge.md', excerpt: '机器人由60种模型、310个3D打印零件组成。其中大型壳体与框架12种12件，中型结构件25种38件，小型与精细配合件23种260件。' },
    steps: ['LISTENING', 'PLANNING', 'EXECUTING', 'SUCCEEDED'],
  },
  {
    id: 'voice', title: '语音交流', subtitle: '从说话到听见回应',
    question: '瓦力，介绍一下你的麦克风。',
    input: '将语音转为文字，接收本轮问题。',
    planning: '结合近期对话，查找麦克风资料。',
    execution: '整理回答文本，交给语音播放流程。',
    resultTitle: '回答文本',
    result: '麦克风按 INMP441 实现 I2S 输入，扬声器为 2828 腔体喇叭，需通过功放输出。',
    source: { file: 'portfolio_knowledge.md', excerpt: '麦克风按INMP441实现I2S输入，扬声器为2828腔体喇叭，需通过功放输出。' },
    steps: ['LISTENING', 'PLANNING', 'EXECUTING', 'SUCCEEDED'],
  },
  {
    id: 'vision', title: '摄像头观察', subtitle: '带着问题看一帧画面',
    question: '瓦力，帮我看看面前的东西。',
    input: '接收观察请求，理解本轮问题。',
    planning: '选择摄像头工具，等待本次观察确认。',
    execution: '画面经单帧采集与图像理解，作为回答依据。',
    resultTitle: '反馈方式',
    result: '将画面信息与当前问题结合，以文字或语音回应。',
    steps: ['LISTENING', 'PLANNING', 'WAITING_USER', 'EXECUTING', 'SUCCEEDED'],
  },
]
