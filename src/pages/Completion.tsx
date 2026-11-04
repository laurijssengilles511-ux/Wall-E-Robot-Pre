import { PageHeading, SectionHeading } from '../components/PortfolioParts'
import { ArrowRight, ArrowsLeftRight, Books, Camera, ChatCircleDots } from '@phosphor-icons/react'
import InteractionDemo from '../components/InteractionDemo'
import '../interaction.css'

export default function Completion() {
  return <>
    <PageHeading number="06" title="实体成果">缩小整机尺寸，简化电路，完善交互系统，让瓦力从设计走向实物。</PageHeading>

    <section className="page-section completion-changes">
      <SectionHeading number="01" title="调整方案" />
      <ol className="plain-steps">
        <li><span>建模</span><div><h3>建模调整</h3><p>缩小整机尺寸，重新安排结构、传动与电子元件的布局，降低装配和驱动难度。</p></div></li>
        <li><span>电路</span><div><h3>电路简化</h3><p>精简接线，梳理供电与模块连接，便于排查故障和整机调试。</p></div></li>
        <li><span>交互</span><div><h3>交互优化</h3><p>搭建知识库与会话系统，将资料问答、画面观察和任务状态融入交流，让瓦力的回应更贴合使用情境。</p></div></li>
        <li><span>装配</span><div><h3>整机装配</h3><p>按调整后的方案完成结构组装、电路接入与整机运行测试。</p></div></li>
      </ol>
    </section>

    <section className="page-section completion-interaction">
      <SectionHeading number="02" title="交互系统" />
      <p className="interaction-intro">给瓦力补充自己的知识，让交流结合资料、对话与眼前情境，并把任务进展转化为可感知的动作。</p>
      <div className="interaction-capabilities">
        <article><Books size={23} weight="regular" aria-hidden="true" /><div><h3>可定制的知识伙伴</h3><p>导入自己的课程资料，建立专属知识库。回答附带原文与来源，让交流有据可查。</p><span>个人资料 → 知识检索 → 回答溯源</span></div></article>
        <article><Camera size={23} weight="regular" aria-hidden="true" /><div><h3>结合情境的交流</h3><p>保留近期对话，延续交流语境；按需引入摄像头画面，让问题与眼前的情境联系起来。</p><span>对话上下文 + 当前画面</span></div></article>
        <article><ChatCircleDots size={23} weight="regular" aria-hidden="true" /><div><h3>看得见的任务状态</h3><p>将倾听、思考、执行与完成映射为动作预设，用姿态传达任务进展，也能随时暂停、继续或取消。</p><span>任务状态 → 动作表达</span></div></article>
        <article><ArrowsLeftRight size={23} weight="regular" aria-hidden="true" /><div><h3>电脑与实体协作</h3><p>电脑负责检索与任务处理，机器人负责感知与动作。以语义状态衔接两端，具体动作与限位由固件管理。</p><span>电脑处理 ↔ 机器人反馈</span></div></article>
      </div>
    </section>

    <section className="page-section">
      <SectionHeading number="03" title="交互体验台" />
      <InteractionDemo />
      <a className="inline-link" href="http://127.0.0.1:8000" target="_blank" rel="noreferrer">打开交互调试台<ArrowRight size={15} /></a>
    </section>

    <section className="page-section">
      <SectionHeading number="04" title="验证结果" />
      <p className="reading-width">调整后的瓦力已完成组装与运行测试，走通了建模、制造、装配与控制的完整流程。</p>
    </section>
  </>
}
