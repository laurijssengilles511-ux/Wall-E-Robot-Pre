import { Figure, PageHeading, SectionHeading } from '../components/PortfolioParts'
import type { PageProps } from '../content/types'

export default function Reflection({ openImage }: PageProps) {
  return <>
    <PageHeading number="04" title="困难与复盘">本次制作的主要困难集中在机械装配、电路稳定性，以及有限时间和经费下的反复试错。装配返工和电路故障影响了项目进度，也反映出我们在前期调研、经验积累和时间安排上的不足。</PageHeading>

    <section className="page-section reflection-topic">
      <SectionHeading number="01" title="机械装配" />
      <p>团队成员都是第一次接触 3D 打印和机械拼装，零件识别、连接方式和装配顺序都由小组自主探索。由于经验不足，装配时出现了选错零件、装错位置和方向判断失误的问题，造成了重复拆装。</p>
      <div className="reflection-example">
        <h3>具体例子：手指角度装错</h3>
        <p>初次拼装手部时，我们没有发现中间手指的角度有误。直到将手臂装到机器人上，才发现中间手指明显上翘，与另外两根手指的倾斜角度不一致，影响了外观和使用效果，最后只能拆卸手部并重新组装。</p>
      </div>
      <div className="reflection-insight">
        <h3>我们的反思</h3>
        <p>装配前应先核对零件和安装方向，明确装配顺序；局部机构试装并检查配合后，再装入整机，避免到最后才发现问题，增加返工和零件损耗。</p>
      </div>
    </section>

    <section className="page-section reflection-topic">
      <SectionHeading number="02" title="电路不稳定" />
      <p>团队缺少焊接和电路连接的经验，在导线处理、降压模块接入和多模块供电上花费了较多时间。接入电源后，部分导线发热并烧毁，暴露出杜邦线承载能力不足的问题，整机调试因此受阻。</p>
      <div className="reflection-photos">
        <Figure name="process/soldering.jpg" title="焊接过程" caption="" openImage={openImage} />
        <Figure name="process/burnt-wire.jpg" title="烧毁的导线" caption="" openImage={openImage} />
      </div>
      <div className="reflection-insight">
        <h3>我们的反思</h3>
        <p>我们对电源分配关系和线材承载能力的前期调研不够充分，应事先核对各模块的工作电压、电流需求，以及杜邦线可以承受的范围，再确定供电与接线方案，减少接线后才发现器件不匹配的问题。</p>
      </div>
    </section>

    <section className="page-section reflection-topic">
      <SectionHeading number="03" title="试错压力" />
      <p>课程周期较短，装配返工和电路故障不断占用原定的测试时间，每次调整又需要重新连线和调试。课程时间和经费有限，我们无法购买不同型号的元件逐一尝试，方案比较和器件更换都受到限制。</p>
      <p>在缺少经验的情况下，故障原因也难以及时定位。连续尝试没有结果时，团队会感到焦虑，担心无法按期完成。遇到这种情况，我们会暂时停下来，一起整理已经完成的工作和当前的问题，调整分工与节奏后再继续。</p>
      <div className="reflection-insight">
        <h3>我们的反思</h3>
        <p>项目安排不能只计算顺利完成各步骤的时间，还应为学习、采购和返工留出余量。经费有限时，更应先调研关键器件的参数和兼容性，再决定采购与试验方案。组内也需要及时交流问题、记录每次调整的结果，避免重复尝试；压力较大时适当暂停，有助于重新确定排查方向。</p>
      </div>
    </section>
    <p className="reflection-closing">这次制作未能完成稳定运行的整机。通过装配和电路调试，我们认识到，前期调研、器件匹配和试错时间需要一并纳入项目安排；小组也需要共同判断问题，及时调整分工和进度。</p>
  </>
}
