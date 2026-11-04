import { PageHeading, SectionHeading } from '../components/PortfolioParts'

export default function Completion() {
  return <>
    <PageHeading number="06" title="实体成果">原方案因机械装配困难、电路不稳定而进度受阻。我们继续调整模型和电路，缩小整机尺寸，完成了组装与测试。</PageHeading>

    <section className="page-section completion-changes">
      <SectionHeading number="01" title="调整方案" />
      <ol className="plain-steps">
        <li><span>建模</span><div><h3>建模调整</h3><p>原方案尺寸偏大，增加了装配和驱动的难度。我们缩小整机尺寸，重新分配内部空间，调整结构件、传动机构与电子元件的布局。</p></div></li>
        <li><span>电路</span><div><h3>电路简化</h3><p>针对接线复杂、电路不稳定的问题，我们简化电路方案，梳理供电与模块连接，便于接线、排查故障和整机调试。</p></div></li>
        <li><span>装配</span><div><h3>整机装配</h3><p>按调整后的模型和电路方案完成各部分组装，接入电路与控制系统，完成整机调试及运行测试。</p></div></li>
      </ol>
    </section>

    <section className="page-section">
      <SectionHeading number="02" title="验证结果" />
      <p className="reading-width">调整后的瓦力已完成组装与测试，能够正常运行，验证了从建模、制造到装配、控制的完整流程，也为后续改进提供了实物基础。</p>
    </section>
  </>
}
